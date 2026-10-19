import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useGetTreasuryAccount } from '../api/treasuryQueries';
import { useGetAccountHistory, useDeleteTransaction } from '../api/accountQueries';
import { useCategoryLabels } from '@/features/financials/constants/categoryConfig';
import HuloolDataGrid from '@/shared/grid/HuloolDataGrid';
import type { HuloolGridColumn } from '@/shared/grid/HuloolDataGrid';
import type { CellProps } from 'react-datasheet-grid';
import Button from '@/shared/ui/primitives/Button';
import { Landmark, FileSpreadsheet, ArrowRight, Search, X, RotateCcw, Printer } from 'lucide-react';
import type { FinancialTransaction, CashBoxVoucher } from '@/api/types';
import { LedgerFinalBalanceCell } from '@/shared/grid';
import { ledgerBalanceDelta } from '@/shared/ledger/ledgerDirection';
import { LedgerStatCell } from '@/shared/ledger/LedgerStatCell';
import { ledgerToneClassName } from '@/shared/ledger/ledgerDirection';
import { useModalStore } from '@/shared/stores/modalStore';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useToast } from '@/shared/hooks/useToast';
import { exportService } from '@/services/export/ExportService';
import { ExportChoiceModal } from '../modals/ExportChoiceModal';
import apiClient from '@/api/client';
export interface FilterState {
  start_date: string;
  end_date: string;
  type: string;
  search: string;
}
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
import { useDocumentTitle } from '@/app/router/useDocumentTitle';

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
  is_summary?: boolean;
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
    // Paired leg's account. Needed by the voucher modal to decide whether الحركة المقابلة
    // can link across, and to which ledger.
    target_type: (txn as any).target_type ?? null,
    target_id: (txn as any).target_id ?? null,
    related_object_type: txn.related_object_type ?? '',
    related_object_id: txn.related_object_id ?? 0,
    created_by: txn.created_by ?? 0,
    creator_name: txn.creator_name,
    creator_role_label: txn.creator_role_label,
    debit_account_name: txn.debit_account_name,
    credit_account_name: txn.credit_account_name,
  };
}

const ActionsCell = React.memo(({ rowData }: { rowData: TransformedVoucherTransaction }) => {
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

  const handlePrint = () => openModal('voucherPreview', { transactionId: rowData.id });

  return (
    <div className="flex gap-1.5 items-center justify-center h-full w-full">
      <Button variant="outline-primary" size="sm" onClick={handlePrint} className="px-2 h-7" title="طباعة السند">
        <Printer size={15} />
      </Button>
      <Button variant="outline-primary" size="sm" onClick={handleView} className="px-2.5 h-7 text-xs">
        عرض
      </Button>
      {isAdmin() && (
        <>
          <Button variant="outline-primary" size="sm" onClick={handleEdit} className="px-2.5 h-7 text-xs">
            تعديل
          </Button>
          <Button variant="outline-danger" size="sm" onClick={handleDelete} isLoading={deleteMutation.isPending} className="px-2.5 h-7 text-xs">
            حذف
          </Button>
        </>
      )}
    </div>
  );
});
ActionsCell.displayName = 'ActionsCell';

// Final-balance cell: custom component (not the built-in currency type) because the
// grid's unlayered base styles + the currency cell's inline fontWeight beat any
// Tailwind class. Inline styles here always win: red below zero, green at/above
// zero, larger + bolder, and never a minus sign (color carries the direction).
const formatAbsNumber = (amount: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(amount || 0));

const FinalBalanceCell = React.memo(({ rowData }: { rowData: TransformedVoucherTransaction }) => {
  const bal = Number((rowData as any)?.balance ?? 0);
  return (
    <span
      className="hulool-cell-content"
      style={{
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: '1.05rem',
        color: bal < 0 ? 'var(--token-text-danger)' : 'var(--token-text-success)',
      }}
    >
      {formatAbsNumber(bal)}
    </span>
  );
});
FinalBalanceCell.displayName = 'FinalBalanceCell';

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
  const isAdmin = useAuthStore((state) => state.isAdmin());
  const [page, setPage] = useState(1);
  const [allTransactions, setAllTransactions] = useState<TransformedVoucherTransaction[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportChoice, setShowExportChoice] = useState(false);
  const toast = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Deep link: /treasury-accounts/:id?search=7593 opens this ledger scoped to a single
  // transaction - that is how the paired-leg link in the voucher modal drops the user straight
  // on the row they clicked from. Read once into initial state; the box is seeded from the
  // same value so what is typed always matches what was fetched.
  const [searchParams] = useSearchParams();
  const linkedSearch = searchParams.get('search') ?? '';

  const [filters, setFilters] = useState<FilterState>({
    start_date: '',
    end_date: '',
    type: '',
    search: linkedSearch,
  });

  const [localSearch, setLocalSearch] = useState(linkedSearch);

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

  // Reset the accumulated list whenever the account or any filter changes.
  //
  // The debounce above only calls setPage(1) when the user TYPES something new, so a linked
  // navigation (the paired-leg link opens ?search=8023) never resets: page was already 3 from
  // scrolling, and allTransactions still held the previous account's rows. Page 3 of the new
  // filter then got appended to it, so the list looked unfiltered.
  useEffect(() => {
    setPage(1);
    setAllTransactions([]);
  }, [accountId, filters.start_date, filters.end_date, filters.type, filters.search]);

  const categoryLabels = useCategoryLabels();

  const { data: account, isLoading: isLoadingAccount, error: accountError } = useGetTreasuryAccount(accountId);
  useDocumentTitle(account?.name);
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

  // All three come from the server (account-history response: total_debits /
  // total_credits / balance via getAccountStatistics). Do not recompute the balance as
  // debits - credits here - the server value is authoritative and filter-aware.
  const totalDebits = Number(historyData?.total_debits ?? 0);
  const totalCredits = Number(historyData?.total_credits ?? 0);
  const finalBalance = Number(historyData?.balance ?? 0);

  // Totals now live in the toolbar, so the grid carries only real transactions.
  const gridData = allTransactions;

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
        metadata: (txn as any).metadata,
      }));
      await exportService.exportTreasuryAccount({ title: `كشف حركة الحساب - ${account.name}`, items: exportItems });
      toast.success('تم التصدير بنجاح');
    } catch (err: any) {
      toast.error('فشل التصدير', err.message || '');
    } finally {
      setIsExporting(false);
    }
  };

  const fetchAllHistoryPages = async (extraParams: { start_date?: string; end_date?: string } = {}) => {
    let allTxns: any[] = [];
    let pageNum = 1;
    let totalPages = 1;
    const PER_PAGE_LIMIT = 100;

    do {
      const { data } = await apiClient.get<any>(`/accounts/treasury/${accountId}/history`, {
        params: {
          page: pageNum,
          per_page: PER_PAGE_LIMIT,
          ...extraParams,
        },
      });

      let rawTxns: any[] = [];
      if (data?.data?.transactions) rawTxns = data.data.transactions;
      else if (data?.data?.data) rawTxns = data.data.data;
      else if (data?.transactions) rawTxns = data.transactions;
      else if (Array.isArray(data?.data)) rawTxns = data.data;

      allTxns = [...allTxns, ...rawTxns];

      const pagination = data?.pagination || data?.data?.pagination;
      totalPages = pagination?.total_pages || 1;
      pageNum++;
    } while (pageNum <= totalPages);

    return allTxns;
  };

  const handleExportFull = async () => {
    try {
      setIsExporting(true);
      const allTxns = await fetchAllHistoryPages();

      const exportItems = allTxns.map((txn: any) => ({
        transaction_date: txn.transaction_date || txn.created_at || '',
        transaction_type: txn.transaction_type,
        description: txn.description,
        debit: Number(txn.debit || (txn.direction === 'debit' ? txn.amount : 0)),
        credit: Number(txn.credit || (txn.direction === 'credit' ? txn.amount : 0)),
        balance: Number(txn.balance || txn.balance_after || 0),
        metadata: txn.metadata,
      }));
      await exportService.exportTreasuryAccount({ title: `كشف حركة الحساب كامل - ${account.name}`, items: exportItems });
      toast.success('تم تصدير كامل التاريخ بنجاح');
    } catch (err: any) {
      toast.error('فشل التصدير', err.message || '');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportDateRange = async (startDateStr?: string, endDateStr?: string) => {
    try {
      setIsExporting(true);
      const extraParams: { start_date?: string; end_date?: string } = {};
      if (startDateStr) extraParams.start_date = startDateStr;
      if (endDateStr) extraParams.end_date = endDateStr;

      const allTxns = await fetchAllHistoryPages(extraParams);

      const exportItems = allTxns.map((txn: any) => ({
        transaction_date: txn.transaction_date || txn.created_at || '',
        transaction_type: txn.transaction_type,
        description: txn.description,
        debit: Number(txn.debit || (txn.direction === 'debit' ? txn.amount : 0)),
        credit: Number(txn.credit || (txn.direction === 'credit' ? txn.amount : 0)),
        balance: Number(txn.balance || txn.balance_after || 0),
        metadata: txn.metadata,
      }));

      let dateTitlePart = '';
      if (startDateStr && endDateStr) {
        dateTitlePart = ` (${startDateStr.split(' ')[0]} إلى ${endDateStr.split(' ')[0]})`;
      } else if (startDateStr) {
        dateTitlePart = ` (منذ ${startDateStr.split(' ')[0]})`;
      } else if (endDateStr) {
        dateTitlePart = ` (حتى ${endDateStr.split(' ')[0]})`;
      }

      await exportService.exportTreasuryAccount({
        title: `كشف حركة الحساب${dateTitlePart} - ${account.name}`,
        items: exportItems,
      });
      toast.success('تم تصدير الحركة بنجاح');
    } catch (err: any) {
      toast.error('فشل التصدير', err.message || '');
    } finally {
      setIsExporting(false);
    }
  };

  const formatNumberOnly = (amount: number) =>
    new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

  const columns: HuloolGridColumn<TransformedVoucherTransaction>[] = [
    {
      id: 'transaction_date',
      title: 'التاريخ',
      key: 'date',
      type: 'date',
      width: 95,
      grow: 0,
      cellClassName: ({ rowData }: any) => (rowData.is_summary ? 'font-bold' : ''),
      formatter: (_val: string, rowData: any) => (rowData.is_summary ? '' : undefined),
    },
    {
      id: 'transaction_type',
      title: 'نوع الحركة',
      key: 'transaction_type',
      cellClassName: ({ rowData }: any) => {
        if (rowData.is_summary) return 'text-center font-bold';
        // Same resolver as the client and employee ledgers, so one payment reads the
        // same colour everywhere. A treasury is debit-normal: money in is a debit.
        return `${ledgerToneClassName('treasury', rowData.debit, rowData.credit)} text-center font-bold`;
      },
      formatter: (_val: string, rowData: any) => {
        if (rowData.is_summary) return '';
        const isDebit = Number(rowData.debit || 0) > 0;
        let meta = rowData.metadata;
        if (typeof meta === 'string') {
          try { meta = JSON.parse(meta); } catch {}
        }

        const isOverriddenToReceipt = meta?.voucher_type_override === 'receipt' && !isDebit;
        if (isOverriddenToReceipt) {
          return 'قبض ✦'; // Labeled as receipt per user request, marked with ✦ to denote special client voucher
        }

        const isOverriddenToExpense = meta?.voucher_type_override === 'expense' && isDebit;
        if (isOverriddenToExpense) {
          return 'صرف ✦';
        }

        return isDebit ? 'قبض' : 'صرف';
      },
      width: 85,
      grow: 0,
    },
    {
      id: 'description',
      title: 'البيان',
      key: 'description',
      type: 'text',
      grow: 2,
      cellClassName: ({ rowData }: any) => (rowData.is_summary ? 'font-black text-center text-text-primary text-sm' : ''),
    },
    {
      id: 'debit',
      title: 'مدين',
      key: 'debit',
      type: 'currency',
      width: 110,
      grow: 0,
      cellClassName: ({ rowData }: any) => {
        if (rowData.is_summary) return 'ledger-summary-debit text-center';
        // Money direction, not raw sign: on a treasury a DEBIT is money coming in,
        // so it must read the same colour as the type cell above it.
        return Number(rowData.debit) > 0
          ? `${ledgerToneClassName('treasury', rowData.debit, rowData.credit)} text-center`
          : '';
      },
      formatter: (val: number, rowData: any) => {
        if (rowData.is_summary) return val > 0 ? formatNumberOnly(val) : '0.00';
        return undefined;
      },
    },
    {
      id: 'credit',
      title: 'دائن',
      key: 'credit',
      type: 'currency',
      width: 110,
      grow: 0,
      cellClassName: ({ rowData }: any) => {
        if (rowData.is_summary) return 'ledger-summary-credit text-center';
        return Number(rowData.credit) > 0
          ? `${ledgerToneClassName('treasury', rowData.debit, rowData.credit)} text-center`
          : '';
      },
      formatter: (val: number, rowData: any) => {
        if (rowData.is_summary) return val > 0 ? formatNumberOnly(val) : '0.00';
        return undefined;
      },
    },
    {
      id: 'balance',
      title: 'الرصيد النهائي',
      key: 'balance',
      type: 'custom',
      component: (props: any) => (
        <LedgerFinalBalanceCell
          balance={props.rowData?.balance}
          delta={ledgerBalanceDelta(
            // toCashBoxVoucher stamps 'cashbox'/'company'; both resolve as treasury (debit-normal).
            String(props.rowData?.account_type || 'treasury'),
            props.rowData?.debit,
            props.rowData?.credit,
          )}
        />
      ),
      width: 155,
      grow: 0,
      cellClassName: ({ rowData }: any) => {
        const val = Number(rowData?.balance ?? 0);
        const isNeg = val < 0;
        if (rowData?.is_summary) {
          return isNeg ? 'ledger-summary-balance-neg text-center' : 'ledger-summary-balance-pos text-center';
        }
        return isNeg ? 'ledger-balance-neg text-center' : 'ledger-balance-pos text-center';
      },
    },
    {
      id: 'actions',
      title: 'إجراءات',
      key: 'id',
      type: 'custom',
      component: (props: CellProps<TransformedVoucherTransaction, any>) => {
        if (props.rowData?.is_summary) return <div className="h-full w-full" />;
        return <ActionsCell rowData={props.rowData} />;
      },
      width: 240,
      grow: 0,
    },
  ];

  const subtitle = account ? (
    `تصنيف الحساب: ${categoryLabels[account.sub_type] || account.sub_type} | طبيعة الحساب: ${account.normal_balance === 'debit' ? 'مدين' : 'دائن'}`
  ) : undefined;

  const hasActiveFilters = Boolean(filters.start_date || filters.end_date || filters.type || filters.search);

  const handleBack = () => {
    if (isAdmin) {
      navigate('/financial-center/treasury-accounts');
    } else {
      navigate('/employee/accounts');
    }
  };

  return (
    <>
      <style>{filterDateStyles}</style>
      <div className="p-6 space-y-4 text-right" dir="rtl">
        {/* Unified Compact Header and Filter Card */}
        {/* lg:sticky keeps the search filters and the totals reachable while scrolling a long
            ledger. <main> is the scroll container (flex-1 overflow-y-auto) and the navbar is
            its sibling, so top-0 lands directly under the navbar. z-40 stays below the
            navbar's z-50 and the dropdowns' z-[9999]. */}
        <div className="lg:sticky lg:top-0 lg:z-40 bg-bg-surface border border-border-default rounded-xl shadow-sm overflow-hidden">
          <div className="relative flex flex-col lg:flex-row lg:items-stretch">

            {/* RTL start (right): Inline Filter Fields. Below lg the row stays a single line and
                scrolls sideways instead of wrapping into a tall column; lg restores the wrap. */}
            <div className="header-inline-filters flex flex-nowrap items-center gap-2 p-3 lg:flex-wrap lg:justify-end min-w-0 shrink-0 overflow-x-auto lg:overflow-x-visible">
              {/* Search */}
              <div className="relative w-36 shrink-0 lg:w-44 lg:shrink">
                <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  dir="rtl"
                  className="base-input h-9 w-full rounded-lg border-border-default bg-background/50 px-2 pl-8 text-right text-xs shadow-sm transition-all placeholder:text-text-muted/70 focus:bg-background focus:ring-1 focus:ring-primary/30"
                  placeholder="بحث... أو #رقم الحركة"
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

            {/* Center: Back button + Title. Sits between the filters and the totals with
                equal-width spacers so it reads as the bar's midpoint. It must come AFTER the
                filters in DOM order, otherwise in RTL it lands at the far right and pushes the
                search box into the middle. min-w-0 lets the account name + subtitle truncate
                instead of wrapping onto extra lines on a phone. */}
            <div className="order-first flex items-center justify-center gap-2.5 py-2 lg:py-3 shrink-0 lg:order-none lg:flex-1">
              <div className="hidden lg:flex-1" aria-hidden="true" />
              <button
                onClick={handleBack}
                className="shrink-0 p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-surface-muted transition-colors cursor-pointer"
                title="الرجوع"
              >
                <ArrowRight size={18} />
              </button>
              <div className="shrink-0 text-primary">
                <Landmark size={20} />
              </div>
              <div className="flex items-baseline min-w-0">
                <span className="text-sm font-bold text-text-primary truncate min-w-0">{account?.name || ''}</span>
                {subtitle && <span className="text-xs text-text-secondary mr-2 truncate min-w-0">{subtitle}</span>}
              </div>
              <div className="hidden lg:flex-1" aria-hidden="true" />
            </div>

            {/* RTL end (left): server-calculated totals as flush cells, then the export action.
                Below lg they stay a single flush row that scrolls sideways (they no longer fit a
                phone and used to be clipped); lg keeps them in place with the inline-start
                divider. The Button is whitespace-nowrap, so the export action never gets squeezed
                out of the scroll row. */}
            <div className="flex items-stretch shrink-0 border-t lg:border-t-0 lg:border-s border-border-default overflow-x-auto lg:overflow-x-visible">
              {/* Tone follows money direction on a treasury, where debits are money in -
                  a fixed red debit / green credit would contradict the rows below. */}
              <LedgerStatCell label="اجمالي المدين" value={totalDebits} tone={totalDebits > 0 ? 'credit' : 'debit'} divider />
              <LedgerStatCell label="اجمالي الدائن" value={totalCredits} tone={totalCredits > 0 ? 'debit' : 'credit'} divider />
              <LedgerStatCell label="الرصيد النهائي" value={finalBalance} tone="balance" divider />
              <div className="flex items-center px-4">
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
              </div>
            </div>

          </div>
        </div>

        <div className="treasury-ledger-wrap mx-auto w-[96%] max-w-[1600px] bg-bg-surface rounded-xl border border-border-default shadow-xs overflow-hidden">
          <HuloolDataGrid
            data={gridData}
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
        onExportDateRange={handleExportDateRange}
        title="تصدير كشف الحساب"
      />
    </>
  );
};
