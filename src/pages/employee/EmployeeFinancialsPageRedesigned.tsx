/**
 * EmployeeFinancialsPage (Redesigned)
 * 
 * Improved employee financial dashboard with:
 * - Clear balance summary at the top
 * - Separated pending earnings section
 * - Clean transaction history
 * - Mobile-responsive design
 */

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { applyPageBackground } from '../../utils/backgroundUtils';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Spinner } from '../../components/ui/spinner';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import SaudiRiyalIcon from '../../components/ui/SaudiRiyalIcon';
import { Badge } from '../../components/ui/badge';
import { 
  useGetMyTransactions,
} from '../../queries/employeeFinancialQueries';
import { useGetMyPendingItems } from '../../queries/financialCenterQueries';
import EmployeeTransactionsTable from '../../components/employees/EmployeeTransactionsTable';
import { useModalStore } from '../../stores/modalStore';
import { 
  Wallet, 
  TrendingUp, 
  Clock, 
  CreditCard, 
  FileText,
  CheckCircle,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

type TabType = 'summary' | 'pending' | 'history';

const EmployeeFinancialsPageRedesigned = () => {
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [searchParams] = useSearchParams();
  const { openModal } = useModalStore();
  
  // Get URL parameters for highlighting
  const highlightTransactionId = searchParams.get('highlight');

  // Queries
  const { data: transactionsData, isLoading: isTransactionsLoading, error: transactionsError } = useGetMyTransactions();
  const { data: pendingData, isLoading: isPendingLoading } = useGetMyPendingItems();
  
  const transactions = transactionsData?.data?.transactions || [];
  const pendingItems = pendingData?.items || [];

  // Map transactions to the format expected by EmployeeTransactionsTable
  const mappedTransactions = useMemo(() => {
    return transactions.map(t => ({
      id: String(t.id),
      transaction_type: t.transaction_type || (t.direction === 'CREDIT' ? 'EMPLOYEE_COMMISSION' : 'EMPLOYEE_PAYOUT'),
      description: t.transaction_name,
      debit: t.direction === 'CREDIT' ? t.amount : '0',
      credit: t.direction === 'DEBIT' ? t.amount : '0',
      balance: t.balance ?? null,
      transaction_date: t.transaction_date,
      related_object_type: t.related_task_id ? 'task' : null,
      related_object_id: t.related_task_id,
      task_name: t.task_name,
      client_name: t.client_name
    }));
  }, [transactions]);

  // Map pending items to the format expected by EmployeeTransactionsTable
  const mappedPending = useMemo(() => {
    return pendingItems.map(item => ({
      id: String(item.id),
      item_type: item.item_type,
      related_entity: item.related_entity ?? null,
      task_id: String(item.related_id),
      expected_amount: String(item.expected_amount),
      status: item.status,
      notes: item.notes,
      created_at: item.created_at,
      task_name: item.related_name ?? null,
      client_name: item.client_name ?? null,
      invoice_status: item.invoice_status ?? null,
      invoice_payment_progress: item.invoice_payment_progress ?? 0
    }));
  }, [pendingItems]);

  // Calculate totals from transactions
  const totals = useMemo(() => {
    let totalEarned = 0;
    let totalPaidOut = 0;
    
    transactions.forEach(t => {
      const amount = parseFloat(t.amount) || 0;
      if (t.direction === 'CREDIT') {
        totalEarned += amount;
      } else if (t.direction === 'DEBIT') {
        totalPaidOut += amount;
      }
    });
    
    return { totalEarned, totalPaidOut };
  }, [transactions]);

  // Calculate pending total
  const pendingTotal = useMemo(() => {
    return pendingItems.reduce((sum, item) => sum + Number(item.expected_amount), 0);
  }, [pendingItems]);

  // Get current balance from last transaction
  const currentBalance = useMemo(() => {
    if (transactions.length === 0) return 0;
    return Number(transactions[0]?.balance) || 0;
  }, [transactions]);

  // Apply page background
  useEffect(() => {
    applyPageBackground('employee-financials');
  }, []);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Format date
  const formatDate = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ar });
    } catch {
      return date;
    }
  };

  // Get pending status text
  const getPendingStatusText = (item: any) => {
    if (item.related_entity === 'task') {
      return 'في انتظار الدفع';
    }
    return 'في انتظار الموافقة';
  };

  // Tab options
  const tabOptions: { key: TabType; label: string; count?: number }[] = [
    { key: 'summary', label: 'الملخص' },
    { key: 'pending', label: 'المعلقة', count: pendingItems.length },
    { key: 'history', label: 'السجل' },
  ];

  // Loading state
  const isLoading = isTransactionsLoading || isPendingLoading;
  const hasError = transactionsError;

  if (isLoading && activeTab === 'summary') {
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
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>خطأ في تحميل البيانات</AlertTitle>
          <AlertDescription>حدث خطأ أثناء تحميل البيانات المالية</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="w-full p-4">
      {/* Compact Header - ALL IN ONE ROW */}
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4 text-xs">
        <div>
          <h1 className="text-lg font-bold text-black m-0">ماليتي</h1>
          <p className="text-xs text-black/70 m-0">تتبع أرباحك ومدفوعاتك</p>
        </div>

        {/* Inline Stats */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-gray-600">الرصيد المتاح:</span>
            <span className="font-bold text-primary">
              {new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(currentBalance)}
            </span>
            {pendingTotal > 0 && (
              <span className="text-gray-500">
                + {new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(pendingTotal)} معلق = {new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(currentBalance + pendingTotal)} إجمالي
              </span>
            )}
          </div>
          <div className="w-px h-4 bg-gray-300" />
          <div className="flex items-center gap-1">
            <span className="text-gray-600">إجمالي الأرباح:</span>
            <span className="font-bold text-green-600">
              {new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(totals.totalEarned)}
            </span>
          </div>
          <div className="w-px h-4 bg-gray-300" />
          <div className="flex items-center gap-1">
            <span className="text-gray-600">تم صرفه:</span>
            <span className="font-bold text-red-600">
              {new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(totals.totalPaidOut)}
            </span>
          </div>
          {pendingItems.length > 0 && (
            <>
              <div className="w-px h-4 bg-gray-300" />
              <div className="flex items-center gap-1">
                <span className="text-gray-600">معلق:</span>
                <span className="font-bold text-orange-600">{pendingItems.length}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4 border-b border-border">
        {tabOptions.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-black/70 hover:text-black'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <Badge className="mr-2 bg-orange-100 text-orange-600">
                {tab.count}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'summary' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pending Earnings Preview */}
          {pendingItems.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock size={16} className="text-orange-500" />
                  الأرباح المعلقة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pendingItems.slice(0, 3).map((item) => (
                    <div key={item.id} className="py-2 border-b border-border last:border-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <FileText size={14} className="text-black/50" />
                          <span className="text-sm">{item.related_name || `${item.item_type === 'commission' ? 'عمولة' : 'مبلغ'} #${item.related_id}`}</span>
                        </div>
                        <span className="font-medium text-orange-600">
                          {new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(item.expected_amount))}
                        </span>
                      </div>
                      {/* Show notes if available */}
                      {item.notes && (
                        <p className="text-xs text-gray-600 bg-gray-50 p-1.5 rounded border border-gray-200 ml-6">
                          {item.notes}
                        </p>
                      )}
                    </div>
                  ))}
                  {pendingItems.length > 3 && (
                    <button
                      onClick={() => setActiveTab('pending')}
                      className="w-full text-center text-sm text-primary hover:underline py-2"
                    >
                      عرض الكل ({pendingItems.length})
                      <ChevronRight size={14} className="inline mr-1" />
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Transactions Preview */}
          <Card className={pendingItems.length === 0 ? 'md:col-span-2' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Wallet size={16} className="text-green-500" />
                آخر المعاملات
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-center text-black/50 py-4">لا توجد معاملات</p>
              ) : (
                <div className="space-y-2">
                  {transactions.slice(0, 5).map((txn) => (
                    <div key={txn.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div>
                        <span className="text-sm font-medium text-black">{txn.transaction_name}</span>
                        <span className="block text-xs text-black/50">
                          {new Date(txn.transaction_date || txn.created_at || '').toLocaleDateString('en-CA')}
                        </span>
                      </div>
                      <span className={`font-medium ${txn.direction === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
                        {txn.direction === 'CREDIT' ? '+' : '-'}
                        {new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(parseFloat(txn.amount))}
                      </span>
                    </div>
                  ))}
                  {transactions.length > 5 && (
                    <button
                      onClick={() => setActiveTab('history')}
                      className="w-full text-center text-sm text-primary hover:underline py-2"
                    >
                      عرض السجل الكامل
                      <ChevronRight size={14} className="inline mr-1" />
                    </button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'pending' && (
        <div>
          {pendingItems.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle size={48} className="text-green-500/50 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-black mb-1">لا توجد عناصر معلقة</h3>
                <p className="text-black/50">جميع عمولاتك تمت معالجتها</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingItems.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="p-2 bg-orange-100 rounded-lg">
                          <Clock size={20} className="text-orange-500" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-black">
                            {item.item_type === 'commission' ? 'عمولة' : 'مبلغ'}
                          </h4>
                          <p className="text-sm text-black/70">
                            {item.related_name || `المهمة #${item.related_id}`}
                          </p>
                          {/* Show notes field */}
                          {item.notes && (
                            <p className="text-xs text-gray-600 mt-1 bg-gray-50 p-2 rounded border border-gray-200">
                              {item.notes}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className="bg-orange-100 text-orange-600 text-xs">
                              {getPendingStatusText(item)}
                            </Badge>
                            <span className="text-xs text-black/50">
                              {new Date(item.created_at).toLocaleDateString('en-CA')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-left">
                        <span className="text-xl font-bold text-orange-600">
                          {new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(item.expected_amount))}
                        </span>
                        <p className="text-xs text-black/50">متوقع</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <Card>
          <CardContent className="p-4">
            <EmployeeTransactionsTable 
              transactions={mappedTransactions}
              pendingCommissions={mappedPending}
              isLoading={isTransactionsLoading || isPendingLoading}
              onEdit={(transaction) => openModal('transactionEdit', { transaction })}
              onDelete={(transaction) => openModal('transactionDelete', { transaction })}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EmployeeFinancialsPageRedesigned;
