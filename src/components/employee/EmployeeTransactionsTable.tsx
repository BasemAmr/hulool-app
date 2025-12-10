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
import { formatDate } from '../../utils/dateUtils';
import { formatCurrency } from '../../utils/formatUtils';
import { FileText, Clock } from 'lucide-react';
import HuloolDataGrid from '../grid/HuloolDataGrid';
import type { HuloolGridColumn } from '../grid/HuloolDataGrid';
import type { CellProps } from 'react-datasheet-grid';
import type { EmployeeTransaction } from '../../queries/employeeFinancialQueries';

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
        <span style={{ fontWeight: 500, fontSize: '0.9em', color: '#000000' }}>
          {rowData.client_name}
        </span>
      )}
      {rowData.task_name && (
        <div>
          <span style={{ fontSize: '0.8em', color: '#000000' }}>
            {rowData.task_name}
          </span>
        </div>
      )}
      {!rowData.client_name && !rowData.task_name && (
        <span style={{ fontSize: '0.8em', color: '#6b7280' }}>
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
    <div style={{ textAlign: 'center', color: '#000000' }}>
      {rowData.task_amount ? (
        <>{formatCurrency(parseFloat(rowData.task_amount))} ر.س</>
      ) : (
        <span style={{ color: '#6b7280' }}>—</span>
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: '#d97706', fontWeight: 500 }}>
        <Clock size={14} />
        قيد الانتظار
      </div>
    );
  }
  
  return (
    <div style={{ textAlign: 'center', fontWeight: 700, color: '#16a34a' }}>
      {rowData.direction === 'CREDIT' && rowData.amount ? (
        <>{formatCurrency(parseFloat(rowData.amount))} ر.س</>
      ) : (
        <span style={{ color: '#6b7280' }}>—</span>
      )}
    </div>
  );
});
CreditCell.displayName = 'CreditCell';

// Debit (Paid Out) Cell
const DebitCell = React.memo(({ rowData }: CellProps<EmployeeTransaction>) => {
  return (
    <div style={{ textAlign: 'center', fontWeight: 700, color: '#dc2626' }}>
      {rowData.direction === 'DEBIT' && rowData.amount ? (
        <>{formatCurrency(parseFloat(rowData.amount))} ر.س</>
      ) : (
        <span style={{ color: '#6b7280' }}>—</span>
      )}
    </div>
  );
});
DebitCell.displayName = 'DebitCell';

// Balance Cell
const BalanceCell = React.memo(({ rowData }: CellProps<EmployeeTransaction>) => {
  return (
    <div style={{ textAlign: 'center', fontWeight: 500, color: '#000000' }}>
      {rowData.balance ? (
        <>{formatCurrency(parseFloat(rowData.balance))} ر.س</>
      ) : (
        <span style={{ color: '#6b7280' }}>—</span>
      )}
    </div>
  );
});
BalanceCell.displayName = 'BalanceCell';

// Date Cell
const DateCell = React.memo(({ rowData }: CellProps<EmployeeTransaction>) => {
  return (
    <div style={{ textAlign: 'center', fontSize: '0.8em', color: '#000000' }}>
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
          backgroundColor: 'rgb(254 243 199)',
          color: 'rgb(146 64 14)',
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
          backgroundColor: 'rgb(220 252 231)',
          color: 'rgb(22 101 52)',
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
        backgroundColor: 'rgb(254 226 226)',
        color: 'rgb(153 27 27)',
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
    <div style={{ textAlign: 'center', fontSize: '0.9em', color: '#000000' }}>
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
    base: 'rgba(40, 167, 69, 0.08)',
    alternate: 'rgba(40, 167, 69, 0.15)',
  },
  DEBIT: {
    base: 'rgba(220, 53, 69, 0.08)',
    alternate: 'rgba(220, 53, 69, 0.15)',
  },
  PENDING: {
    base: 'rgba(245, 158, 11, 0.08)',
    alternate: 'rgba(245, 158, 11, 0.15)',
  },
};

// ================================
// MAIN COMPONENT
// ================================

const EmployeeTransactionsTable: React.FC<EmployeeTransactionsTableProps> = ({ 
  transactions, 
  isLoading,
  highlightTransactionId: _highlightTransactionId
}) => {
  // Note: highlightTransactionId is reserved for future row highlighting feature

  // Calculate totals
  const totals = useMemo(() => {
    const totalCredit = transactions.reduce((sum, t) => {
      if (isPendingTransaction(t)) return sum;
      const amount = parseFloat(t.amount) || 0;
      return sum + (t.direction === 'CREDIT' ? amount : 0);
    }, 0);
    
    const totalDebit = transactions.reduce((sum, t) => {
      if (isPendingTransaction(t)) return sum;
      const amount = parseFloat(t.amount) || 0;
      return sum + (t.direction === 'DEBIT' ? amount : 0);
    }, 0);
    
    const netBalance = totalCredit - totalDebit;
    const pendingCount = transactions.filter(t => isPendingTransaction(t)).length;
    
    return { totalCredit, totalDebit, netBalance, pendingCount };
  }, [transactions]);

  // Define columns
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
        <span className="mr-2 text-black">جاري التحميل...</span>
      </div>
    );
  }

  if (!transactions.length) {
    return (
      <div className="text-center p-5 text-black">
        <FileText size={48} className="mb-3 opacity-50 mx-auto" />
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
        typeColors={{
          CREDIT: TRANSACTION_COLORS.CREDIT,
          DEBIT: TRANSACTION_COLORS.DEBIT,
        }}
      />

      {/* Totals Footer */}
      <div className="rounded-lg border border-border bg-gray-50 mt-2 p-3">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div className="flex flex-col items-center">
            <span className="text-sm text-gray-600">إجمالي المستلم</span>
            <span className="font-bold text-green-600">{formatCurrency(totals.totalCredit)} ر.س</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-sm text-gray-600">إجمالي المدفوع</span>
            <span className="font-bold text-red-600">{formatCurrency(totals.totalDebit)} ر.س</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-sm text-gray-600">صافي الرصيد</span>
            <span className={`font-bold ${totals.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(Math.abs(totals.netBalance))} ر.س
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-sm text-gray-600">الحالة</span>
            {totals.pendingCount > 0 ? (
              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded">
                {totals.pendingCount} معلق
              </span>
            ) : (
              <span className="text-sm text-black">
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
