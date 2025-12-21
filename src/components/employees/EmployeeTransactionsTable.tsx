import React, { useState } from 'react';
import { Edit, Trash2, TrendingUp, TrendingDown, Clock, CheckCircle } from 'lucide-react';
import Button from '../ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { useToast } from '../../hooks/useToast';
import { useModalStore } from '../../stores/modalStore';
import { useGetEmployeeTransactions, useDeleteEmployeeTransaction, useGetEmployee } from '../../queries/employeeQueries';
import { formatCurrency, formatDate } from '../../utils/formatUtils';
// Step 17: Removed TransactionEditModal and TransactionDeleteModal imports - using ModalManager
import { useCurrentUserCapabilities } from '../../queries/userQueries';

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
  client_name?: string | null;
}

// Pending commission from pending_items table
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
  invoice_status?: string | null;
  invoice_amount?: string | null;
  invoice_paid_amount?: string | null;
  days_pending?: number;
  invoice_payment_progress?: number;
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

type ViewTab = 'confirmed' | 'pending';

interface EmployeeTransactionsTableProps {
  employeeId?: number;
  transactions?: ConfirmedTransaction[];
  pendingCommissions?: PendingCommission[];
  isLoading?: boolean;
  page?: number;
  perPage?: number;
  onPageChange?: (page: number) => void;
  onEdit?: (transaction: ConfirmedTransaction | LegacyTransaction) => void;
  onDelete?: (transaction: ConfirmedTransaction | LegacyTransaction) => void;
}

const EmployeeTransactionsTable: React.FC<EmployeeTransactionsTableProps> = ({
  employeeId,
  transactions: propTransactions,
  pendingCommissions: propPendingCommissions,
  isLoading: propIsLoading,
  page = 1,
  perPage = 10,
  onPageChange,
  onEdit,
  onDelete,
}) => {
  const { success, error } = useToast();
  const { openModal } = useModalStore();
  const [activeTab, setActiveTab] = useState<ViewTab>('confirmed');
  const { data: capabilities } = useCurrentUserCapabilities();
  const canEdit = capabilities?.manage_options || false;
  // Step 17: Removed local modal state - now using ModalManager

  // Fetch employee data - only if employeeId is provided
  const { data: employee } = useGetEmployee(employeeId as number);

  // Fetch employee transactions - only if employeeId is provided and no transactions prop
  const {
    data: transactionsData,
    isLoading: isQueryLoading,
    refetch
  } = useGetEmployeeTransactions(employeeId as number, { page, per_page: perPage });

  const isLoading = propIsLoading !== undefined ? propIsLoading : isQueryLoading;

  const deleteTransactionMutation = useDeleteEmployeeTransaction();

  // Extract confirmed transactions and pending commissions
  const confirmedTransactions: ConfirmedTransaction[] = propTransactions
    ? propTransactions
    : (transactionsData?.data?.confirmed_transactions || []);

  const pendingCommissions: PendingCommission[] = propPendingCommissions
    ? propPendingCommissions
    : (transactionsData?.data?.pending_commissions || []);

  const pagination = transactionsData?.pagination || {};
  const summary = transactionsData?.data?.summary || {};

  const handleEditTransaction = (transaction: ConfirmedTransaction | LegacyTransaction) => {
    if (onEdit) {
      onEdit(transaction);
      return;
    }

    // Step 17: Use ModalManager instead of local modal state
    openModal('transactionEdit', { transaction });
  };

  const handleDeleteTransaction = async (transaction: ConfirmedTransaction | LegacyTransaction) => {
    if (onDelete) {
      onDelete(transaction);
      return;
    }

    // Step 17: Use ModalManager instead of local modal state
    openModal('transactionDelete', { transaction });
  };

  // Helper: Get transaction icon for confirmed transactions
  const getConfirmedTransactionIcon = (transaction: ConfirmedTransaction) => {
    const debit = parseFloat(transaction.debit || '0');

    if (debit > 0) {
      return <TrendingUp size={16} className="text-success" />; // Commission earned
    } else {
      return <TrendingDown size={16} className="text-danger" />; // Payout/expense
    }
  };

  // Helper: Format transaction type for display
  const getTransactionTypeBadge = (type: string) => {
    const typeMap: Record<string, { label: string; className: string }> = {
      'EMPLOYEE_COMMISSION': { label: 'عمولة', className: 'bg-green-100 text-green-800' },
      'EMPLOYEE_PAYOUT': { label: 'صرف', className: 'bg-red-100 text-red-800' },
      'EMPLOYEE_EXPENSE': { label: 'مصروف', className: 'bg-orange-100 text-orange-800' },
      'EMPLOYEE_BORROW': { label: 'سلفة', className: 'bg-blue-100 text-blue-800' },
    };

    const config = typeMap[type] || { label: type, className: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${config.className}`}>
        {config.label}
      </span>
    );
  };

  if (isLoading) {
    return <div className="p-4 text-center">Loading transactions...</div>;
  }

  return (
    <div>
      {/* Tab Navigation */}
      <div className="flex border-b mb-4">
        <button
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'confirmed'
            ? 'border-primary text-primary'
            : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          onClick={() => setActiveTab('confirmed')}
        >
          <div className="flex items-center gap-2">
            <CheckCircle size={16} />
            <span>المعاملات المؤكدة</span>
            <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
              {confirmedTransactions.length}
            </span>
          </div>
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'pending'
            ? 'border-primary text-primary'
            : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          onClick={() => setActiveTab('pending')}
        >
          <div className="flex items-center gap-2">
            <Clock size={16} />
            <span>العمولات المعلقة</span>
            {pendingCommissions.length > 0 && (
              <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full">
                {pendingCommissions.length}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Confirmed Transactions Tab */}
      {activeTab === 'confirmed' && (
        <div className="overflow-x-auto">
          <Table className="border-collapse border border-gray-300">
            <TableHeader>
              <TableRow>
                <TableHead className="text-black border border-gray-300">التاريخ</TableHead>
                <TableHead className="text-black border border-gray-300">الوصف</TableHead>
                <TableHead className="text-black border border-gray-300">النوع</TableHead>
                <TableHead className="text-black border border-gray-300">المهمة/العميل</TableHead>
                <TableHead className="text-right text-black border border-gray-300">المبلغ</TableHead>
                <TableHead className="text-right text-black border border-gray-300">الرصيد</TableHead>
                <TableHead className="text-right text-black border border-gray-300">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {confirmedTransactions.map((transaction) => {
                const debit = parseFloat(transaction.debit || '0');
                const credit = parseFloat(transaction.credit || '0');
                const amount = debit > 0 ? debit : credit;
                const isPositive = debit > 0;

                return (
                  <TableRow key={transaction.id}>
                    <TableCell className="border border-gray-300">
                      <div className="flex items-center gap-2">
                        {getConfirmedTransactionIcon(transaction)}
                        <div className="font-medium text-black">
                          {formatDate(transaction.transaction_date)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="border border-gray-300">
                      <div className="font-medium text-black">{transaction.description}</div>
                    </TableCell>
                    <TableCell className="border border-gray-300">
                      {getTransactionTypeBadge(transaction.transaction_type)}
                    </TableCell>
                    <TableCell>
                      {transaction.task_name ? (
                        <div>
                          <div className="font-medium text-black">{transaction.task_name}</div>
                          {transaction.client_name && (
                            <small className="text-gray-500">{transaction.client_name}</small>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right border border-gray-300">
                      <div className={`font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {isPositive ? '+' : '-'}{formatCurrency(amount)} <span className="text-xs">ر.س</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right border border-gray-300">
                      <span className="text-black">
                        {transaction.balance ? formatCurrency(parseFloat(transaction.balance)) : '—'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right border border-gray-300">
                      <div className="inline-flex gap-2">
                        {canEdit && (
                          <>
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              onClick={() => handleEditTransaction(transaction)}
                              title="Edit"
                            >
                              <Edit size={12} />
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDeleteTransaction(transaction)}
                              title="Delete"
                            >
                              <Trash2 size={12} />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {confirmedTransactions.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <CheckCircle size={48} className="mx-auto mb-4 text-gray-300" />
              <p>لا توجد معاملات مؤكدة حتى الآن</p>
            </div>
          )}
        </div>
      )}

      {/* Pending Commissions Tab */}
      {activeTab === 'pending' && (
        <div className="overflow-x-auto">
          <Table className="border-collapse border border-gray-300">
            <TableHeader>
              <TableRow>
                <TableHead className="text-black">المهمة</TableHead>
                <TableHead className="text-black">العميل</TableHead>
                <TableHead className="text-right text-black">المبلغ المتوقع</TableHead>
                <TableHead className="text-black">حالة الفاتورة</TableHead>
                <TableHead className="text-black">تقدم السداد</TableHead>
                <TableHead className="text-black">أيام الانتظار</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingCommissions.map((pending) => {
                const progress = pending.invoice_payment_progress || 0;
                const invoiceStatus = pending.invoice_status || 'unknown';

                return (
                  <TableRow key={pending.id}>
                    <TableCell className="border border-gray-300">
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-amber-500" />
                        <div className="font-medium text-black">
                          {pending.task_name || `مهمة #${pending.task_id}`}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="border border-gray-300">
                      <span className="text-black">{pending.client_name || '—'}</span>
                    </TableCell>
                    <TableCell className="text-right border border-gray-300">
                      <div className="font-medium text-amber-600">
                        {formatCurrency(parseFloat(pending.expected_amount))} <span className="text-xs">ر.س</span>
                      </div>
                    </TableCell>
                    <TableCell className="border border-gray-300">
                      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${invoiceStatus === 'paid' ? 'bg-green-100 text-green-800' :
                        invoiceStatus === 'partially_paid' ? 'bg-blue-100 text-blue-800' :
                          invoiceStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                        }`}>
                        {invoiceStatus === 'paid' ? 'مدفوع' :
                          invoiceStatus === 'partially_paid' ? 'مدفوع جزئياً' :
                            invoiceStatus === 'pending' ? 'قيد الانتظار' :
                              invoiceStatus}
                      </span>
                    </TableCell>
                    <TableCell className="border border-gray-300">
                      <div className="w-24">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${progress >= 100 ? 'bg-green-500' :
                                progress > 50 ? 'bg-blue-500' :
                                  progress > 0 ? 'bg-yellow-500' :
                                    'bg-gray-300'
                                }`}
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{progress.toFixed(0)}%</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="border border-gray-300">
                      <span className={`text-sm ${(pending.days_pending || 0) > 30 ? 'text-red-600 font-medium' :
                        (pending.days_pending || 0) > 14 ? 'text-orange-600' :
                          'text-gray-600'
                        }`}>
                        {pending.days_pending || 0} يوم
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {pendingCommissions.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <Clock size={48} className="mx-auto mb-4 text-gray-300" />
              <p>لا توجد عمولات معلقة</p>
              <p className="text-sm mt-1">ستظهر هنا العمولات في انتظار دفع الفاتورة</p>
            </div>
          )}

          {/* Pending Summary */}
          {pendingCommissions.length > 0 && (
            <div className="p-4 bg-amber-50 border-t border-amber-200">
              <div className="flex justify-between items-center">
                <span className="text-amber-800 font-medium">
                  إجمالي العمولات المعلقة: {pendingCommissions.length} عمولة
                </span>
                <span className="text-amber-800 font-bold">
                  {formatCurrency(summary.total_pending || 0)} ر.س
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {pagination.total > perPage && activeTab === 'confirmed' && (
        <div className="p-4 flex justify-between items-center border-t">
          <div className="text-black text-sm">
            Showing {((page - 1) * perPage) + 1} to {Math.min(page * perPage, pagination.total)} of {pagination.total} transactions
          </div>
          <div className="inline-flex gap-2">
            <Button
              variant="outline-secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange?.(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline-secondary"
              size="sm"
              disabled={page >= Math.ceil(pagination.total / perPage)}
              onClick={() => onPageChange?.(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
      {/* Step 17: Modals now handled by ModalManager */}
    </div>
  );
};

export default EmployeeTransactionsTable;
