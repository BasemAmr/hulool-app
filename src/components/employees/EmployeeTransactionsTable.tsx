import React, { useMemo } from 'react';
import { Edit, Trash2 } from 'lucide-react';
import { useModalStore } from '../../stores/modalStore';
import { useGetEmployeeTransactions, useGetEmployee } from '../../queries/employeeQueries';
import { useCurrentUserCapabilities } from '../../queries/userQueries';
import type { CellProps } from 'react-datasheet-grid';
import HuloolDataGrid from '../grid/HuloolDataGrid';
import type { HuloolGridColumn } from '../grid/HuloolDataGrid';
import GridActionBar from '../grid/GridActionBar';
import type { GridAction } from '../grid/GridActionBar';

// Confirmed transaction from ledger
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
  task_type?: string | null;
  client_name?: string | null;
}

// Legacy transaction format (for backward compatibility)
interface LegacyTransaction {
  id: string;
  employee_user_id?: string;
  transaction_name: string;
  direction: 'CREDIT' | 'DEBIT';
  amount: string | null;
  related_task_id: string | null;
  task_amount: string | null;
  notes: string;
  transaction_date: string;
  created_at?: string;
  task_name?: string | null;
  client_id?: string | null;
  client_name?: string | null;
  balance?: string | null;
  is_pending?: boolean;
  source?: 'new_ledger' | 'legacy';
  transaction_type?: string;
}

interface EmployeeTransactionsTableProps {
  employeeId?: number;
  transactions?: ConfirmedTransaction[];
  isLoading?: boolean;
  page?: number;
  perPage?: number;
  onPageChange?: (page: number) => void;
  onEdit?: (transaction: ConfirmedTransaction | LegacyTransaction) => void;
  onDelete?: (transaction: ConfirmedTransaction | LegacyTransaction) => void;
}

// ================================
// CUSTOM CELL COMPONENTS
// ================================

/** Task Type Cell */
const TaskTypeCell = React.memo(({ rowData, active }: CellProps<ConfirmedTransaction>) => {
  const taskTypeMap: Record<string, string> = {
    'Government': 'حكومي',
    'RealEstate': 'عقارات',
    'Accounting': 'محاسبي',
    'Other': 'أخرى',
  };

  const transactionTypeMap: Record<string, string> = {
    'EMPLOYEE_PAYOUT': 'صرف',
    'EMPLOYEE_BORROW': 'سلفة',
    'EMPLOYEE_EXPENSE': 'مصروف',
    'EMPLOYEE_BONUS': 'مكافأة',
    'EMPLOYEE_COMMISSION': 'عمولة',
  };

  const value = rowData.task_type;
  const label = value ? (taskTypeMap[value] || value) : (transactionTypeMap[rowData.transaction_type] || rowData.transaction_type);

  return (
    <span
      className="hulool-cell-content"
      style={{
        fontWeight: 700,
        color: '#000000',
        justifyContent: 'center',
        textAlign: 'center'
      }}
    >
      {label}
    </span>
  );
});
TaskTypeCell.displayName = 'TaskTypeCell';

/** Combined Description Cell */
const CombinedDescriptionCell = React.memo(({ rowData }: CellProps<ConfirmedTransaction>) => {
  const isEarning = parseFloat(rowData.debit || '0') > 0;
  const prefix = rowData.task_name ? rowData.task_name : (isEarning ? 'سند قبض' : 'سند صرف');

  return (
    <div
      className="hulool-cell-content"
      style={{
        fontWeight: 700,
        color: '#000000',
        display: 'flex',
        gap: '4px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}
    >
      <span style={{ flexShrink: 0 }}>{prefix}</span>
      {rowData.description && (
        <span style={{ opacity: 0.9, fontWeight: 700 }}> - {rowData.description}</span>
      )}
    </div>
  );
});
CombinedDescriptionCell.displayName = 'CombinedDescriptionCell';

/** Amount Cell with Directional Color */
const TransactionAmountCell = React.memo(({ rowData }: CellProps<ConfirmedTransaction>) => {
  const debit = parseFloat(rowData.debit || '0');
  const credit = parseFloat(rowData.credit || '0');
  const amount = debit > 0 ? debit : credit;
  const isPositive = debit > 0;

  return (
    <div
      className="hulool-cell-content"
      style={{
        fontWeight: 700,
        color: isPositive ? '#16a34a' : '#dc2626',
        justifyContent: 'center',
        textAlign: 'center'
      }}
    >
      {isPositive ? '+' : '-'}{amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </div>
  );
});
TransactionAmountCell.displayName = 'TransactionAmountCell';

/** Balance Cell */
const BalanceCell = React.memo(({ rowData }: CellProps<ConfirmedTransaction>) => {
  const balance = parseFloat(rowData.balance || '0');
  return (
    <div
      className="hulool-cell-content"
      style={{
        fontWeight: 700,
        color: '#000000',
        justifyContent: 'center',
        textAlign: 'center'
      }}
    >
      {balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </div>
  );
});
BalanceCell.displayName = 'BalanceCell';

/** Transaction Date Cell */
const TransactionDateCell = React.memo(({ rowData }: CellProps<ConfirmedTransaction>) => {
  const date = rowData.transaction_date ? new Date(rowData.transaction_date) : null;
  const formattedDate = date && !isNaN(date.getTime())
    ? date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—';

  return (
    <div
      className="hulool-cell-content"
      style={{
        fontWeight: 700,
        color: '#000000',
        justifyContent: 'center',
        textAlign: 'center'
      }}
    >
      {formattedDate}
    </div>
  );
});
TransactionDateCell.displayName = 'TransactionDateCell';

/** Actions Cell */
const TransactionActionsCell = React.memo(({ rowData, rowIndex, columnData }: CellProps<ConfirmedTransaction, any>) => {
  const { onEdit, onDelete, canEdit } = columnData;
  if (!canEdit) return null;

  const actions: GridAction<ConfirmedTransaction>[] = [
    {
      type: 'edit',
      onClick: (item) => onEdit(item),
      title: 'تعديل'
    },
    {
      type: 'delete',
      onClick: (item) => onDelete(item),
      title: 'حذف'
    }
  ];

  return <GridActionBar item={rowData} index={rowIndex} actions={actions} />;
});
TransactionActionsCell.displayName = 'TransactionActionsCell';

// ================================
// MAIN COMPONENT
// ================================

const EmployeeTransactionsTable: React.FC<EmployeeTransactionsTableProps> = ({
  employeeId,
  transactions: propTransactions,
  isLoading: propIsLoading,
  page = 1,
  perPage = 10,
  onPageChange,
  onEdit,
  onDelete,
}) => {
  const { openModal } = useModalStore();
  const { data: capabilities } = useCurrentUserCapabilities();
  const canEdit = capabilities?.manage_options || false;

  // Fetch employee transactions
  const {
    data: transactionsData,
    isLoading: isQueryLoading,
  } = useGetEmployeeTransactions(employeeId as number, { page, per_page: perPage });

  const isLoading = propIsLoading !== undefined ? propIsLoading : isQueryLoading;

  // Extract confirmed transactions
  const confirmedTransactions: ConfirmedTransaction[] = useMemo(() => {
    return propTransactions
      ? propTransactions
      : (transactionsData?.data?.confirmed_transactions || []);
  }, [propTransactions, transactionsData]);

  const pagination = transactionsData?.pagination || {};

  const handleEditTransaction = (transaction: ConfirmedTransaction | LegacyTransaction) => {
    if (onEdit) {
      onEdit(transaction);
      return;
    }
    openModal('transactionEdit', { transaction });
  };

  const handleDeleteTransaction = (transaction: ConfirmedTransaction | LegacyTransaction) => {
    if (onDelete) {
      onDelete(transaction);
      return;
    }
    openModal('transactionDelete', { transaction });
  };

  // Define Columns
  const columns = useMemo((): HuloolGridColumn<ConfirmedTransaction>[] => [
    {
      id: 'date',
      title: 'التاريخ',
      key: 'transaction_date',
      type: 'date',
      width: 120,
      grow: 0
    },
    {
      id: 'type',
      title: 'نوع المهمة',
      key: 'task_type',
      component: TaskTypeCell,
      width: 120,
      grow: 0
    },
    {
      id: 'description',
      title: 'الوصف والملاحظات',
      key: 'description',
      component: CombinedDescriptionCell,
      grow: 1
    },
    {
      id: 'amount',
      title: 'المبلغ',
      key: 'debit',
      component: TransactionAmountCell,
      width: 120,
      grow: 0
    },
    {
      id: 'balance',
      title: 'الرصيد',
      key: 'balance',
      component: BalanceCell,
      width: 120,
      grow: 0
    },
    {
      id: 'actions',
      title: 'الإجراءات',
      key: 'id',
      component: TransactionActionsCell,
      width: 100,
      grow: 0,
      columnData: {
        onEdit: handleEditTransaction,
        onDelete: handleDeleteTransaction,
        canEdit
      }
    }
  ], [canEdit, handleEditTransaction, handleDeleteTransaction]);

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="mt-2 text-gray-500">جاري تحميل المعاملات...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <HuloolDataGrid
          data={confirmedTransactions}
          columns={columns}
          height="auto"
          minHeight={300}
          emptyMessage="لا توجد معاملات مؤكدة حالياً"
          showId={false}
        />
      </div>

      {/* Pagination */}
      {pagination.total > perPage && (
        <div className="flex justify-between items-center px-4 py-3 bg-white rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600 font-bold">
            عرض {((page - 1) * perPage) + 1} إلى {Math.min(page * perPage, pagination.total)} من أصل {pagination.total} معاملة
          </div>
          <div className="flex gap-2">
            <button
              className="px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={page <= 1}
              onClick={() => onPageChange?.(page - 1)}
            >
              السابق
            </button>
            <button
              className="px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={page >= Math.ceil(pagination.total / perPage)}
              onClick={() => onPageChange?.(page + 1)}
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
