import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetTreasuryAccount } from '../api/treasuryQueries';
import { useGetAccountHistory, useDeleteTransaction } from '../api/accountQueries';
import { useCategoryLabels } from '@/features/financials/constants/categoryConfig';
import HuloolDataGrid from '@/shared/grid/HuloolDataGrid';
import type { HuloolGridColumn } from '@/shared/grid/HuloolDataGrid';
import type { CellProps } from 'react-datasheet-grid';
import Button from '@/shared/ui/primitives/Button';
import { Landmark, FileSpreadsheet, ArrowRight, Search, X, RotateCcw } from 'lucide-react';
import type { FinancialTransaction, CashBoxVoucher } from '@/api/types';
import { useModalStore } from '@/shared/stores/modalStore';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useToast } from '@/shared/hooks/useToast';
import { exportService } from '@/services/export/ExportService';
import { ExportChoiceModal } from '../modals/ExportChoiceModal';
import apiClient from '@/api/client';
import type { FilterState } from '../components/TransactionFilters';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { arSA } from 'date-fns/locale';
import {
  ShadcnSelect as Select,
  ShadcnSelectContent as SelectContent,
  ShadcnSelectItem as SelectItem,
  ShadcnSelectTrigger as SelectTrigger,
  ShadcnSelectValue as SelectValue,
} from '@/shared/ui/shadcn/select';

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

const ALL_TYPES_VALUE = '__all__';

function parseDate(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(date: Date | null): string {
  if (!date) return '';
  return date.toLocaleDateString('en-CA');
}

const filterDateStyles = `
  .header-inline-filters .react-datepicker__input-container input {
    height: 2.25rem;
    padding-inline: 0.6rem;
    font-size: 0.85rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    background-color: var(--color-background);
    color: var(--color-foreground);
    outline: none;
    width: 105px;
    box-sizing: border-box;
    font-family: inherit;
    direction: rtl;
    text-align: right;
  }
  .header-inline-filters .react-datepicker-wrapper {
    width: auto;
  }
  .header-inline-filters .react-datepicker-popper {
    z-index: 60 !important;
  }
`;

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

  const [localSearch, setLocalSearch] = useState('');

  useEffect(() => {
    setLocalSearch(filters.search);
  }, [filters.search]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (localSearch !== filters.search) {
        setFilters(prev => ({ ...prev, search: localSearch }));
        setPage(1);
      }
    }, 350);
    return () => clearTimeout(handler);
  }, [localSearch, filters.search]);

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
  const isInitialLoad = isLoadingAccount;

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
    {
      id: 'transaction_type',
      title: 'نوع الحركة',
      key: 'transaction_type',
      cellClassName: ({ rowData }: any) => {
        if (Number(rowData.debit || 0) > 0) return 'cashbox-debit-cell text-center font-bold';
        return 'cashbox-credit-cell text-center font-bold';
      },
      formatter: (_val: string, rowData: any) => {
        return Number(rowData.debit || 0) > 0 ? 'قبض' : 'صرف';
      },
      grow: 0.8,
    },
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

  const formatCurrencyAr = (amount: number) =>
    new Intl.NumberFormat('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

  const hasActiveFilters = Boolean(filters.start_date || filters.end_date || filters.type || filters.search);

  return (
    <>
      <style>{filterDateStyles}</style>
      <div className="p-6 space-y-4 text-right" dir="rtl">
        {/* Unified Compact Header and Filter Card */}
        <div className="bg-bg-surface border border-border-default rounded-xl p-4 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Right: Back button + Title */}
            <div className="flex items-center gap-3 shrink-0 min-w-0">
              <button
                onClick={() => navigate('/financial-center/treasury-accounts')}
                className="shrink-0 p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-surface-muted transition-colors"
              >
                <ArrowRight size={20} />
              </button>
              <div className="shrink-0 text-primary">
                <Landmark size={24} />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-text-primary truncate">{account?.name || ''}</h2>
                {subtitle && <p className="text-xs text-text-secondary mt-0.5">{subtitle}</p>}
              </div>
            </div>

            {/* Center: Inline Filter Fields */}
            <div className="header-inline-filters flex flex-wrap items-center gap-2 lg:flex-1 lg:justify-center min-w-0">
              {/* Search */}
              <div className="relative w-44">
                <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  dir="rtl"
                  className="base-input h-9 w-full rounded-lg border-border-default bg-background/50 px-2 pl-8 text-right text-xs shadow-sm transition-all placeholder:text-text-muted/70 focus:bg-background focus:ring-1 focus:ring-primary/30"
                  placeholder="بحث..."
                  value={localSearch}
                  onChange={e => setLocalSearch(e.target.value)}
                />
                {localSearch && (
                  <button
                    type="button"
                    className="absolute left-1.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-text-muted hover:bg-muted hover:text-text-primary"
                    onClick={() => setLocalSearch('')}
                  >
                    <X size={11} />
                  </button>
                )}
              </div>

              {/* Start Date */}
              <DatePicker
                selected={parseDate(filters.start_date)}
                onChange={(date: Date | null) => setFilters(prev => ({ ...prev, start_date: formatDate(date) }))}
                dateFormat="yyyy-MM-dd"
                placeholderText="من تاريخ"
                locale={arSA}
                portalId="inline-filters-datepicker-portal"
                showYearDropdown
                scrollableYearDropdown
                dropdownMode="select"
                calendarStartDay={6}
              />

              {/* End Date */}
              <DatePicker
                selected={parseDate(filters.end_date)}
                onChange={(date: Date | null) => setFilters(prev => ({ ...prev, end_date: formatDate(date) }))}
                dateFormat="yyyy-MM-dd"
                placeholderText="إلى تاريخ"
                locale={arSA}
                portalId="inline-filters-datepicker-portal"
                showYearDropdown
                scrollableYearDropdown
                dropdownMode="select"
                calendarStartDay={6}
              />

              {/* Type Select */}
              <div className="w-28 shrink-0">
                <Select
                  value={filters.type || ALL_TYPES_VALUE}
                  onValueChange={value => {
                    setFilters(prev => ({ ...prev, type: value === ALL_TYPES_VALUE ? '' : value }));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-full rounded-lg border-border-default bg-background/50 text-xs font-medium shadow-sm transition-all hover:bg-background focus:ring-1 focus:ring-primary/20">
                    <SelectValue placeholder="النوع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_TYPES_VALUE}>كل الحركات</SelectItem>
                    <SelectItem value="CASHBOX_RECEIPT">قبض</SelectItem>
                    <SelectItem value="CASHBOX_PAYMENT">صرف</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Reset */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setFilters({ start_date: '', end_date: '', type: '', search: '' });
                    setPage(1);
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-dashed border-border-default bg-background hover:bg-primary/5 hover:text-text-primary transition-all active:scale-95 text-text-secondary"
                  title="إعادة ضبط الفلاتر"
                >
                  <RotateCcw size={14} />
                </button>
              )}
            </div>

            {/* Left: Balance Info + Export Button */}
            <div className="flex items-center gap-3 shrink-0 lg:border-s lg:border-border-default lg:ps-4">
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => setShowExportChoice(true)}
                disabled={isExporting || transactions.length === 0}
                className="h-9"
              >
                <FileSpreadsheet size={15} className="me-1.5" />
                تصدير Excel
              </Button>
              <div className="text-left">
                <p className="text-[10px] text-text-secondary leading-none">الرصيد الحالي</p>
                <p className="text-lg font-black text-text-brand mt-0.5 whitespace-nowrap">
                  {formatCurrencyAr(account?.balance || 0)} <span className="text-xs font-bold text-text-secondary">ريال</span>
                </p>
              </div>
            </div>

          </div>
        </div>

        <div className="bg-bg-surface rounded-lg border border-border-default overflow-hidden">
          <HuloolDataGrid
            data={transactions}
            columns={columns}
            isLoading={isLoadingHistory && page === 1 && transactions.length === 0}
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
