/**
 * CompanyProfilePage
 * 
 * Displays company account transactions and financial overview.
 * Shows all double-entry transactions involving the company account.
 */

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building, TrendingUp, TrendingDown, Activity, DollarSign } from 'lucide-react';
import Button from '../../components/ui/Button';
import { useModalStore } from '../../stores/modalStore';
import { formatCurrency } from '../../utils/formatUtils';
import { Card, CardHeader, CardContent } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Spinner } from '../../components/ui/spinner';
import { applyPageBackground } from '../../utils/backgroundUtils';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import apiClient from '../../api/apiClient';

type ViewMode = 'all' | 'debits' | 'credits';

const CompanyProfilePage = () => {
  const { openModal } = useModalStore();
  const [activeMode, setActiveMode] = useState<ViewMode>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 50;

  // Company account is always ID 1
  const companyAccountId = 1;

  // Fetch company account history using the API endpoint
  const { data, isLoading, error } = useQuery({
    queryKey: ['accounts', 'company', companyAccountId, 'history', currentPage, perPage],
    queryFn: async () => {
      const response = await apiClient.get(
        `/accounts/company/${companyAccountId}/history`,
        {
          params: {
            page: currentPage,
            per_page: perPage,
          },
        }
      );
      console.log('=== API Response Debug ===');
      console.log('Full response:', response);
      console.log('Response data:', response.data);
      console.log('Balance:', response.data?.balance);
      console.log('Total debits:', response.data?.total_debits);
      console.log('Total credits:', response.data?.total_credits);
      console.log('Total:', response.data?.total);
      console.log('=========================');
      // WordPress REST API wraps response in { success: true, data: {...} }
      // Return the inner data object
      return response.data?.data || response.data;
    },
    enabled: !!companyAccountId,
    staleTime: 30 * 1000,
  });

  // Apply page background
  useEffect(() => {
    applyPageBackground('financial-center');
  }, []);

  // Calculate summary from transactions - use backend aggregated values
  const summary = {
    totalDebits: parseFloat(data?.total_debits || '0') || 0,
    totalCredits: parseFloat(data?.total_credits || '0') || 0,
    transactionCount: parseInt(data?.total || '0', 10) || 0
  };

  const currentBalance = parseFloat(data?.balance || '0') || 0;

  // Filter transactions based on mode
  const filteredTransactions = data?.transactions?.filter((txn: any) => {
    if (activeMode === 'debits') return (txn.debit || 0) > 0;
    if (activeMode === 'credits') return (txn.credit || 0) > 0;
    return true;
  }) || [];

  // Handle new transaction
  const handleNewTransaction = () => {
    openModal('manualTransaction', {
      preselectedAccount: {
        id: companyAccountId,
        type: 'company' as const,
        name: 'حساب الشركة',
        balance: currentBalance,
        email: '',
        last_activity: null,
        pending_count: 0,
        pending_amount: 0,
      },
    });
  };

  // Format date
  const formatDate = (date: string) => {
    try {
      return new Date(date).toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return date;
    }
  };

  // Format relative time
  const formatRelativeTime = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ar });
    } catch {
      return '';
    }
  };

  // Get transaction type label
  const getTransactionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      INVOICE_GENERATED: 'فاتورة',
      PAYMENT_RECEIVED: 'دفعة مستلمة',
      COMMISSION_EARNED: 'عمولة',
      SALARY_PAID: 'راتب',
      TRANSFER_IN: 'تحويل وارد',
      TRANSFER_OUT: 'تحويل صادر',
      MANUAL_ADJUSTMENT: 'تعديل يدوي',
      CREDIT_ALLOCATED: 'رصيد مخصص',
      EXPENSE: 'مصروف',
      INCOME: 'دخل',
      INITIAL_BALANCE: 'رصيد افتتاحي',
    };
    return labels[type] || type;
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          خطأ في تحميل بيانات الشركة
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Compact Header with Summary in ONE ROW */}
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center">
            <Building size={20} />
          </div>
          <h1 className="text-lg font-bold text-black">حساب الشركة</h1>
        </div>
        
        {/* Inline Summary Stats */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-gray-600">الرصيد الحالي:</span>
            <span className={`font-bold ${
              currentBalance < 0 ? 'text-red-600' :
              currentBalance > 0 ? 'text-green-600' : 'text-gray-600'
            }`}>
              {formatCurrency(currentBalance)} ر.س
            </span>
            {currentBalance < 0 && <span className="text-red-600">(التزامات)</span>}
          </div>
          <div className="w-px h-4 bg-gray-300" />
          <div className="flex items-center gap-1">
            <span className="text-gray-600">إجمالي المدين:</span>
            <span className="font-bold text-green-600">{formatCurrency(summary.totalDebits)} ر.س</span>
          </div>
          <div className="w-px h-4 bg-gray-300" />
          <div className="flex items-center gap-1">
            <span className="text-gray-600">إجمالي الدائن:</span>
            <span className="font-bold text-blue-600">{formatCurrency(summary.totalCredits)} ر.س</span>
          </div>
          <div className="w-px h-4 bg-gray-300" />
          <div className="flex items-center gap-1">
            <span className="text-gray-600">عدد المعاملات:</span>
            <span className="font-bold text-purple-600">{summary.transactionCount} معاملة</span>
          </div>
        </div>

        <Button variant="primary" size="sm" onClick={handleNewTransaction}>
          <DollarSign size={14} className="mr-1" />
          معاملة جديدة
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveMode('all')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeMode === 'all'
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          جميع المعاملات ({data?.transactions?.length || 0})
        </button>
        <button
          onClick={() => setActiveMode('debits')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeMode === 'debits'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          مدين ({data?.transactions?.filter((t: any) => (t.debit || 0) > 0).length || 0})
        </button>
        <button
          onClick={() => setActiveMode('credits')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeMode === 'credits'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          دائن ({data?.transactions?.filter((t: any) => (t.credit || 0) > 0).length || 0})
        </button>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">سجل المعاملات</h2>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Spinner size="lg" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">لا توجد معاملات</div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="border-collapse border border-gray-300">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-start border border-gray-300 text-base px-3 py-2">التاريخ</TableHead>
                    <TableHead className="text-start border border-gray-300 text-base px-3 py-2">النوع</TableHead>
                    <TableHead className="text-start border border-gray-300 text-base px-3 py-2">الوصف</TableHead>
                    <TableHead className="text-start border border-gray-300 text-base px-3 py-2">مدين</TableHead>
                    <TableHead className="text-start border border-gray-300 text-base px-3 py-2">دائن</TableHead>
                    <TableHead className="text-start border border-gray-300 text-base px-3 py-2">الرصيد</TableHead>
                    <TableHead className="text-start border border-gray-300 text-base px-3 py-2">القيد المقابل</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((txn: any) => (
                    <TableRow key={txn.id}>
                      <TableCell className="border border-gray-300 text-start text-base px-3 py-2">
                        <span className="font-medium">
                          {new Date(txn.transaction_date || txn.created_at).toLocaleDateString('en-CA')}
                        </span>
                      </TableCell>
                      <TableCell className="border border-gray-300 text-start text-base px-3 py-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {getTransactionTypeLabel(txn.transaction_type)}
                        </span>
                      </TableCell>
                      <TableCell className="border border-gray-300 text-start text-base px-3 py-2">
                        <div className="max-w-xs">
                          <p className="truncate">{txn.description}</p>
                        </div>
                      </TableCell>
                      <TableCell className="border border-gray-300 text-start text-base px-3 py-2">
                        {txn.debit && parseFloat(txn.debit) > 0 ? (
                          <span className="text-green-600 font-semibold">
                            +{new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(parseFloat(txn.debit))}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="border border-gray-300 text-start text-base px-3 py-2">
                        {txn.credit && parseFloat(txn.credit) > 0 ? (
                          <span className="text-blue-600 font-semibold">
                            -{new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(parseFloat(txn.credit))}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="border border-gray-300 text-start text-base px-3 py-2">
                        <span
                          className={`font-semibold ${
                            parseFloat(txn.balance_after || txn.balance || 0) < 0
                              ? 'text-red-600'
                              : parseFloat(txn.balance_after || txn.balance || 0) > 0
                              ? 'text-green-600'
                              : 'text-gray-600'
                          }`}
                        >
                          {new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(parseFloat(txn.balance_after || txn.balance || 0))}
                        </span>
                      </TableCell>
                      <TableCell className="border border-gray-300 text-start text-base px-3 py-2">
                        {txn.related_transaction_id ? (
                          <button
                            onClick={() =>
                              openModal('journalEntryDetails', {
                                transactionId: txn.id,
                                accountType: 'company',
                                accountId: companyAccountId,
                              })
                            }
                            className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors cursor-pointer"
                          >
                            القيد #{txn.related_transaction_id}
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {data && data.total_pages > 1 && (
            <div className="flex justify-between items-center mt-4 pt-4 border-t">
              <div className="text-sm text-gray-600">
                صفحة {currentPage} من {data.total_pages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline-primary"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  السابق
                </Button>
                <Button
                  variant="outline-primary"
                  size="sm"
                  disabled={currentPage === data.total_pages}
                  onClick={() => setCurrentPage((p) => Math.min(data.total_pages, p + 1))}
                >
                  التالي
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanyProfilePage;
