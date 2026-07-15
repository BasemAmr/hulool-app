/**
 * EmployeeTransactionsTable - Excel-like grid for displaying employee transactions
 *
 * Uses HuloolDataGrid for consistent styling with:
 * - Proper RTL alignment
 * - Combined confirmed and pending transactions
 * - Colors for debit/credit cells
 * - Active cell bold text
 */

import React, { useMemo } from 'react';
import { Edit3, Trash2 } from 'lucide-react';
import HuloolDataGrid from '@/shared/grid/HuloolDataGrid';
import type { HuloolGridColumn } from '@/shared/grid/HuloolDataGrid';
import type { CellProps } from 'react-datasheet-grid';
import { useModalStore } from '@/shared/stores/modalStore';
import { useGetEmployeeTransactions, useGetEmployee } from '@/features/employees/api/employeeQueries';
import { useCurrentUserCapabilities } from '@/features/employees/api/userQueries';
import { useAuthStore } from '@/features/auth/store/authStore';
import { formatDate } from '@/shared/utils/dateUtils';

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

  const badge = badges[rowData.transaction_type] || {
    bg: 'var(--token-status-neutral-bg)',
    text: 'var(--token-text-primary)',
    label: rowData.transaction_type || 'أخرى',
  };

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
    <span className="hulool-cell-content" style={{ justifyContent: 'center', color: 'inherit', fontWeight: active ? 700 : 500 }}>
      {amount > 0 ? formatCurrency(amount) : '—'}
    </span>
  );
});
DebitCell.displayName = 'DebitCell';

// Credit Cell
const CreditCell = React.memo(({ rowData, active }: CellProps<any>) => {
  const amount = rowData.credit_val;
  return (
    <span className="hulool-cell-content" style={{ justifyContent: 'center', color: 'inherit', fontWeight: active ? 700 : 500 }}>
      {amount > 0 ? formatCurrency(amount) : '—'}
    </span>
  );
});
CreditCell.displayName = 'CreditCell';

// Balance Cell
const BalanceCell = React.memo(({ rowData, active }: CellProps<any>) => {
  const balance = rowData.balance_val;
  if (balance === null || balance === undefined) {
    return <span className="hulool-cell-content" style={{ justifyContent: 'center', color: 'var(--token-text-secondary)' }}>—</span>;
  }
  return (
    <span className="hulool-cell-content" style={{ justifyContent: 'center', fontWeight: active ? 800 : 700, color: balance < 0 ? 'var(--token-text-danger)' : 'var(--token-text-primary)' }}>
      {formatCurrency(balance)}
    </span>
  );
});
BalanceCell.displayName = 'BalanceCell';

// Actions Cell
interface ActionsCellData {
  canEdit: boolean;
  onEdit: (transaction: any) => void;
  onDelete: (transaction: any) => void;
}

const ActionsCell = React.memo(({ rowData, columnData }: CellProps<any, ActionsCellData>) => {
  if (rowData.is_summary || rowData.is_pending) return <span className="hulool-cell-content" />;
  const { canEdit, onEdit, onDelete } = columnData || {};

  if (!canEdit) return <span className="hulool-cell-content" />;

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
        onClick={(e) => { e.stopPropagation(); onEdit?.(rowData); }}
        className="inline-flex items-center justify-center rounded p-1.5 text-text-secondary hover:text-text-primary cursor-pointer transition-colors duration-150"
        title="تعديل"
      >
        <Edit3 size={14} />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete?.(rowData); }}
        className="inline-flex items-center justify-center rounded p-1.5 text-text-secondary hover:text-text-danger cursor-pointer transition-colors duration-150"
        title="حذف"
      >
        <Trash2 size={14} />
      </button>
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

  // Fetch employee transactions if not provided via props
  const {
    data: transactionsData,
    isLoading: isQueryLoading,
  } = useGetEmployeeTransactions(employeeId as number, { page, per_page: perPage });

  const isLoading = propIsLoading !== undefined ? propIsLoading : isQueryLoading;

  const confirmedTransactions: ConfirmedTransaction[] = propTransactions
    ? propTransactions
    : (transactionsData?.data?.confirmed_transactions || []);

  const pendingCommissions: PendingCommission[] = propPendingCommissions
    ? propPendingCommissions
    : (transactionsData?.data?.pending_commissions || []);

  const pagination = transactionsData?.pagination || {};
  const summary = transactionsData?.data?.summary || {};

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
      date: t.transaction_date || t.created_at || '',
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

    all.push({
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
        if (rowData.is_summary) return '';
        return rowData.debit_val > 0 ? 'employee-debit-cell' : '';
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
        if (rowData.is_summary) return '';
        return rowData.credit_val > 0 ? 'employee-credit-cell' : '';
      }
    },
    {
      id: 'balance',
      key: 'balance_val',
      title: 'الرصيد',
      type: 'custom',
      component: BalanceCell,
      grow: 1,
    },
    {
      id: 'actions',
      key: 'id',
      title: 'الإجراءات',
      type: 'custom',
      component: ActionsCell as React.ComponentType<CellProps<any>>,
      columnData: {
        canEdit,
        onEdit: handleEditTransaction,
        onDelete: handleDeleteTransaction,
      },
      width: 100,
      grow: 0,
    },
  ], [canEdit]);

  if (isLoading) {
    return <div className="p-4 text-center">Loading transactions...</div>;
  }

  return (
    <div className="employee-transactions-wrapper" dir="rtl">
      <HuloolDataGrid
        data={combinedData}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="لا توجد معاملات مؤكدة أو معلقة حالياً"
        showId={false}
        height="auto"
        minHeight={400}
        rowClassName={(rowData) => {
          if (!rowData) return '';
          if (rowData.is_summary) return 'ledger-summary-row';
          if (rowData.is_pending) return 'bg-amber-50/40 hover:bg-amber-50/70 dark:bg-amber-950/10 dark:hover:bg-amber-950/20';
          return '';
        }}
      />

      {/* Pagination */}
      {pagination.total > perPage && onPageChange && (
        <div className="p-4 flex justify-between items-center border-t border-border bg-card">
          <div className="text-text-primary text-sm">
            عرض {((page - 1) * perPage) + 1} إلى {Math.min(page * perPage, pagination.total)} من {pagination.total} معاملة
          </div>
          <div className="inline-flex gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1 text-sm border rounded hover:bg-accent disabled:opacity-50"
            >
              السابق
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= Math.ceil(pagination.total / perPage)}
              className="px-3 py-1 text-sm border rounded hover:bg-accent disabled:opacity-50"
            >
              التالي
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeTransactionsTable;
