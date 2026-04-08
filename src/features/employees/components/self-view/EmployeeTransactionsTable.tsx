/**
 * EmployeeTransactionsTable - Excel-like grid for displaying employee transactions
 * 
 * Uses HuloolDataGrid for consistent styling with:
 * - Credit (green), Debit (red) coloring
 * - Direction-based row coloring
 * - Pending transaction highlighting
 * - Uneditable cells
 * - Arabic Cairo font
 */

import React, { useMemo } from 'react';
import { formatDate } from '@/shared/utils/dateUtils';
import { formatCurrency } from '@/shared/utils/formatUtils';
import { FileText, Clock } from 'lucide-react';
import HuloolDataGrid from '@/shared/grid/HuloolDataGrid';
import type { HuloolGridColumn } from '@/shared/grid/HuloolDataGrid';
import type { CellProps } from 'react-datasheet-grid';
import type { EmployeeTransaction } from '@/features/employees/api/employeeFinancialQueries';

interface EmployeeTransactionsTableProps {
  transactions: EmployeeTransaction[];
  isLoading: boolean;
  highlightTransactionId?: string;
}

// Removed useNavigate - not needed for display-only table

// ================================
// HELPER FUNCTIONS
// ================================

const isPendingTransaction = (transaction: EmployeeTransaction): boolean => {
  return transaction.is_pending || 
    (transaction.direction === 'CREDIT' && 
      (parseFloat(transaction.amount) === 0 || 
       transaction.transaction_name?.startsWith('Pending:')));
};

// ================================
// CUSTOM CELL COMPONENTS
// ================================

// Client/Task Cell
const ClientTaskCell = React.memo(({ rowData }: CellProps<EmployeeTransaction>) => {
  return (
    <div style={{ textAlign: 'center' }}>
      {rowData.client_name && (
        <span style={{ fontWeight: 500, fontSize: '0.9em', color: 'var(--token-text-primary)' }}>
          {rowData.client_name}
        </span>
      )}
      {rowData.task_name && (
        <div>
          <span style={{ fontSize: '0.8em', color: 'var(--token-text-primary)' }}>
            {rowData.task_name}
          </span>
        </div>
      )}
      {!rowData.client_name && !rowData.task_name && (
        <span style={{ fontSize: '0.8em', color: 'var(--token-text-primary)' }}>
          معاملة عامة
        </span>
      )}
    </div>
  );
});
ClientTaskCell.displayName = 'ClientTaskCell';

// Task Amount Cell
const TaskAmountCell = React.memo(({ rowData }: CellProps<EmployeeTransaction>) => {
  return (
    <div style={{ textAlign: 'center', color: 'var(--token-text-primary)' }}>
      {rowData.task_amount ? (
        <>{formatCurrency(parseFloat(rowData.task_amount))} ر.س</>
      ) : (
        <span style={{ color: 'var(--token-text-primary)' }}>—</span>
      )}
    </div>
  );
});
TaskAmountCell.displayName = 'TaskAmountCell';

// Credit (Received) Cell
const CreditCell = React.memo(({ rowData }: CellProps<EmployeeTransaction>) => {
  const isPending = isPendingTransaction(rowData);
  
  if (isPending) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: 'var(--token-status-warning-text)', fontWeight: 500 }}>
        <Clock size={14} />
        قيد الانتظار
      </div>
    );
  }
  
  return (
    <div style={{ textAlign: 'center', fontWeight: 700, color: 'var(--token-text-primary)' }}>
      {rowData.direction === 'CREDIT' && rowData.amount ? (
        <>{formatCurrency(parseFloat(rowData.amount))} ر.س</>
      ) : (
        <span style={{ color: 'var(--token-text-primary)' }}>—</span>
      )}
    </div>
  );
});
CreditCell.displayName = 'CreditCell';

// Debit (Paid Out) Cell
const DebitCell = React.memo(({ rowData }: CellProps<EmployeeTransaction>) => {
  return (
    <div style={{ textAlign: 'center', fontWeight: 700, color: 'var(--token-text-primary)' }}>
      {rowData.direction === 'DEBIT' && rowData.amount ? (
        <>{formatCurrency(parseFloat(rowData.amount))} ر.س</>
      ) : (
        <span style={{ color: 'var(--token-text-primary)' }}>—</span>
      )}
    </div>
  );
});
DebitCell.displayName = 'DebitCell';

// Balance Cell
const BalanceCell = React.memo(({ rowData }: CellProps<EmployeeTransaction>) => {
  return (
    <div style={{ textAlign: 'center', fontWeight: 500, color: 'var(--token-text-primary)' }}>
      {rowData.balance ? (
        <>{formatCurrency(parseFloat(rowData.balance))} ر.س</>
      ) : (
        <span style={{ color: 'var(--token-text-primary)' }}>—</span>
      )}
    </div>
  );
});
BalanceCell.displayName = 'BalanceCell';

// Date Cell
const DateCell = React.memo(({ rowData }: CellProps<EmployeeTransaction>) => {
  return (
    <div style={{ textAlign: 'center', fontSize: '0.8em', color: 'var(--token-text-primary)' }}>
      {formatDate(rowData.transaction_date).replace(/\/20/, '/')}
    </div>
  );
});
DateCell.displayName = 'DateCell';

// Status Cell
const StatusCell = React.memo(({ rowData }: CellProps<EmployeeTransaction>) => {
  const isPending = isPendingTransaction(rowData);
  
  if (isPending) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '2px 8px',
          fontSize: '0.75rem',
          fontWeight: 500,
          backgroundColor: 'var(--token-status-warning-bg)',
          color: 'var(--token-status-warning-text)',
          borderRadius: '4px',
        }}>
          قيد الانتظار
        </span>
      </div>
    );
  }
  
  if (rowData.direction === 'CREDIT') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '2px 8px',
          fontSize: '0.75rem',
          fontWeight: 500,
          backgroundColor: 'var(--token-status-success-bg)',
          color: 'var(--token-status-success-text)',
          borderRadius: '4px',
        }}>
          عمولة
        </span>
      </div>
    );
  }
  
  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        fontSize: '0.75rem',
        fontWeight: 500,
        backgroundColor: 'var(--token-status-danger-bg)',
        color: 'var(--token-status-danger-text)',
        borderRadius: '4px',
      }}>
        صرف
      </span>
    </div>
  );
});
StatusCell.displayName = 'StatusCell';

// Notes Cell
const NotesCell = React.memo(({ rowData }: CellProps<EmployeeTransaction>) => {
  return (
    <div style={{ textAlign: 'center', fontSize: '0.9em', color: 'var(--token-text-primary)' }}>
      {rowData.notes || rowData.transaction_name || '—'}
    </div>
  );
});
NotesCell.displayName = 'NotesCell';

// ================================
// DIRECTION-BASED ROW COLORS
// ================================

const TRANSACTION_COLORS = {
  CREDIT: {
    base: 'color-mix(in srgb, var(--primitive-green-600) 9%, var(--token-bg-page))',
    alternate: 'color-mix(in srgb, var(--primitive-green-600) 16%, var(--token-bg-page))',
  },
  DEBIT: {
    base: 'color-mix(in srgb, var(--primitive-red-600) 9%, var(--token-bg-page))',
    alternate: 'color-mix(in srgb, var(--primitive-red-600) 16%, var(--token-bg-page))',
  },
  PENDING: {
    base: 'color-mix(in srgb, var(--primitive-amber-600) 9%, var(--token-bg-page))',
    alternate: 'color-mix(in srgb, var(--primitive-amber-600) 16%, var(--token-bg-page))',
  },
};

// ================================
// MAIN COMPONENT
// ================================

const EmployeeTransactionsTable: React.FC<EmployeeTransactionsTableProps> = ({
  transactions,
  isLoading,
  highlightTransactionId: _highlightTransactionId,
}) => {
  const neutralActionButtonClass = 'inline-flex items-center justify-center rounded p-1.5 text-text-secondary hover:text-text-primary cursor-pointer transition-colors duration-150';
  const destructiveActionButtonClass = 'inline-flex items-center justify-center rounded p-1.5 text-text-secondary hover:text-text-danger cursor-pointer transition-colors duration-150';

  // Note: highlightTransactionId is reserved for future row highlighting feature

  const totals = useMemo(() => {
    const totalCredit = transactions.reduce((sum, transaction) => {
      if (isPendingTransaction(transaction)) return sum;
      const amount = parseFloat(transaction.amount) || 0;
      return sum + (transaction.direction === 'CREDIT' ? amount : 0);
    }, 0);

    const totalDebit = transactions.reduce((sum, transaction) => {
      if (isPendingTransaction(transaction)) return sum;
      const amount = parseFloat(transaction.amount) || 0;
      return sum + (transaction.direction === 'DEBIT' ? amount : 0);
    }, 0);

    const netBalance = totalCredit - totalDebit;
    const pendingCount = transactions.filter((transaction) => isPendingTransaction(transaction)).length;

    return { totalCredit, totalDebit, netBalance, pendingCount };
  }, [transactions]);

  const columns = useMemo((): HuloolGridColumn<EmployeeTransaction>[] => [
    {
      id: 'clientTask',
      key: 'client_name',
      title: 'العميل/المهمة',
      type: 'custom',
      component: ClientTaskCell,
      grow: 1,
    },
    {
      id: 'taskAmount',
      key: 'task_amount',
      title: 'مبلغ المهمة',
      type: 'custom',
      component: TaskAmountCell,
      grow: 0,
    },
    {
      id: 'credit',
      key: 'amount',
      title: 'المستلم',
      type: 'custom',
      component: CreditCell,
      grow: 0,
    },
    {
      id: 'debit',
      key: 'amount',
      title: 'المدفوع',
      type: 'custom',
      component: DebitCell,
      grow: 0,
    },
    {
      id: 'balance',
      key: 'balance',
      title: 'الرصيد',
      type: 'custom',
      component: BalanceCell,
      grow: 0,
    },
    {
      id: 'date',
      key: 'transaction_date',
      title: 'التاريخ',
      type: 'custom',
      component: DateCell,
      grow: 0,
    },
    {
      id: 'status',
      key: 'direction',
      title: 'الحالة',
      type: 'custom',
      component: StatusCell,
      grow: 0,
    },
    {
      id: 'notes',
      key: 'notes',
      title: 'الملاحظات',
      type: 'custom',
      component: NotesCell,
      grow: 2,
    },
  ], []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-5">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <span className="mr-2 text-text-primary">جاري التحميل...</span>
      </div>
    );
  }

  if (!transactions.length) {
    return (
      <div className="text-center p-5 text-text-primary">
        <FileText size={48} className="mb-3 text-text-secondary mx-auto" />
        <p className="mb-0">لا توجد معاملات مالية</p>
      </div>
    );
  }

  return (
    <div className="w-full" dir="rtl" style={{ minHeight: '400px' }}>
      <HuloolDataGrid
        data={transactions}
        columns={columns}
        isLoading={false}
        showId={false}
        typeField="direction"
      />

      <div className="rounded-lg border border-border bg-background mt-2 p-3">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div className="flex flex-col items-center">
            <span className="text-sm text-text-secondary">إجمالي المستلم</span>
            <span className="font-bold text-text-primary">{formatCurrency(totals.totalCredit)} ر.س</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-sm text-text-secondary">إجمالي المدفوع</span>
            <span className="font-bold text-text-primary">{formatCurrency(totals.totalDebit)} ر.س</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-sm text-text-secondary">صافي الرصيد</span>
            <span className={`font-bold ${totals.netBalance < 0 ? 'text-status-danger-text' : 'text-text-primary'}`}>
              {formatCurrency(Math.abs(totals.netBalance))} ر.س
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-sm text-text-secondary">الحالة</span>
            {totals.pendingCount > 0 ? (
              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-background text-text-primary rounded border border-border">
                {totals.pendingCount} معلق
              </span>
            ) : (
              <span className="text-sm text-text-primary">
                {totals.netBalance > 0 ? 'رصيد موجب' : totals.netBalance < 0 ? 'رصيد سالب' : 'رصيد متوازن'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeTransactionsTable;
