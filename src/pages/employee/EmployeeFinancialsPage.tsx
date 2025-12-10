import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { applyPageBackground } from '../../utils/backgroundUtils';
import { useInView } from 'react-intersection-observer';
import Button from '../../components/ui/Button';
import { Spinner } from '../../components/ui/spinner';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { 
  useGetMyTransactions, 
  useGetMyCreditsInfinite,
  useGetMyReceivablesDashboardInfinite
} from '../../queries/employeeFinancialQueries';
import EmployeeTransactionsTable from '../../components/employee/EmployeeTransactionsTable';
import EmployeeCreditsTable from '../../components/employee/EmployeeCreditsTable';
import EmployeeClientsStatementsTable from '../../components/employee/EmployeeClientsStatementsTable';

type ViewMode = 'all' | 'transactions' | 'clients';


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
  } = useGetMyReceivablesDashboardInfinite();

  // Flatten paginated data
  const allCredits = useMemo(() => 
    creditsData?.pages.flatMap(page => page.data.credits) || [], 
    [creditsData]
  );

  const allReceivables = useMemo(() => 
    receivablesData?.pages.flatMap(page => page.data.receivables) || [], 
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
  const isLoading = isTransactionsLoading || isReceivablesLoading || isCreditsLoading;
  const hasError = transactionsError || creditsError || receivablesError;

  if (isLoading && activeMode === 'all') {
    return (
      <div className="w-full p-4">
        <div className="flex justify-center items-center" style={{ minHeight: '50vh' }}>
          <Spinner>
            <span className="sr-only">جاري التحميل...</span>
          </Spinner>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="w-full p-4">
        <Alert variant="destructive">
          <AlertTitle>خطأ في تحميل البيانات</AlertTitle>
          <AlertDescription>{hasError?.message || 'حدث خطأ أثناء تحميل البيانات المالية'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="w-full p-4">
      {/* Header with Navigation */}
      <div className="mb-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold mb-1 text-black">الماليات والعمولات</h1>
            <p className="text-black mb-0 text-sm">تتبع العمولات والمدفوعات ومستحقات العملاء</p>
          </div>
          
          {/* Mode Navigation Buttons */}
          <div className="inline-flex rounded-md shadow-sm" role="group">
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

      {/* Content based on mode */}
      {activeMode === 'all' && (
        <div className="space-y-4">
          {/* Client Receivables Summary */}
          <div>
            <div className="rounded-lg border-0 bg-card shadow-sm">
              <div className="px-4 py-3 bg-primary text-white rounded-t-lg">
                <h5 className="mb-0 font-bold">بيانات مستحقات العملاء</h5>
              </div>
              <div className="p-0">
                <EmployeeClientsStatementsTable
                  receivables={allReceivables}
                  isLoading={isReceivablesLoading}
                />
                {/* Infinite scroll trigger */}
                {hasNextReceivablesPage && (
                  <div ref={receivablesRef} className="text-center p-3">
                    {isFetchingNextReceivablesPage ? (
                      <Spinner size="sm" />
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
          <div>
            <div className="rounded-lg border-0 bg-card shadow-sm">
              <div className="px-4 py-3 bg-green-600 text-white rounded-t-lg">
                <h5 className="mb-0 font-bold">معاملات الموظف</h5>
              </div>
              <div className="p-0">
                <EmployeeTransactionsTable
                  transactions={transactions}
                  isLoading={isTransactionsLoading}
                  highlightTransactionId={highlightTransactionId || undefined}
                />
              </div>
            </div>
          </div>

          {/* Employee Credits */}
          <div>
            <div className="rounded-lg border-0 bg-card shadow-sm">
              <div className="px-4 py-3 bg-blue-500 text-white rounded-t-lg">
                <h5 className="mb-0 font-bold">ائتمانات العملاء المسجلة</h5>
              </div>
              <div className="p-0">
                <EmployeeCreditsTable
                  credits={allCredits}
                  isLoading={isCreditsLoading}
                />
                {/* Infinite scroll trigger */}
                {hasNextCreditsPage && (
                  <div ref={creditsRef} className="text-center p-3">
                    {isFetchingNextCreditsPage ? (
                      <Spinner size="sm" />
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
        <div>
          <div className="rounded-lg border-0 bg-card shadow-sm">
            <div className="px-4 py-3 bg-green-600 text-white rounded-t-lg">
              <h5 className="mb-0 font-bold">معاملات الموظف</h5>
            </div>
            <div className="p-0">
              <EmployeeTransactionsTable
                transactions={transactions}
                isLoading={isTransactionsLoading}
                highlightTransactionId={highlightTransactionId || undefined}
              />
            </div>
          </div>
        </div>
      )}

      {activeMode === 'clients' && (
        <div className="space-y-4">
          {/* Client Receivables Summary */}
          <div>
            <div className="rounded-lg border-0 bg-card shadow-sm">
              <div className="px-4 py-3 bg-primary text-white rounded-t-lg">
                <h5 className="mb-0 font-bold">بيانات مستحقات العملاء</h5>
              </div>
              <div className="p-0">
                <EmployeeClientsStatementsTable
                  receivables={allReceivables}
                  isLoading={isReceivablesLoading}
                />
                {/* Infinite scroll trigger */}
                {hasNextReceivablesPage && (
                  <div ref={receivablesRef} className="text-center p-3">
                    {isFetchingNextReceivablesPage ? (
                      <Spinner size="sm" />
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
          <div>
            <div className="rounded-lg border-0 bg-card shadow-sm">
              <div className="px-4 py-3 bg-blue-500 text-white rounded-t-lg">
                <h5 className="mb-0 font-bold">ائتمانات العملاء المسجلة</h5>
              </div>
              <div className="p-0">
                <EmployeeCreditsTable
                  credits={allCredits}
                  isLoading={isCreditsLoading}
                />
                {/* Infinite scroll trigger */}
                {hasNextCreditsPage && (
                  <div ref={creditsRef} className="text-center p-3">
                    {isFetchingNextCreditsPage ? (
                      <Spinner size="sm" />
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
