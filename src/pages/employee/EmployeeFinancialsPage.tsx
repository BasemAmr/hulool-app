import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { applyPageBackground } from '../../utils/backgroundUtils';
import { useInView } from 'react-intersection-observer';
import Button from '../../components/ui/Button';
import { Spinner, Alert } from 'react-bootstrap';
import { 
  useGetMyTransactions, 
  useGetMyCreditsInfinite,
  useGetMyClientsReceivablesSummaryInfinite,
  useGetMyClientsReceivablesTotals
} from '../../queries/employeeFinancialQueries';
import EmployeeTransactionsTable from '../../components/employee/EmployeeTransactionsTable';
import EmployeeCreditsTable from '../../components/employee/EmployeeCreditsTable';
import EmployeeClientReceivablesSummaryTable from '../../components/employee/EmployeeClientReceivablesSummaryTable';

type ViewMode = 'all' | 'transactions' | 'clients';

/**
 * EmployeeFinancialsPage - Employee financial tracking and commission management
 * 
 * Features:
 * - Commission dashboard with pending/earned amounts
 * - Pending commissions table (tasks approved but not paid)
 * - Transaction history (commissions, salaries, payouts)
 * - Financial summary with balance due
 * - Client receivables summary
 * - Employee credits management
 */
const EmployeeFinancialsPage = () => {
  const [activeMode, setActiveMode] = useState<ViewMode>('all');
  const [searchParams] = useSearchParams();
  
  // Get URL parameters for highlighting and mode
  const highlightTransactionId = searchParams.get('highlight');
  const urlMode = searchParams.get('mode');

  // Set initial mode from URL parameter
  useEffect(() => {
    if (urlMode === 'Employee') {
      setActiveMode('transactions');
    } else if (urlMode === 'Client') {
      setActiveMode('clients');
    } else if (urlMode === 'All') {
      setActiveMode('all');
    }
  }, [urlMode]);

  // Queries
  const { data: transactionsData, isLoading: isTransactionsLoading, error: transactionsError } = useGetMyTransactions();
  
  const {
    data: creditsData,
    isLoading: isCreditsLoading,
    fetchNextPage: fetchNextCreditsPage,
    hasNextPage: hasNextCreditsPage,
    isFetchingNextPage: isFetchingNextCreditsPage,
    error: creditsError
  } = useGetMyCreditsInfinite();

  const {
    data: receivablesData,
    isLoading: isReceivablesLoading,
    fetchNextPage: fetchNextReceivablesPage,
    hasNextPage: hasNextReceivablesPage,
    isFetchingNextPage: isFetchingNextReceivablesPage,
    error: receivablesError
  } = useGetMyClientsReceivablesSummaryInfinite();

  const { data: receivablesTotalsData, isLoading: isReceivablesTotalsLoading } = useGetMyClientsReceivablesTotals();

  // Flatten paginated data
  const allCredits = useMemo(() => 
    creditsData?.pages.flatMap(page => page.data.credits) || [], 
    [creditsData]
  );

  const allClients = useMemo(() => 
    receivablesData?.pages.flatMap(page => page.data.clients) || [], 
    [receivablesData]
  );

  const transactions = transactionsData?.data?.transactions || [];

  // Infinite scroll logic for credits
  const { ref: creditsRef } = useInView({
    threshold: 1,
    onChange: (inView) => {
      if (inView && hasNextCreditsPage && !isFetchingNextCreditsPage && activeMode === 'clients') {
        fetchNextCreditsPage();
      }
    },
  });

  // Infinite scroll logic for receivables
  const { ref: receivablesRef } = useInView({
    threshold: 1,
    onChange: (inView) => {
      if (inView && hasNextReceivablesPage && !isFetchingNextReceivablesPage && activeMode === 'clients') {
        fetchNextReceivablesPage();
      }
    },
  });

  useEffect(() => {
    applyPageBackground('employee-financials');
  }, []);

  // Mode options for the navigation
  const modeOptions = [
    { key: 'all', label: 'الكل', icon: null },
    { key: 'transactions', label: 'الموظف', icon: null },
    { key: 'clients', label: 'العميل', icon: null }
  ];

  // Handle loading states
  const isLoading = isTransactionsLoading || isReceivablesLoading || isCreditsLoading || isReceivablesTotalsLoading;
  const hasError = transactionsError || creditsError || receivablesError;

  if (isLoading && activeMode === 'all') {
    return (
      <div className="container-fluid p-4">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
          <Spinner animation="border" role="status" variant="primary">
            <span className="visually-hidden">جاري التحميل...</span>
          </Spinner>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="container-fluid p-4">
        <Alert variant="danger">
          <Alert.Heading>خطأ في تحميل البيانات</Alert.Heading>
          <p>{hasError?.message || 'حدث خطأ أثناء تحميل البيانات المالية'}</p>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container-fluid p-4">
      {/* Header with Navigation */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="h3 mb-1">الماليات والعمولات</h1>
              <p className="text-muted mb-0">تتبع العمولات والمدفوعات ومستحقات العملاء</p>
            </div>
            
            {/* Mode Navigation Buttons */}
            <div className="btn-group" role="group">
              {modeOptions.map((option) => (
                <Button
                  key={option.key}
                  variant={activeMode === option.key ? 'primary' : 'outline-primary'}
                  size="sm"
                  onClick={() => setActiveMode(option.key as ViewMode)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content based on mode */}
      {activeMode === 'all' && (
        <div className="row">
          {/* Client Receivables Summary */}
          <div className="col-12 mb-4">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-primary text-white">
                <h5 className="mb-0">ملخص مستحقات العملاء</h5>
              </div>
              <div className="card-body p-0">
                <EmployeeClientReceivablesSummaryTable
                  clients={allClients}
                  totals={receivablesTotalsData?.data}
                  isLoading={isReceivablesLoading}
                />
                {/* Infinite scroll trigger */}
                {hasNextReceivablesPage && (
                  <div ref={receivablesRef} className="text-center p-3">
                    {isFetchingNextReceivablesPage ? (
                      <Spinner animation="border" size="sm" />
                    ) : (
                      <Button
                        onClick={() => fetchNextReceivablesPage()}
                        variant="outline-primary"
                        size="sm"
                      >
                        تحميل المزيد
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Employee Transactions */}
          <div className="col-12 mb-4">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-success text-white">
                <h5 className="mb-0">معاملات الموظف</h5>
              </div>
              <div className="card-body p-0">
                <EmployeeTransactionsTable
                  transactions={transactions}
                  isLoading={isTransactionsLoading}
                  highlightTransactionId={highlightTransactionId || undefined}
                />
              </div>
            </div>
          </div>

          {/* Employee Credits */}
          <div className="col-12 mb-4">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-info text-white">
                <h5 className="mb-0">ائتمانات العملاء المسجلة</h5>
              </div>
              <div className="card-body p-0">
                <EmployeeCreditsTable
                  credits={allCredits}
                  isLoading={isCreditsLoading}
                />
                {/* Infinite scroll trigger */}
                {hasNextCreditsPage && (
                  <div ref={creditsRef} className="text-center p-3">
                    {isFetchingNextCreditsPage ? (
                      <Spinner animation="border" size="sm" />
                    ) : (
                      <Button
                        onClick={() => fetchNextCreditsPage()}
                        variant="outline-primary"
                        size="sm"
                      >
                        تحميل المزيد
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeMode === 'transactions' && (
        <div className="row">
          <div className="col-12">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-success text-white">
                <h5 className="mb-0">معاملات الموظف</h5>
              </div>
              <div className="card-body p-0">
                <EmployeeTransactionsTable
                  transactions={transactions}
                  isLoading={isTransactionsLoading}
                  highlightTransactionId={highlightTransactionId || undefined}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeMode === 'clients' && (
        <div className="row">
          {/* Client Receivables Summary */}
          <div className="col-12 mb-4">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-primary text-white">
                <h5 className="mb-0">ملخص مستحقات العملاء</h5>
              </div>
              <div className="card-body p-0">
                <EmployeeClientReceivablesSummaryTable
                  clients={allClients}
                  totals={receivablesTotalsData?.data}
                  isLoading={isReceivablesLoading}
                />
                {/* Infinite scroll trigger */}
                {hasNextReceivablesPage && (
                  <div ref={receivablesRef} className="text-center p-3">
                    {isFetchingNextReceivablesPage ? (
                      <Spinner animation="border" size="sm" />
                    ) : (
                      <Button
                        onClick={() => fetchNextReceivablesPage()}
                        variant="outline-primary"
                        size="sm"
                      >
                        تحميل المزيد
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Employee Credits */}
          <div className="col-12 mb-4">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-info text-white">
                <h5 className="mb-0">ائتمانات العملاء المسجلة</h5>
              </div>
              <div className="card-body p-0">
                <EmployeeCreditsTable
                  credits={allCredits}
                  isLoading={isCreditsLoading}
                />
                {/* Infinite scroll trigger */}
                {hasNextCreditsPage && (
                  <div ref={creditsRef} className="text-center p-3">
                    {isFetchingNextCreditsPage ? (
                      <Spinner animation="border" size="sm" />
                    ) : (
                      <Button
                        onClick={() => fetchNextCreditsPage()}
                        variant="outline-primary"
                        size="sm"
                      >
                        تحميل المزيد
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeFinancialsPage;
