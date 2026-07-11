import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetTreasuryAccount } from '../api/treasuryQueries';
import { useGetAccountHistory, useDeleteTransaction } from '../api/accountQueries';
import { useCategoryLabels } from '@/features/financials/constants/categoryConfig';
import HuloolDataGrid from '@/shared/grid/HuloolDataGrid';
import type { HuloolGridColumn } from '@/shared/grid/HuloolDataGrid';
import type { CellProps } from 'react-datasheet-grid';
import Button from '@/shared/ui/primitives/Button';
import { Landmark } from 'lucide-react';
import type { FinancialTransaction, CashBoxVoucher } from '@/api/types';
import { useModalStore } from '@/shared/stores/modalStore';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useToast } from '@/shared/hooks/useToast';
import { exportService } from '@/services/export/ExportService';
import { ExportChoiceModal } from '../modals/ExportChoiceModal';
import apiClient from '@/api/client';
import AccountDetailHeader from '../components/AccountDetailHeader';
import TransactionFilters from '../components/TransactionFilters';
import type { FilterState } from '../components/TransactionFilters';
import TransactionActionButtons from '../components/TransactionActionButtons';

interface TransformedVoucherTransaction extends FinancialTransaction {
  debit: number;
  credit: number;
  balance: number;
  date: string;
  type: 'CASHBOX_RECEIPT' | 'CASHBOX_PAYMENT';
  category: string;
  debit_account_name?: string;
  credit_account_name?: string;
  creator_name?: string;
  creator_role_label?: string;
}

function toCashBoxVoucher(txn: TransformedVoucherTransaction): CashBoxVoucher {
  return {
    id: txn.id,
    account_id: txn.account_id,
    account_type: 'cashbox',
    transaction_type: txn.type,
    type: txn.type,
    date: txn.date,
    category: txn.category,
    description: txn.description,
    debit: txn.debit,
    credit: txn.credit,
    balance: txn.balance,
    related_transaction_id: (txn as any).related_transaction_id ?? 0,
    related_object_type: txn.related_object_type ?? '',
    related_object_id: txn.related_object_id ?? 0,
    created_by: txn.created_by ?? 0,
    creator_name: txn.creator_name,
    creator_role_label: txn.creator_role_label,
    debit_account_name: txn.debit_account_name,
    credit_account_name: txn.credit_account_name,
  };
}

const ActionsCell = React.memo(({ rowData }: CellProps<TransformedVoucherTransaction, any>) => {
  const openModal = useModalStore((state) => state.openModal);
  const toast = useToast();
  const deleteMutation = useDeleteTransaction();
  const { isAdmin } = useAuthStore();

  const handleView = () => openModal('voucherDetails', { voucher: toCashBoxVoucher(rowData) });
  const handleEdit = () => openModal('voucherEdit', { boxId: rowData.account_id, voucher: toCashBoxVoucher(rowData), isTreasury: true });
  const handleDelete = () => {
    openModal('confirmDelete', {
      title: 'حذف الحركة المزدوجة',
      message: 'هل أنت متأكد من حذف هذه الحركة؟ سيتم حذف القيد المزدوج بالكامل ولا يمكن التراجع عن هذا الإجراء.',
      onConfirm: () => {
        deleteMutation.mutate(
          { id: rowData.id, reason: 'تم الحذف عبر كشف الحساب المالي' },
          {
            onSuccess: () => toast.success('تم حذف الحركة بنجاح'),
            onError: (err: any) => toast.error('خطأ في الحذف', err.response?.data?.message || '')
          }
        );
      }
    });
  };

  return (
    <div className="flex gap-1.5">
      <Button variant="outline-primary" size="sm" onClick={handleView}>عرض</Button>
      {isAdmin() && (
        <>
          <Button variant="outline-primary" size="sm" onClick={handleEdit}>تعديل</Button>
          <Button variant="outline-danger" size="sm" onClick={handleDelete} isLoading={deleteMutation.isPending}>حذف</Button>
        </>
      )}
    </div>
  );
});
ActionsCell.displayName = 'ActionsCell';

export const TreasuryAccountDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const accountId = Number(id);
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [allTransactions, setAllTransactions] = useState<TransformedVoucherTransaction[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportChoice, setShowExportChoice] = useState(false);
  const toast = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState<FilterState>({
    start_date: '',
    end_date: '',
    type: '',
    search: '',
  });

  const categoryLabels = useCategoryLabels();

  const { data: account, isLoading: isLoadingAccount, error: accountError } = useGetTreasuryAccount(accountId);
  const { data: historyData, isLoading: isLoadingHistory, error: historyError } = useGetAccountHistory('treasury', accountId, page, {
    start_date: filters.start_date,
    end_date: filters.end_date,
    transaction_type: filters.type,
    search: filters.search,
  });

  useEffect(() => {
    if (historyData?.transactions) {
      const rawTxns = historyData.transactions;
      const transformed = rawTxns.map((txn) => {
        const rawDebit = (txn as any).debit !== undefined ? (txn as any).debit : (txn.direction === 'debit' ? txn.amount : 0);
        const rawCredit = (txn as any).credit !== undefined ? (txn as any).credit : (txn.direction === 'credit' ? txn.amount : 0);
        const rawBalance = (txn as any).balance !== undefined ? (txn as any).balance : txn.balance_after;
        const debit = Number(rawDebit || 0);
        const credit = Number(rawCredit || 0);
        const balance = Number(rawBalance || 0);
        const rawDateStr = txn.transaction_date || txn.created_at || '';
        const date = rawDateStr.includes(' ') ? rawDateStr.replace(' ', 'T') : rawDateStr;
        const type: 'CASHBOX_RECEIPT' | 'CASHBOX_PAYMENT' = debit > 0 ? 'CASHBOX_RECEIPT' : 'CASHBOX_PAYMENT';
        const category = String(txn.transaction_type);
        const debit_account_name = (txn as any).debit_account_name || (debit > 0 ? account?.name : '—');
        const credit_account_name = (txn as any).credit_account_name || (credit > 0 ? account?.name : '—');
        const creator_name = (txn as any).creator_name || '';
        const creator_role_label = (txn as any).creator_role_label || '';
        return { ...txn, debit, credit, balance, date, type, category, debit_account_name, credit_account_name, creator_name, creator_role_label };
      });

      setAllTransactions(prev => {
        if (page === 1) return transformed;
        const existingIds = new Set(prev.map(t => t.id));
        const newTxns = transformed.filter(t => !existingIds.has(t.id));
        return [...prev, ...newTxns];
      });
    }
  }, [historyData, page, account?.name]);

  const resetAndFilter = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
    setPage(1);
    setAllTransactions([]);
  }, []);

  const totalPages = historyData?.pagination?.total_pages || 1;
  const hasMore = page < totalPages;
  const totalRecords = historyData?.pagination?.total || allTransactions.length;

  const loadMore = useCallback(() => {
    if (hasMore && !isLoadingHistory) setPage(p => p + 1);
  }, [hasMore, isLoadingHistory]);

  useEffect(() => {
    const sentinel = scrollRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && hasMore && !isLoadingHistory) loadMore(); },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingHistory, loadMore]);

  const transactions = allTransactions;
  const isInitialLoad = isLoadingAccount || (isLoadingHistory && allTransactions.length === 0);

  if (isInitialLoad) {
    return <div className="p-6 text-center text-text-secondary">جاري التحميل...</div>;
  }

  if (accountError || !account) {
    return <div className="p-6 text-center text-status-danger-text">الحساب المالي غير موجود أو لا تملك صلاحية الوصول إليه.</div>;
  }

  if (historyError) {
    return <div className="p-6 text-center text-status-danger-text">حدث خطأ أثناء تحميل كشف الحساب.</div>;
  }

  const handleExportFiltered = async () => {
    try {
      setIsExporting(true);
      const exportItems = transactions.map((txn) => ({
        transaction_date: txn.date,
        transaction_type: txn.transaction_type,
        description: txn.description,
        debit: Number(txn.debit),
        credit: Number(txn.credit),
        balance: Number(txn.balance),
      }));
      await exportService.exportTreasuryAccount({ title: `كشف حركة الحساب - ${account.name}`, items: exportItems });
      toast.success('تم التصدير بنجاح');
    } catch (err: any) {
      toast.error('فشل التصدير', err.message || '');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportFull = async () => {
    try {
      setIsExporting(true);
      const { data } = await apiClient.get<any>(`/accounts/treasury/${accountId}/history`, { params: { page: 1, per_page: 100000 } });
      let allTxns: any[] = [];
      if (data?.data?.transactions) allTxns = data.data.transactions;
      else if (data?.data?.data) allTxns = data.data.data;
      else if (data?.transactions) allTxns = data.transactions;
      else if (Array.isArray(data?.data)) allTxns = data.data;

      const exportItems = allTxns.map((txn: any) => ({
        transaction_date: txn.transaction_date || txn.created_at || '',
        transaction_type: txn.transaction_type,
        description: txn.description,
        debit: Number(txn.debit || (txn.direction === 'debit' ? txn.amount : 0)),
        credit: Number(txn.credit || (txn.direction === 'credit' ? txn.amount : 0)),
        balance: Number(txn.balance || txn.balance_after || 0),
      }));
      await exportService.exportTreasuryAccount({ title: `كشف حركة الحساب كامل - ${account.name}`, items: exportItems });
      toast.success('تم تصدير كامل التاريخ بنجاح');
    } catch (err: any) {
      toast.error('فشل التصدير', err.message || '');
    } finally {
      setIsExporting(false);
    }
  };

  const columns: HuloolGridColumn<TransformedVoucherTransaction>[] = [
    { id: 'transaction_date', title: 'التاريخ', key: 'date', type: 'date', grow: 1 },
    { id: 'transaction_type', title: 'نوع الحركة', key: 'transaction_type', type: 'text', grow: 1 },
    { id: 'description', title: 'البيان', key: 'description', type: 'text', grow: 2.5 },
    {
      id: 'debit', title: 'مدين (+)', key: 'debit', type: 'currency', grow: 1,
      cellClassName: ({ rowData }: any) => Number(rowData.debit) > 0 ? 'cashbox-debit-cell' : '',
    },
    {
      id: 'credit', title: 'دائن (-)', key: 'credit', type: 'currency', grow: 1,
      cellClassName: ({ rowData }: any) => Number(rowData.credit) > 0 ? 'cashbox-credit-cell' : '',
    },
    { id: 'balance', title: 'الرصيد الجاري', key: 'balance', type: 'currency', grow: 1 },
    {
      id: 'actions', title: 'إجراءات', key: 'id', type: 'custom',
      component: ActionsCell as React.ComponentType<CellProps<TransformedVoucherTransaction, any>>,
      width: 220, grow: 0,
    },
  ];

  const subtitle = account ? (
    `تصنيف الحساب: ${categoryLabels[account.sub_type] || account.sub_type} | طبيعة الحساب: ${account.normal_balance === 'debit' ? 'مدين' : 'دائن'}`
  ) : undefined;

  // Settlement account = internal sub_type + is_settlement flag OR known settlement account IDs
  const isSettlementAccount = account
    ? account?.sub_type === 'internal' && account?.coa_section === 'assets' && (account.metadata as any)?.is_settlement === true
    : false;

  return (
    <>
      <div className="p-6 space-y-4 text-right" dir="rtl">
        <AccountDetailHeader
          name={account?.name || ''}
          balance={account?.balance || 0}
          icon={<Landmark size={24} />}
          subtitle={subtitle}
          onBack={() => navigate('/financial-center/treasury-accounts')}
        />

        <TransactionActionButtons
          accountId={accountId}
          cardType="treasury"
          isSettlement={isSettlementAccount}
          onExport={() => setShowExportChoice(true)}
          isExporting={isExporting}
        />

        <div className="border-b border-border-default pb-1">
          <TransactionFilters
            filters={filters}
            onChange={f => resetAndFilter(f)}
            onReset={() => resetAndFilter({ start_date: '', end_date: '', type: '', search: '' })}
            typeOptions={[
              { value: '', label: 'كل الحركات' },
              { value: 'CASHBOX_RECEIPT', label: 'قبض' },
              { value: 'CASHBOX_PAYMENT', label: 'صرف' },
            ]}
          />
        </div>

        <div className="bg-bg-surface rounded-lg border border-border-default overflow-hidden">
          <HuloolDataGrid
            data={transactions}
            columns={columns}
            isLoading={isLoadingHistory && page === 1}
          />

          {hasMore && (
            <div ref={scrollRef} className="flex justify-center items-center py-3 border-t border-border-default">
              {isLoadingHistory && page > 1 ? (
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  جاري تحميل المزيد...
                </div>
              ) : (
                <div className="text-sm text-text-secondary">مرر للأسفل لتحميل المزيد</div>
              )}
            </div>
          )}

          {transactions.length > 0 && (
            <div className="flex justify-center items-center py-2 border-t border-border-default bg-bg-surface-muted/30">
              <div className="text-xs text-text-secondary">
                عرض {transactions.length} من {totalRecords} حركة
              </div>
            </div>
          )}
        </div>
      </div>

      <ExportChoiceModal
        isOpen={showExportChoice}
        onClose={() => setShowExportChoice(false)}
        onExportFiltered={handleExportFiltered}
        onExportFull={handleExportFull}
        title="تصدير كشف الحساب"
      />
    </>
  );
};
