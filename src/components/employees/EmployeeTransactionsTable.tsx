import React from 'react';
import { Edit, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import Button from '../ui/Button';
import { useToast } from '../../hooks/useToast';
import { useModalStore } from '../../stores/modalStore';
import { useGetEmployeeTransactions, useDeleteEmployeeTransaction, useGetEmployee } from '../../queries/employeeQueries';
import { formatCurrency, formatDate } from '../../utils/formatUtils';

interface EmployeeTransaction {
  id: string;
  employee_user_id: string;
  transaction_name: string;
  direction: 'CREDIT' | 'DEBIT';
  amount: string | null;
  related_task_id: string | null;
  task_amount: string | null;
  notes: string;
  transaction_date: string;
  created_at: string;
  task_name?: string | null;
  client_id?: string | null;
  client_name?: string | null;
}

interface EmployeeTransactionsTableProps {
  employeeId: number;
  page: number;
  perPage: number;
  onPageChange: (page: number) => void;
}

const EmployeeTransactionsTable: React.FC<EmployeeTransactionsTableProps> = ({
  employeeId,
  page,
  perPage,
  onPageChange,
}) => {
  const { success, error } = useToast();
  const { openModal } = useModalStore();

  // Fetch employee data
  const { data: employee } = useGetEmployee(employeeId);
  
  // Fetch employee transactions
  const { 
    data: transactionsData, 
    isLoading, 
    refetch 
  } = useGetEmployeeTransactions(employeeId, { page, per_page: perPage });

  const deleteTransactionMutation = useDeleteEmployeeTransaction();

  const transactions = transactionsData?.data?.transactions || [];
  const pagination = transactionsData?.pagination || {};

  const handleEditTransaction = (transaction: EmployeeTransaction) => {
    if (transaction.related_task_id) {
      // This is a task-related commission, edit the expense amount
      openModal('editTaskExpense', { 
        task: {} as any, // We'll need to fetch task details or modify modal interface
        transaction
      });
    } else {
      // This is a payout transaction, edit the payout
      if (employee) {
        openModal('editEmployeePayout', { 
          employee: { ...employee, id: employeeId }, // Include the table ID
          transaction
        });
      }
    }
  };

  const handleDeleteTransaction = async (transaction: EmployeeTransaction) => {
    // Only allow deletion of payout transactions (not task-related commissions)
    if (transaction.related_task_id) {
      error('Cannot delete commission transactions. These are managed through task approval.');
      return;
    }

    if (!confirm('Are you sure you want to delete this payout transaction? This action cannot be undone.')) {
      return;
    }

    if (!employee) {
      error('Employee data not loaded');
      return;
    }

    try {
      await deleteTransactionMutation.mutateAsync({
        employeeTableId: employeeId,
        employeeUserId: employee.user_id,
        transactionId: parseInt(transaction.id, 10)
      });
      success('Transaction deleted successfully');
      await refetch();
    } catch (err: any) {
      error(err.message || 'Failed to delete transaction');
    }
  };

  const getTransactionIcon = (transaction: EmployeeTransaction) => {
    if (transaction.direction === 'CREDIT') {
      return <TrendingUp size={16} className="text-success" />;
    } else {
      return <TrendingDown size={16} className="text-danger" />;
    }
  };

  const getTransactionAmount = (transaction: EmployeeTransaction) => {
    if (transaction.direction === 'CREDIT') {
      // For credit transactions (commissions), show the actual commission amount
      return transaction.amount ? `+${formatCurrency(parseFloat(transaction.amount))}` : 'قيد المراجعة';
    } else {
      // For debit transactions (payouts), show the amount
      return transaction.amount ? `-${formatCurrency(parseFloat(transaction.amount))}` : '0';
    }
  };

  if (isLoading) {
    return <div className="p-4 text-center">Loading transactions...</div>;
  }

  return (
    <div>

      {/* Transactions Table */}
      <div className="table-responsive">
        <table className="table table-hover mb-0">
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>الوصف</th>
              <th>المهمة/العميل</th>
              <th className="text-end">المبلغ</th>
              <th>الملاحظات</th>
              <th className="text-end">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction: EmployeeTransaction) => (
              <tr key={transaction.id}>
                <td>
                  <div className="d-flex align-items-center">
                    {getTransactionIcon(transaction)}
                    <div className="ms-2">
                      <div className="fw-medium">{formatDate(transaction.transaction_date)}</div>
                      <small className="text-muted">{formatDate(transaction.created_at)}</small>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="fw-medium">{transaction.transaction_name}</div>
                  {transaction.direction === 'CREDIT' && transaction.related_task_id && (
                    <small className="text-success">Commission</small>
                  )}
                  {transaction.direction === 'DEBIT' && !transaction.related_task_id && (
                    <small className="text-danger">Payout</small>
                  )}
                </td>
                <td>
                  {transaction.task_name && (
                    <div>
                      <div className="fw-medium">{transaction.task_name}</div>
                      {transaction.client_name && (
                        <small className="text-muted">{transaction.client_name}</small>
                      )}
                    </div>
                  )}
                  {!transaction.task_name && <span className="text-muted">—</span>}
                </td>
                <td className="text-end">
                  <div className={`fw-medium ${
                    transaction.direction === 'CREDIT' ? 'text-success' : 'text-danger'
                  }`}>
                    {getTransactionAmount(transaction)}
                  </div>
                </td>
                <td>
                  <span className="text-muted">{transaction.notes || '—'}</span>
                </td>
                <td className="text-end">
                  <div className="btn-group" role="group">
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => handleEditTransaction(transaction)}
                      title={transaction.related_task_id ? 'Edit Task Expense' : 'Edit Payout'}
                    >
                      <Edit size={12} />
                    </Button>
                    {!transaction.related_task_id && (
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleDeleteTransaction(transaction)}
                        title="Delete Payout"
                        isLoading={deleteTransactionMutation.isPending}
                      >
                        <Trash2 size={12} />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {transactions.length === 0 && (
          <div className="p-4 text-center text-muted">
            No transactions found for this employee.
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.total > perPage && (
        <div className="p-4 d-flex justify-content-between align-items-center">
          <div className="text-muted">
            Showing {((page - 1) * perPage) + 1} to {Math.min(page * perPage, pagination.total)} of {pagination.total} transactions
          </div>
          <div className="btn-group" role="group">
            <Button
              variant="outline-secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline-secondary"
              size="sm"
              disabled={page >= Math.ceil(pagination.total / perPage)}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeTransactionsTable;
