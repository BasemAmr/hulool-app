/**
 * EmployeeTransactionsTable - Excel-like grid for displaying employee transactions
 *
 * Uses HuloolDataGrid for consistent styling with:
 * - Proper RTL alignment
 * - Combined confirmed and pending transactions
 * - Colors for debit/credit cells
 * - Active cell bold text
 */

import React, { useMemo, useState, useEffect } from 'react';
import { Edit3, Trash2, Eye, Search, X, RotateCcw, Receipt } from 'lucide-react';
import HuloolDataGrid from '@/shared/grid/HuloolDataGrid';
import { LedgerFinalBalanceCell } from '@/shared/grid';
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

interface PendingCommission {
  id: string;
  item_type: string;
  related_entity: string | null;
  task_id: string | null;
  expected_amount: string;
  status: string;
  notes: string | null;
  created_at: string;
  task_name?: string | null;
  net_earning?: string | null;
  task_status?: string | null;
  client_name?: string | null;
  invoice_id?: string | null;
}

interface EmployeeTransactionsTableProps {
  employeeId?: number;
  transactions?: ConfirmedTransaction[];
  pendingCommissions?: PendingCommission[];
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
  if (rowData.is_pending) {
    return (
      <span className="hulool-cell-content" style={{ justifyContent: 'center' }}>
        <span style={{
          backgroundColor: 'var(--token-status-warning-bg)',
          color: 'var(--token-status-warning-text)',
          padding: '4px 10px',
          borderRadius: '9999px',
          fontSize: '0.875rem',
          fontWeight: 600,
        }}>
          عمولة معلقة
        </span>
      </span>
    );
  }
  const badges: Record<string, { bg: string; text: string; label: string }> = {
    'EMPLOYEE_COMMISSION': { bg: 'var(--token-status-success-bg)', text: 'var(--token-status-success-text)', label: 'عمولة' },
    'EMPLOYEE_PAYOUT': { bg: 'var(--token-status-danger-bg)', text: 'var(--token-status-danger-text)', label: 'صرف' },
    'PAYOUT': { bg: 'var(--token-status-danger-bg)', text: 'var(--token-status-danger-text)', label: 'صرف' },
    'CASHBOX_PAYMENT': { bg: 'var(--token-status-danger-bg)', text: 'var(--token-status-danger-text)', label: 'صرف صندوق' },
    'EMPLOYEE_EXPENSE': { bg: 'var(--token-status-warning-bg)', text: 'var(--token-status-warning-text)', label: 'مصروف' },
    'EMPLOYEE_BORROW': { bg: 'var(--token-status-info-bg)', text: 'var(--token-status-info-text)', label: 'سلفة' },
  };

  const badge = badges[rowData.transaction_type] || (
    rowData.debit_val > 0
      ? { bg: 'var(--token-status-danger-bg)', text: 'var(--token-status-danger-text)', label: 'سند صرف' }
      : { bg: 'var(--token-status-success-bg)', text: 'var(--token-status-success-text)', label: 'سند قبض' }
  );

  return (
    <span className="hulool-cell-content" style={{ justifyContent: 'center' }}>
      <span style={{
        backgroundColor: badge.bg,
        color: badge.text,
        padding: '4px 10px',
        borderRadius: '9999px',
        fontSize: '0.875rem',
        fontWeight: 600,
      }}>
        {badge.label}
      </span>
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
  if (rowData.is_summary || rowData.is_pending) return <span className="hulool-cell-content" />;
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
  pendingCommissions: propPendingCommissions,
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

  const confirmedTransactions: ConfirmedTransaction[] = propTransactions
    ? propTransactions
    : (transactionsData?.data?.confirmed_transactions || []);

  const pendingCommissions: PendingCommission[] = propPendingCommissions
    ? propPendingCommissions
    : (transactionsData?.data?.pending_commissions || []);

  const pagination = transactionsData?.pagination || {};
  const summary = transactionsData?.data?.summary || {};

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

  // Combine confirmed & pending transactions
  const combinedData = useMemo(() => {
    const confirmed = confirmedTransactions.map((t) => ({
      ...t,
      is_pending: false,
      is_summary: false,
      date: t.transaction_date || '',
      debit_val: parseFloat(t.debit || '0'),
      credit_val: parseFloat(t.credit || '0'),
      balance_val: t.balance ? parseFloat(t.balance) : null,
    }));

    const pending = pendingCommissions.map((p) => ({
      ...p,
      is_pending: true,
      is_summary: false,
      transaction_type: 'PENDING_COMMISSION',
      date: p.created_at || '',
      debit_val: parseFloat(p.expected_amount || '0'),
      credit_val: 0,
      balance_val: null,
      description: p.notes || p.task_name || 'عمولة معلقة',
    }));

    const all = [...confirmed, ...pending];
    // Sort descending by date
    all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Append summary row
    const totalDebit = confirmed.reduce((sum, t) => sum + t.debit_val, 0);
    const totalCredit = confirmed.reduce((sum, t) => sum + t.credit_val, 0);
    const finalBalance = summary.balance_due ?? (totalDebit - totalCredit);

    all.unshift({
      id: 'summary',
      is_summary: true,
      is_pending: false,
      date: '',
      transaction_type: '',
      description: 'الإجماليات',
      debit_val: totalDebit,
      credit_val: totalCredit,
      balance_val: finalBalance,
    } as any);

    return all;
  }, [confirmedTransactions, pendingCommissions, summary]);

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
      <div className="bg-bg-surface border border-border-default rounded-xl p-3 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Right: Icon / Title / Count */}
          <div className="flex items-center gap-2.5 shrink-0 min-w-0">
            <div className="shrink-0 text-primary">
              <Receipt size={20} />
            </div>
            <div className="min-w-0">
              <span className="text-sm font-bold text-text-primary">كشف معاملات الموظف</span>
              {pagination.total !== undefined && (
                <span className="text-xs text-text-secondary mr-2 font-normal">
                  ({pagination.total} حركة)
                </span>
              )}
            </div>
          </div>

          {/* Center: Inline Filter Fields */}
          <div className="header-inline-filters flex flex-wrap items-center gap-2 lg:flex-1 lg:justify-center min-w-0">
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

          {/* Left: Balance Display */}
          <div className="flex items-center gap-3 shrink-0 lg:border-s lg:border-border-default lg:ps-4">
            <div className="text-left">
              <p className="text-[10px] text-text-secondary leading-none">الرصيد المستحق</p>
              <p className={`text-base font-black mt-0.5 whitespace-nowrap ${(summary.balance_due ?? 0) < 0 ? 'text-status-danger-text' : 'text-text-brand'}`}>
                {formatCurrency(summary.balance_due ?? 0)}
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Grid Container */}
      <div className="bg-bg-surface rounded-xl border border-border-default shadow-xs overflow-hidden">
        <HuloolDataGrid
          data={combinedData}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="لا توجد معاملات مؤكدة أو معلقة حالياً"
          showId={false}
          height="auto"
          minHeight={400}
          rowClassName={(rowData: any) => {
            if (!rowData) return '';
            if (rowData.is_summary) return 'ledger-summary-row';
            if (rowData.is_pending) return 'bg-amber-50/40 hover:bg-amber-50/70 dark:bg-amber-950/10 dark:hover:bg-amber-950/20';
            return '';
          }}
        />

        {/* Pagination */}
        {pagination.total > perPage && (
          <div className="p-4 flex justify-between items-center border-t border-border-default bg-bg-surface-muted/30">
            <div className="text-text-primary text-sm">
              عرض {((activePage - 1) * perPage) + 1} إلى {Math.min(activePage * perPage, pagination.total)} من {pagination.total} حركة
            </div>
            <div className="inline-flex gap-2">
              <button
                type="button"
                onClick={() => handlePageChange(activePage - 1)}
                disabled={activePage <= 1}
                className="px-3 py-1 text-sm border border-border-default rounded-md hover:bg-accent disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                السابق
              </button>
              <button
                type="button"
                onClick={() => handlePageChange(activePage + 1)}
                disabled={activePage >= Math.ceil(pagination.total / perPage)}
                className="px-3 py-1 text-sm border border-border-default rounded-md hover:bg-accent disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                التالي
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeTransactionsTable;
