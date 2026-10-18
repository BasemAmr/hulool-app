/**
 * EmployeeTransactionsTable - Excel-like grid for displaying employee transactions
 *
 * Uses HuloolDataGrid for consistent styling with:
 * - Proper RTL alignment
 * - Combined confirmed and pending transactions
 * - Colors for debit/credit cells
 * - Active cell bold text
 */

import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Edit3, Trash2, Eye, Search, X, RotateCcw, Receipt } from 'lucide-react';
import HuloolDataGrid from '@/shared/grid/HuloolDataGrid';
import { LedgerFinalBalanceCell } from '@/shared/grid';
import { LedgerStatCell } from '@/shared/ledger/LedgerStatCell';
import type { HuloolGridColumn } from '@/shared/grid/HuloolDataGrid';
import type { CellProps } from 'react-datasheet-grid';
import { useModalStore } from '@/shared/stores/modalStore';
import { useGetEmployeeTransactions, useGetEmployee } from '@/features/employees/api/employeeQueries';
import { useCurrentUserCapabilities } from '@/features/employees/api/userQueries';
import { useAuthStore } from '@/features/auth/store/authStore';
import { formatDate } from '@/shared/utils/dateUtils';
import type { CashBoxVoucher } from '@/api/types';
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

// ================================
// STAT CELL (toolbar totals)
// ================================
// Toolbar totals use the shared LedgerStatCell so client, treasury and employee ledgers
// stay identical. Values come from the server summary, never from summing the page.

// ================================
// TYPE DEFINITIONS
// ================================

interface ConfirmedTransaction {
  id: string;
  transaction_type: string;
  description: string;
  debit: string;
  credit: string;
  balance: string | null;
  transaction_date: string;
  related_object_type: string | null;
  related_object_id: string | null;
  task_name?: string | null;
  client_name?: string | null;
}

interface EmployeeTransactionsTableProps {
  employeeId?: number;
  transactions?: ConfirmedTransaction[];
  isLoading?: boolean;
  page?: number;
  perPage?: number;
  onPageChange?: (page: number) => void;
  onEdit?: (transaction: any) => void;
  onDelete?: (transaction: any) => void;
}

// ================================
// HELPER FUNCTIONS
// ================================

const ALL_TYPES_VALUE = '__all__';

function parseDate(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function toISODate(date: Date | null): string {
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

function toEmployeeVoucher(rowData: any, employeeName?: string): CashBoxVoucher {
  const debit = rowData.debit_val !== undefined ? Number(rowData.debit_val) : parseFloat(rowData.debit || '0');
  const credit = rowData.credit_val !== undefined ? Number(rowData.credit_val) : parseFloat(rowData.credit || '0');
  const rawDate = rowData.date || rowData.transaction_date || '';
  const date = rawDate.includes(' ') ? rawDate.replace(' ', 'T') : rawDate;
  const isDebit = debit > 0;

  return {
    id: Number(rowData.id) || 0,
    account_id: Number(rowData.account_id) || 0,
    account_type: 'employee' as any,
    transaction_type: rowData.transaction_type,
    type: (isDebit ? 'CASHBOX_PAYMENT' : 'CASHBOX_RECEIPT') as any,
    date,
    category: rowData.transaction_type,
    description: rowData.description,
    debit,
    credit,
    balance: rowData.balance_val ?? (rowData.balance ? parseFloat(rowData.balance) : 0),
    related_transaction_id: rowData.related_transaction_id ?? 0,
    related_object_type: rowData.related_object_type ?? '',
    related_object_id: rowData.related_object_id ?? 0,
    created_by: rowData.created_by ?? 0,
    creator_name: rowData.creator_name || '',
    creator_role_label: rowData.creator_role_label || '',
    debit_account_name: isDebit ? (employeeName || 'الموظف') : (rowData.client_name ? `عميل: ${rowData.client_name}` : '—'),
    credit_account_name: !isDebit ? (employeeName || 'الموظف') : (rowData.client_name ? `عميل: ${rowData.client_name}` : '—'),
  };
}

const formatCurrency = (amount: number | string | undefined | null) => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  if (isNaN(numAmount)) return 'SAR 0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 2
  }).format(numAmount);
};

// ================================
// CUSTOM CELL COMPONENTS
// ================================

// Date Cell
const DateCell = React.memo(({ rowData, active }: CellProps<any>) => {
  if (rowData.is_summary) return <span className="hulool-cell-content" />;
  return (
    <span className="hulool-cell-content" style={{ justifyContent: 'center', fontSize: '0.875rem', color: 'var(--token-text-primary)', fontWeight: active ? 700 : 500 }}>
      {formatDate(rowData.date)}
    </span>
  );
});
DateCell.displayName = 'DateCell';

// Type Badge Cell
const TypeBadgeCell = React.memo(({ rowData }: CellProps<any>) => {
  if (rowData.is_summary) return <span className="hulool-cell-content" />;
  const badges: Record<string, { tone: string; label: string }> = {
    'EMPLOYEE_COMMISSION': { tone: 'success', label: 'عمولة' },
    'EMPLOYEE_PAYOUT': { tone: 'danger', label: 'صرف' },
    'PAYOUT': { tone: 'danger', label: 'صرف' },
    'CASHBOX_PAYMENT': { tone: 'danger', label: 'صرف صندوق' },
    'EMPLOYEE_EXPENSE': { tone: 'warning', label: 'مصروف' },
    'EMPLOYEE_BORROW': { tone: 'info', label: 'سلفة' },
  };

  const badge = badges[rowData.transaction_type] || (
    rowData.debit_val > 0
      ? { tone: 'danger', label: 'سند صرف' }
      : { tone: 'success', label: 'سند قبض' }
  );

  // Full-cell tint comes from cellClassName (ledger-type-*-cell); the label is plain text
  // that inherits the cell colour via .hulool-cell-content.
  return (
    <span className="hulool-cell-content" style={{ justifyContent: 'center', fontSize: '0.875rem' }}>
      {badge.label}
    </span>
  );
});
TypeBadgeCell.displayName = 'TypeBadgeCell';

// Description Cell
const DescriptionCell = React.memo(({ rowData, active }: CellProps<any>) => {
  if (rowData.is_summary) return <span className="hulool-cell-content">الإجماليات</span>;
  return (
    <span className="hulool-cell-content" style={{ fontWeight: active ? 700 : 500, color: 'var(--token-text-primary)' }}>
      {rowData.description}
    </span>
  );
});
DescriptionCell.displayName = 'DescriptionCell';

// Debit Cell
const DebitCell = React.memo(({ rowData, active }: CellProps<any>) => {
  const amount = rowData.debit_val;
  return (
    <span className="hulool-cell-content" style={{ justifyContent: 'center', color: 'var(--token-text-primary)', fontWeight: active ? 700 : 500 }}>
      {amount > 0 ? formatCurrency(amount) : '—'}
    </span>
  );
});
DebitCell.displayName = 'DebitCell';

// Credit Cell
const CreditCell = React.memo(({ rowData, active }: CellProps<any>) => {
  const amount = rowData.credit_val;
  return (
    <span className="hulool-cell-content" style={{ justifyContent: 'center', color: 'var(--token-text-primary)', fontWeight: active ? 700 : 500 }}>
      {amount > 0 ? formatCurrency(amount) : '—'}
    </span>
  );
});
CreditCell.displayName = 'CreditCell';

// Balance Cell
const BalanceCell = React.memo(({ rowData }: CellProps<any>) => {
  return <LedgerFinalBalanceCell balance={rowData.balance_val} />;
});
BalanceCell.displayName = 'BalanceCell';

// Actions Cell
interface ActionsCellData {
  canEdit: boolean;
  employeeName?: string;
  onView: (transaction: any) => void;
  onEdit: (transaction: any) => void;
  onDelete: (transaction: any) => void;
}

const ActionsCell = React.memo(({ rowData, columnData }: CellProps<any, ActionsCellData>) => {
  const { canEdit, onView, onEdit, onDelete } = columnData || {};

  return (
    <div
      style={{
        display: 'flex',
        gap: '4px',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        pointerEvents: 'auto',
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onView?.(rowData); }}
        className="inline-flex items-center justify-center rounded p-1.5 text-text-secondary hover:text-text-primary cursor-pointer transition-colors duration-150"
        title="عرض تفاصيل الحركة"
      >
        <Eye size={14} />
      </button>
      {canEdit && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit?.(rowData); }}
            className="inline-flex items-center justify-center rounded p-1.5 text-text-secondary hover:text-text-primary cursor-pointer transition-colors duration-150"
            title="تعديل"
          >
            <Edit3 size={14} />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete?.(rowData); }}
            className="inline-flex items-center justify-center rounded p-1.5 text-text-secondary hover:text-text-danger cursor-pointer transition-colors duration-150"
            title="حذف"
          >
            <Trash2 size={14} />
          </button>
        </>
      )}
    </div>
  );
});
ActionsCell.displayName = 'ActionsCell';

// ================================
// MAIN COMPONENT
// ================================

const EmployeeTransactionsTable: React.FC<EmployeeTransactionsTableProps> = ({
  employeeId,
  transactions: propTransactions,
  isLoading: propIsLoading,
  page = 1,
  perPage = 20,
  onPageChange,
  onEdit,
  onDelete,
}) => {
  const { openModal } = useModalStore();
  const { data: capabilities } = useCurrentUserCapabilities();
  const currentUser = useAuthStore((state) => state.user);
  const canEdit = capabilities?.manage_options || currentUser?.type === 'admin' || currentUser?.type === 'employee_admin' || false;

  const [internalPage, setInternalPage] = useState(1);
  const activePage = page !== undefined ? page : internalPage;

  // Scroll-to-load: pages are appended to `accumulated` as the sentinel scrolls into view,
  // matching the client and treasury ledgers. Previously this used prev/next buttons, which
  // capped scanning at one page at a time on a long ledger.
  const [accumulated, setAccumulated] = useState<ConfirmedTransaction[]>([]);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const handlePageChange = (newPage: number) => {
    if (onPageChange) {
      onPageChange(newPage);
    } else {
      setInternalPage(newPage);
    }
  };

  const [localSearch, setLocalSearch] = useState('');
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    type: '',
    search: '',
  });

  // Debounce search by 350ms
  useEffect(() => {
    const handler = setTimeout(() => {
      if (localSearch !== filters.search) {
        setFilters(prev => ({ ...prev, search: localSearch }));
        handlePageChange(1);
      }
    }, 350);
    return () => clearTimeout(handler);
  }, [localSearch, filters.search]);

  // Fetch employee details to get employee name for vouchers
  const { data: employeeData } = useGetEmployee(employeeId as number);
  const employeeName = employeeData?.display_name || '';

  // Fetch employee transactions with server-side filters
  const {
    data: transactionsData,
    isLoading: isQueryLoading,
  } = useGetEmployeeTransactions(employeeId as number, {
    page: activePage,
    per_page: perPage,
    start_date: filters.start_date,
    end_date: filters.end_date,
    transaction_type: filters.type,
    search: filters.search,
  });

  const isLoading = propIsLoading !== undefined ? propIsLoading : isQueryLoading;

  const pageRows: ConfirmedTransaction[] = useMemo(
    () => (propTransactions
      ? propTransactions
      : (transactionsData?.data?.confirmed_transactions || [])),
    [propTransactions, transactionsData]
  );

  // When not driven by a parent, append each fetched page (de-duplicated by id) instead of
  // replacing, so scrolling accumulates the full ledger.
  useEffect(() => {
    if (propTransactions) return;
    setAccumulated(prev => {
      if (activePage === 1) return pageRows;
      const seen = new Set(prev.map((t) => t.id));
      return [...prev, ...pageRows.filter((t) => !seen.has(t.id))];
    });
  }, [pageRows, activePage, propTransactions]);

  const confirmedTransactions = propTransactions ? propTransactions : accumulated;

  const pagination = transactionsData?.pagination || {};
  const totalPages = pagination.total_pages || 1;
  const hasMore = activePage < totalPages;
  const isInitialLoad = isLoading && confirmedTransactions.length === 0;

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) handlePageChange(activePage + 1);
  }, [hasMore, isLoading, activePage]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && hasMore && !isLoading) loadMore(); },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoading, loadMore]);

  // Any filter change restarts accumulation from page 1.
  useEffect(() => {
    handlePageChange(1);
    if (!propTransactions) setAccumulated([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.start_date, filters.end_date, filters.type, filters.search]);

  const summary = transactionsData?.data?.summary || {};

  // Toolbar totals come from the server summary (whole ledger), never from summing the
  // paginated `confirmed` rows - that is what made the old footer disagree with the balance.
  // Server convention: balance = credit - debit.
  const totalDebit = summary.total_expenses ?? 0;
  const totalCredit = summary.total_earned ?? 0;
  const finalBalance = summary.balance_due ?? (totalCredit - totalDebit);

  const handleViewTransaction = (transaction: any) => {
    openModal('voucherDetails', { voucher: toEmployeeVoucher(transaction, employeeName) });
  };

  const handleEditTransaction = (transaction: any) => {
    if (onEdit) {
      onEdit(transaction);
      return;
    }
    openModal('transactionEdit', { transaction });
  };

  const handleDeleteTransaction = (transaction: any) => {
    if (onDelete) {
      onDelete(transaction);
      return;
    }
    openModal('transactionDelete', { transaction });
  };

  // Confirmed transactions only. Pending commissions ("عمولة معلقة") are deliberately NOT
  // shown here — they are uncalculated estimates, not ledger entries, and mixing them in
  // made the running-balance column and row count disagree with the server totals.
  const combinedData = useMemo(() => {
    const all = confirmedTransactions.map((t) => ({
      ...t,
      is_summary: false,
      date: t.transaction_date || '',
      debit_val: parseFloat(t.debit || '0'),
      credit_val: parseFloat(t.credit || '0'),
      balance_val: t.balance ? parseFloat(t.balance) : null,
    }));

    // Sort descending by date
    all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return all;
  }, [confirmedTransactions]);

  // Define columns - RTL order (first is rightmost)
  const columns = useMemo((): HuloolGridColumn<any>[] => [
    {
      id: 'date',
      key: 'date',
      title: 'التاريخ',
      type: 'custom',
      component: DateCell,
      width: 120,
      grow: 0,
    },
    {
      id: 'transaction_type',
      key: 'transaction_type',
      title: 'النوع',
      type: 'custom',
      component: TypeBadgeCell,
      cellClassName: ({ rowData }: any) => {
        if (rowData?.is_summary) return '';
        const tone = ({
          EMPLOYEE_COMMISSION: 'success',
          EMPLOYEE_PAYOUT: 'danger',
          PAYOUT: 'danger',
          CASHBOX_PAYMENT: 'danger',
          EMPLOYEE_EXPENSE: 'warning',
          EMPLOYEE_BORROW: 'info',
        } as Record<string, string>)[rowData?.transaction_type]
          || (rowData?.debit_val > 0 ? 'danger' : 'success');
        return `ledger-type-${tone}-cell`;
      },
      width: 130,
      grow: 0,
    },
    {
      id: 'description',
      key: 'description',
      title: 'الوصف',
      type: 'custom',
      component: DescriptionCell,
      grow: 2,
    },
    {
      id: 'debit',
      key: 'debit_val',
      title: 'مدين',
      type: 'custom',
      component: DebitCell,
      grow: 1,
      cellClassName: ({ rowData }) => {
        if (rowData.is_summary) return 'ledger-summary-debit text-center';
        return rowData.debit_val > 0 ? 'ledger-debit-cell text-center' : '';
      }
    },
    {
      id: 'credit',
      key: 'credit_val',
      title: 'دائن',
      type: 'custom',
      component: CreditCell,
      grow: 1,
      cellClassName: ({ rowData }) => {
        if (rowData.is_summary) return 'ledger-summary-credit text-center';
        return rowData.credit_val > 0 ? 'ledger-credit-cell text-center' : '';
      }
    },
    {
      id: 'balance',
      key: 'balance_val',
      title: 'الرصيد النهائي',
      type: 'custom',
      component: BalanceCell,
      grow: 1,
      cellClassName: ({ rowData }) => {
        const val = Number(rowData?.balance_val ?? 0);
        const isNeg = val < 0;
        if (rowData.is_summary) {
          return isNeg ? 'ledger-summary-balance-neg text-center' : 'ledger-summary-balance-pos text-center';
        }
        return isNeg ? 'ledger-balance-neg text-center' : 'ledger-balance-pos text-center';
      }
    },
    {
      id: 'actions',
      key: 'id',
      title: 'الإجراءات',
      type: 'custom',
      component: ActionsCell as React.ComponentType<CellProps<any>>,
      columnData: {
        canEdit,
        employeeName,
        onView: handleViewTransaction,
        onEdit: handleEditTransaction,
        onDelete: handleDeleteTransaction,
      },
      width: canEdit ? 120 : 60,
      grow: 0,
    },
  ], [canEdit, employeeName]);

  const hasActiveFilters = Boolean(filters.start_date || filters.end_date || filters.type || filters.search);

  if (isLoading && !transactionsData) {
    return <div className="p-4 text-center">Loading transactions...</div>;
  }

  return (
    <div className="employee-transactions-wrapper mx-auto w-[96%] max-w-[1600px] my-3 space-y-3" dir="rtl">
      <style>{filterDateStyles}</style>

      {/* Unified Compact Filters Toolbar Card */}
      <div className="bg-bg-surface border border-border-default rounded-xl shadow-xs overflow-hidden">
        <div className="relative flex flex-col lg:flex-row lg:items-stretch">

          {/* RTL start (right): Inline Filter Fields */}
          <div className="header-inline-filters flex flex-wrap items-center gap-2 p-3 lg:justify-end min-w-0 shrink-0">
            {/* Search */}
            <div className="relative w-48">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                dir="rtl"
                className="base-input h-9 w-full rounded-lg border-border-default bg-background/50 px-2 pl-8 text-right text-xs shadow-sm transition-all placeholder:text-text-muted/70 focus:bg-background focus:ring-1 focus:ring-primary/30"
                placeholder="بحث في البيان، المهمة، العميل..."
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
              onChange={(date: Date | null) => {
                setFilters(prev => ({ ...prev, start_date: toISODate(date) }));
                handlePageChange(1);
              }}
              dateFormat="yyyy-MM-dd"
              placeholderText="من تاريخ"
              locale={arSA}
              portalId="employee-transactions-datepicker-portal"
              showYearDropdown
              scrollableYearDropdown
              dropdownMode="select"
              calendarStartDay={6}
            />

            {/* End Date */}
            <DatePicker
              selected={parseDate(filters.end_date)}
              onChange={(date: Date | null) => {
                setFilters(prev => ({ ...prev, end_date: toISODate(date) }));
                handlePageChange(1);
              }}
              dateFormat="yyyy-MM-dd"
              placeholderText="إلى تاريخ"
              locale={arSA}
              portalId="employee-transactions-datepicker-portal"
              showYearDropdown
              scrollableYearDropdown
              dropdownMode="select"
              calendarStartDay={6}
            />

            {/* Type Select: ONLY سند قبض and سند صرف */}
            <div className="w-32 shrink-0">
              <Select
                value={filters.type || ALL_TYPES_VALUE}
                onValueChange={value => {
                  setFilters(prev => ({ ...prev, type: value === ALL_TYPES_VALUE ? '' : value }));
                  handlePageChange(1);
                }}
              >
                <SelectTrigger className="h-9 w-full rounded-lg border-border-default bg-background/50 text-xs font-medium shadow-sm transition-all hover:bg-background focus:ring-1 focus:ring-primary/20">
                  <SelectValue placeholder="النوع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_TYPES_VALUE}>كل الحركات</SelectItem>
                  <SelectItem value="receipt">سند قبض</SelectItem>
                  <SelectItem value="payment">سند صرف</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reset */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setLocalSearch('');
                  setFilters({ start_date: '', end_date: '', type: '', search: '' });
                  handlePageChange(1);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-dashed border-border-default bg-background hover:bg-primary/5 hover:text-text-primary transition-all active:scale-95 text-text-secondary"
                title="إعادة ضبط الفلاتر"
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>

          {/* Center: Icon / Title / Count. Sits between the filters and the totals as a real flex
              child with equal-width spacers on both sides, so it stays visually centered
              without absolute positioning (which overlapped on narrow screens). */}
          <div className="order-first flex items-center justify-center gap-2.5 py-3 shrink-0 lg:order-none lg:flex-1">
            <div className="hidden lg:flex-1" aria-hidden="true" />
            <div className="shrink-0 text-primary">
              <Receipt size={20} />
            </div>
            <div className="flex items-baseline min-w-0">
              <span className="text-sm font-bold text-text-primary">كشف معاملات الموظف</span>
              {pagination.total !== undefined && (
                <span className="text-xs text-text-secondary mr-2 font-normal">
                  ({pagination.total} حركة)
                </span>
              )}
            </div>
            <div className="hidden lg:flex-1" aria-hidden="true" />
          </div>

          {/* RTL end (left): all-time totals from the server summary, as flush cells.
              No padding gap to the card edges so they read as cells of the bar itself. */}
          <div className="flex items-stretch shrink-0 border-t lg:border-t-0 lg:border-s border-border-default">
            <LedgerStatCell label="اجمالي المدين" value={totalDebit} tone="debit" divider />
            <LedgerStatCell label="اجمالي الدائن" value={totalCredit} tone="credit" divider />
            <LedgerStatCell label="الرصيد النهائي" value={finalBalance} tone="balance" />
          </div>

        </div>
      </div>

      {/* Grid Container */}
      <div className="bg-bg-surface rounded-xl border border-border-default shadow-xs overflow-hidden">
        <HuloolDataGrid
          data={combinedData}
          columns={columns}
          isLoading={isInitialLoad}
          emptyMessage="لا توجد معاملات مالية"
          showId={false}
          height="auto"
          minHeight={400}
          rowClassName={(rowData: any) => {
            if (!rowData) return '';
            if (rowData.is_summary) return 'ledger-summary-row';
            return '';
          }}
        />

        {/* Scroll sentinel - replaces the old prev/next footer. Reaching it loads the next
            page and appends it, the same as the client and treasury ledgers. */}
        {hasMore && (
          <div ref={sentinelRef} className="py-3 flex items-center justify-center text-text-secondary text-xs">
            {isLoading ? 'جاري تحميل المزيد...' : 'مرر للأسفل لتحميل المزيد'}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeTransactionsTable;
