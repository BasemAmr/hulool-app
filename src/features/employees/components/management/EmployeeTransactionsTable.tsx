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
import { useSearchParams } from 'react-router-dom';
import { Edit3, Trash2, Eye, Search, X, RotateCcw, Receipt, FileSpreadsheet } from 'lucide-react';
import HuloolDataGrid from '@/shared/grid/HuloolDataGrid';
import { LedgerFinalBalanceCell } from '@/shared/grid';
import { LedgerStatCell } from '@/shared/ledger/LedgerStatCell';
import { ledgerToneClassName, ledgerBalanceDelta } from '@/shared/ledger/ledgerDirection';
import type { HuloolGridColumn } from '@/shared/grid/HuloolDataGrid';
import type { CellProps } from 'react-datasheet-grid';
import { useModalStore } from '@/shared/stores/modalStore';
import { useGetEmployeeTransactions, useGetEmployee } from '@/features/employees/api/employeeQueries';
import { useCurrentUserCapabilities } from '@/features/employees/api/userQueries';
import { useAuthStore } from '@/features/auth/store/authStore';
import { formatDate } from '@/shared/utils/dateUtils';
import type { CashBoxVoucher } from '@/api/types';
import Button from '@/shared/ui/primitives/Button';
import { ExportChoiceModal } from '@/features/financials/modals/ExportChoiceModal';
import { exportService } from '@/services/export/ExportService';
import type { EmployeeStatementReportData } from '@/services/export/exportTypes';
import { useToast } from '@/shared/hooks/useToast';
import apiClient from '@/api/client';
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
    // The payouts endpoint does not pair its rows today (both fields come back null), but
    // pass them through so this mapper stays correct if the backend starts pairing them.
    target_type: rowData.target_type ?? null,
    target_id: rowData.target_id ?? null,
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
// Single source of truth for the row label: the grid cell renders it and the Excel export
// writes it, so a row never reads as "عمولة" on screen and "EMPLOYEE_COMMISSION" in the file.
const TYPE_LABELS: Record<string, string> = {
  EMPLOYEE_COMMISSION: 'عمولة',
  EMPLOYEE_PAYOUT: 'صرف',
  PAYOUT: 'صرف',
  CASHBOX_PAYMENT: 'صرف صندوق',
  EMPLOYEE_EXPENSE: 'مصروف',
  EMPLOYEE_BORROW: 'سلفة',
};

const typeLabel = (transactionType?: string | null, debit?: number | null): string => {
  if (transactionType && TYPE_LABELS[transactionType]) return TYPE_LABELS[transactionType];
  return Number(debit || 0) > 0 ? 'سند صرف' : 'سند قبض';
};

const TypeBadgeCell = React.memo(({ rowData }: CellProps<any>) => {
  if (rowData.is_summary) return <span className="hulool-cell-content" />;

  // Full-cell tint comes from cellClassName (ledger-type-*-cell); the label is plain text
  // that inherits the cell colour via .hulool-cell-content.
  return (
    <span className="hulool-cell-content" style={{ justifyContent: 'center', fontSize: '0.875rem' }}>
      {typeLabel(rowData.transaction_type, rowData.debit_val)}
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
  return (
    <LedgerFinalBalanceCell
      balance={rowData.balance_val}
      delta={ledgerBalanceDelta('employee', rowData.debit, rowData.credit)}
    />
  );
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
// EXPORT
// ================================

interface LedgerExportFilters {
  start_date?: string;
  end_date?: string;
  type?: string;
  search?: string;
}

// The subset of a payouts row this file reads. Amounts arrive as strings from WPDB.
interface LedgerExportRow {
  id: number | string;
  transaction_date?: string | null;
  transaction_type?: string | null;
  description?: string | null;
  debit?: string | number | null;
  credit?: string | number | null;
  balance?: string | number | null;
  client_name?: string | null;
  task_name?: string | null;
}

interface LedgerExportSummary {
  total_expenses?: number; // إجمالي المدين
  total_earned?: number;   // إجمالي الدائن
  balance_due?: number;    // الرصيد النهائي
}

/**
 * Reads the whole filtered employee ledger server-side, one page at a time, from the same
 * endpoint the grid uses.
 *
 * per_page is capped at 100 and the summary returned alongside the rows is computed with the
 * SAME filters, so summing the returned rows must reproduce the toolbar totals - that is why
 * the export refetches instead of exporting the pages scrolled into `accumulated`.
 */
const fetchAllEmployeePayouts = async (employeeId: number, filters: LedgerExportFilters) => {
  const rows: LedgerExportRow[] = [];
  let page = 1;
  let totalPages = 1;
  let summary: LedgerExportSummary | null = null;

  do {
    const { data } = await apiClient.get<{
      data?: { confirmed_transactions?: LedgerExportRow[]; summary?: LedgerExportSummary };
      pagination?: { total_pages?: number };
    }>(`/employees/${employeeId}/payouts`, {
      params: {
        page,
        per_page: 100,
        // Undefined keys are dropped by axios, matching how the grid's query builds params.
        start_date: filters.start_date || undefined,
        end_date: filters.end_date || undefined,
        transaction_type: filters.type || undefined,
        search: filters.search || undefined,
      },
    });
    rows.push(...(data?.data?.confirmed_transactions || []));
    totalPages = Number(data?.pagination?.total_pages || 1);
    summary = data?.data?.summary || null;
    page++;
  } while (page <= totalPages);

  return { rows, summary };
};

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

  // Deep link: /employees/:id?search=7876 opens this ledger scoped to a single transaction,
  // which is where the paired-leg link in the voucher modal lands. Read into INITIAL state
  // for both the committed filter and the visible box - seeding via an effect instead would
  // race the reset-sync effect below, which fires on mount and would clobber the seed.
  const [searchParams] = useSearchParams();
  const linkedSearch = searchParams.get('search') ?? '';

  const [localSearch, setLocalSearch] = useState(linkedSearch);
  const [showExportChoice, setShowExportChoice] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const toast = useToast();
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    type: '',
    search: linkedSearch,
  });

  // The reset button clears filters.search; mirror it back into the input. Without this the
  // box keeps showing the old text while the grid shows the full ledger - the one control
  // and its result disagreeing on screen. (The treasury ledger already does this.)
  useEffect(() => {
    setLocalSearch(filters.search);
  }, [filters.search]);

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
  // We deliberately do NOT clear `accumulated` here: clearing it blanks the grid while the
  // new query is in flight. The page-1 branch of the effect above replaces the rows as soon
  // as fresh data arrives, so the previous result stays on screen until then.
  //
  // handlePageChange(1) is unconditional (the old `if` compared localSearch to filters.search
  // and never fired on a linked navigation, where both are seeded from ?search= and are equal
  // by construction). That left `activePage` at whatever the reader had scrolled to, so the
  // page-N response was appended to the previous accumulation instead of replacing it.
  useEffect(() => {
    handlePageChange(1);
  }, [filters.start_date, filters.end_date, filters.type, filters.search, employeeId]);

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

  // --- Excel export (تصدير) ---
  // One handler for all three modal options; they differ only in the filters sent to the
  // server. No overrides = the toolbar's current filters; every override = that option's own
  // filters, so "كامل" and "نطاق تاريخي" really do ignore what is in the toolbar (a leftover
  // type/search filter there would silently make a full export a filtered one).
  const handleExportLedger = async (overrides?: LedgerExportFilters) => {
    const effective: LedgerExportFilters = {
      start_date: filters.start_date,
      end_date: filters.end_date,
      type: filters.type,
      search: filters.search,
      ...overrides,
    };

    try {
      setIsExporting(true);
      const { rows, summary } = await fetchAllEmployeePayouts(employeeId as number, effective);

      const rowsDebit = rows.reduce((sum, tx) => sum + Number(tx.debit || 0), 0);
      const rowsCredit = rows.reduce((sum, tx) => sum + Number(tx.credit || 0), 0);

      // Server summary wins (it is what the toolbar shows); rows are the fallback.
      const totalDebit = Number(summary?.total_expenses ?? rowsDebit);   // إجمالي المدين
      const totalCredit = Number(summary?.total_earned ?? rowsCredit);    // إجمالي الدائن
      const balanceDue = Number(summary?.balance_due ?? totalCredit - totalDebit); // الرصيد النهائي

      // Oldest first so the balance reads top-to-bottom, and the balance is a running total of
      // the exported rows (credit - debit, the server's own sign convention). That keeps the
      // column tying out to the totals row, and on a full export the last row equals the
      // account balance. Same treatment as the client statement sheet.
      const sorted = [...rows].sort(
        (a, b) => new Date(a.transaction_date || 0).getTime() - new Date(b.transaction_date || 0).getTime()
      );

      let runningBalance = 0;
      const exportData: EmployeeStatementReportData = {
        employeeId: employeeId as number,
        employeeName: employeeName || `موظف #${employeeId}`,
        // The sheet prints "الفترة"; an export is not month-scoped.
        period: { month: 0, year: new Date().getFullYear(), month_name: 'جميع الفترات' },
        // The generator always prints a "رصيد افتتاحي" row. It stays zero: a full export
        // genuinely starts from nothing, and a filtered one has no meaningful opening figure.
        openingBalance: { total_debit: 0, total_credit: 0, balance: 0 },
        transactions: sorted.map((tx) => {
          const debit = Number(tx.debit || 0);
          const credit = Number(tx.credit || 0);
          runningBalance += credit - debit;
          return {
            id: Number(tx.id),
            date: tx.transaction_date || '',
            description: tx.description || '',
            amount: debit > 0 ? debit : credit,
            running_balance: runningBalance,
            // The generator puts `income` money in the debit column, which is where an
            // employee's payouts belong (total_expenses = sum of debits = إجمالي المدين).
            direction: (debit > 0 ? 'income' : 'expense') as 'income' | 'expense',
            transaction_type: typeLabel(tx.transaction_type, debit),
            client_name: tx.client_name || tx.task_name || null,
          };
        }),
        summary: {
          period_income: totalDebit,
          period_expenses: totalCredit,
          closing_balance: balanceDue,
          // Named after the generator's columns: these two land in the المدين / الدائن
          // totals cells and must equal the toolbar's إجمالي المدين / إجمالي الدائن.
          total_to_date_income: totalDebit,
          total_to_date_expenses: totalCredit,
        },
      };

      await exportService.exportEmployeeStatement(exportData);
      toast.success('تم التصدير بنجاح');
    } catch (err) {
      toast.error('فشل التصدير', err instanceof Error ? err.message : String(err));
    } finally {
      setIsExporting(false);
    }
  };

  // The modal sends "YYYY-MM-DD 00:00:00" / "23:59:59"; the endpoint uses the time part when present.
  const NO_FILTERS: LedgerExportFilters = { start_date: '', end_date: '', type: '', search: '' };
  const handleExportFiltered = () => handleExportLedger();
  const handleExportFull = () => handleExportLedger(NO_FILTERS);
  const handleExportDateRange = (startDate?: string, endDate?: string) =>
    handleExportLedger({ start_date: startDate || '', end_date: endDate || '', type: '', search: '' });

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
        // Resolved against the employee's credit-normal polarity, so a payout (debit)
        // reads red and a commission (credit) reads green on every ledger.
        return ledgerToneClassName('employee', rowData?.debit_val, rowData?.credit_val);
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

  // Only on the very first load, when there is nothing to show yet. Previously this also fired
  // on every filter/search change (a new query key means `transactionsData` is briefly
  // undefined), which replaced the whole page - toolbar and grid - with "Loading
  // transactions..." and threw the reader back to the top of the table.
  if (isInitialLoad) {
    return <div className="p-4 text-center">Loading transactions...</div>;
  }

  return (
    <div className="employee-transactions-wrapper mx-auto w-[96%] max-w-[1600px] my-3 space-y-3" dir="rtl">
      <style>{filterDateStyles}</style>

      {/* Unified Compact Filters Toolbar Card */}
{/* lg:sticky keeps the search filters and the totals reachable while scrolling a long
           ledger. <main> is the scroll container (flex-1 overflow-y-auto) and the navbar is
           its sibling, so top-0 lands directly under the navbar. z-40 stays below the
           navbar's z-50 and the dropdowns' z-[9999]. */}
      <div className="lg:sticky lg:top-0 lg:z-40 bg-bg-surface border border-border-default rounded-xl shadow-xs overflow-hidden">
        <div className="relative flex flex-col lg:flex-row lg:items-stretch">

          {/* RTL start (right): Inline Filter Fields. Below lg the row stays a single line and
              scrolls sideways instead of wrapping into a tall column; lg restores the wrap. */}
          <div className="header-inline-filters flex flex-nowrap items-center gap-2 p-3 lg:flex-wrap lg:justify-end min-w-0 shrink-0 overflow-x-auto lg:overflow-x-visible">
            {/* Search */}
            <div className="relative w-36 shrink-0 lg:w-48 lg:shrink">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                dir="rtl"
                className="base-input h-9 w-full rounded-lg border-border-default bg-background/50 px-2 pl-8 text-right text-xs shadow-sm transition-all placeholder:text-text-muted/70 focus:bg-background focus:ring-1 focus:ring-primary/30"
                placeholder="بحث في البيان، المهمة، العميل... أو #رقم الحركة"
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
              without absolute positioning (which overlapped on narrow screens). The
              title/count truncate so this stays one line on a phone. */}
          <div className="order-first flex items-center justify-center gap-2.5 py-2 lg:py-3 shrink-0 lg:order-none lg:flex-1">
            <div className="hidden lg:flex-1" aria-hidden="true" />
            <div className="shrink-0 text-primary">
              <Receipt size={20} />
            </div>
            <div className="flex items-baseline min-w-0">
              <span className="text-sm font-bold text-text-primary truncate min-w-0">كشف معاملات الموظف</span>
              {pagination.total !== undefined && (
                <span className="text-xs text-text-secondary mr-2 font-normal truncate min-w-0">
                  ({pagination.total} حركة)
                </span>
              )}
            </div>
            <div className="hidden lg:flex-1" aria-hidden="true" />
          </div>

          {/* RTL end (left): all-time totals from the server summary, as flush cells, then the
              export action. No padding gap to the card edges so they read as cells of the bar
              itself. Below lg they stay a single flush row that scrolls sideways (they no longer
              fit a phone and used to be clipped); lg keeps them in place with the inline-start
              divider. The Button is whitespace-nowrap, so it never gets squeezed out of the
              scroll row. */}
          <div className="flex items-stretch shrink-0 border-t lg:border-t-0 lg:border-s border-border-default overflow-x-auto lg:overflow-x-visible">
            <LedgerStatCell label="اجمالي المدين" value={totalDebit} tone="debit" divider />
            <LedgerStatCell label="اجمالي الدائن" value={totalCredit} tone="credit" divider />
            <LedgerStatCell label="الرصيد النهائي" value={finalBalance} tone="balance" divider />
            <div className="flex items-center px-4">
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => setShowExportChoice(true)}
                disabled={isExporting || confirmedTransactions.length === 0 || !employeeId}
                className="h-9 whitespace-nowrap"
              >
                <FileSpreadsheet size={15} className="me-1.5" />
                تصدير Excel
              </Button>
            </div>
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
          <div ref={sentinelRef} className="flex justify-center items-center py-3 border-t border-border-default">
            {isLoading && activePage > 1 ? (
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
      </div>

      <ExportChoiceModal
        isOpen={showExportChoice}
        onClose={() => setShowExportChoice(false)}
        onExportFiltered={handleExportFiltered}
        onExportFull={handleExportFull}
        onExportDateRange={handleExportDateRange}
        title="تصدير كشف معاملات الموظف"
      />
    </div>
  );
};

export default EmployeeTransactionsTable;
