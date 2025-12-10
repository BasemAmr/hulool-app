// src/components/employee/RecentTransactionsPanel.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, Clock } from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';
import type { EmployeeTransaction, FinancialSummary } from '../../queries/employeeDashboardQueries';

interface RecentTransactionsPanelProps {
  transactions: EmployeeTransaction[];
  financialSummary: FinancialSummary;
}

const RecentTransactionsPanel: React.FC<RecentTransactionsPanelProps> = ({ transactions, financialSummary }) => {
  const navigate = useNavigate();

  const formatCurrency = (amount: string | null) => {
    if (!amount) return '0';
    const numAmount = Number(amount) || 0;
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(numAmount);
  };

  /**
   * Check if transaction is pending (awaiting payment)
   */
  const isPendingTransaction = (transaction: EmployeeTransaction): boolean => {
    return transaction.is_pending || 
      (transaction.direction === 'CREDIT' && 
        (parseFloat(transaction.amount || '0') === 0 || 
         transaction.transaction_name?.startsWith('Pending:')));
  };

  const navigateToFinancials = () => {
    navigate('/employee/financials');
  };

  // Count pending transactions
  const pendingCount = transactions.filter(t => isPendingTransaction(t)).length;


  return (
    <div 
      className="rounded-lg border border-border bg-card shadow-sm h-full"
      style={{
        overflow: 'visible',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-2 border-b border-border"
        style={{
          backgroundColor: '#28a745',
          color: '#fff',
          flexShrink: 0
        }}
      >
        <div className="flex justify-between items-center">
          <h6 className="mb-0 font-bold text-white text-base">
           مستحقات الموظف
          </h6>
          {pendingCount > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded">
              <Clock size={12} className="mr-1" />
              {pendingCount} معلق
            </span>
          )}
        </div>
      </div>

      {/* Body - Transactions Table */}
      <div className="p-0" style={{ flex: 1, overflow: 'visible', position: 'relative' }}>
        {transactions.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-center">
              <p className="text-black mb-0 text-sm">
                لا توجد معاملات مالية
              </p>
            </div>
          </div>
        ) : (
          <div className="w-full overflow-x-auto h-full" style={{ overflow: 'visible', position: 'relative', zIndex: 10 }}>
            <table className="w-full text-sm mb-0" style={{ position: 'relative', zIndex: 10 }}>
              <thead
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 1,
                  backgroundColor: 'var(--color-gray-50)'
                }}
              >
                <tr>
                  <th style={{
                    fontSize: '0.75rem',
                    padding: '8px',
                    borderBottom: '2px solid var(--color-gray-100)',
                    textAlign: 'start'
                  }}>العميل/المهمة</th>

                  <th style={{
                    fontSize: '0.75rem',
                    padding: '8px',
                    borderBottom: '2px solid var(--color-gray-100)',
                    textAlign: 'center'
                  }}>المدين</th>
                  <th style={{
                    fontSize: '0.75rem',
                    padding: '8px',
                    borderBottom: '2px solid var(--color-gray-100)',
                    textAlign: 'center'
                  }}>الدائن</th>
                  <th style={{
                    fontSize: '0.75rem',
                    padding: '8px',
                    borderBottom: '2px solid var(--color-gray-100)',
                    textAlign: 'center'
                  }}>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction, index) => {
                  const isPending = isPendingTransaction(transaction);
                  return (
                  <tr
                    key={transaction.id}
                    className="hover:bg-muted/50 transition-colors"
                    style={{
                      cursor: transaction.related_task_id ? 'pointer' : 'default'
                    }}
                  >
                    <td style={{
                      fontSize: '0.8rem',
                      padding: '6px',
                      textAlign: 'start',
                      borderBottom: '1px solid var(--color-gray-100)',
                      backgroundColor: isPending ? '#fef3c7' : (index % 2 === 0 ? '#e8f5e8' : '#c8e6c9'),
                      fontWeight: '700'
                    }}>
                      <div className="text-start">
                        {isPending && (
                          <Clock size={12} className="inline mr-1 text-amber-600" />
                        )}
                        {/* Show transaction name first */}
                        {transaction.transaction_name && (
                          <span className="font-semibold">
                            {transaction.transaction_name}
                          </span>
                        )}
                        {/* If we have client or task name, show them */}
                        {(transaction.client_name || transaction.task_name) && (
                          <span className="text-xs text-gray-600">
                            {' '}({transaction.client_name ? transaction.client_name : ''}{transaction.client_name && transaction.task_name ? ' - ' : ''}{transaction.task_name ? transaction.task_name : ''})
                          </span>
                        )}
                        {/* Show notes if available */}
                        {transaction.notes && transaction.notes.trim() && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            {transaction.notes}
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{
                      fontSize: '0.75rem',
                      padding: '6px',
                      textAlign: 'center',
                      borderBottom: '1px solid var(--color-gray-100)',
                      backgroundColor: isPending ? '#fef3c7' : (index % 2 === 0 ? '#e8f5e8' : '#c8e6c9')
                    }}>
                      {isPending ? (
                        <span className="text-amber-600 font-medium text-xs">قيد الانتظار</span>
                      ) : (
                        <span className="text-green-600">
                          {transaction.direction === 'CREDIT' && transaction.amount ? (
                            <>
                              {formatCurrency(transaction.amount)} ر.س
                            </>
                          ) : (
                            <span className="text-black">_</span>
                          )}
                        </span>
                      )}
                    </td>
                    <td style={{
                      fontSize: '0.75rem',
                      padding: '6px',
                      textAlign: 'center',
                      borderBottom: '1px solid var(--color-gray-100)',
                      backgroundColor: isPending ? '#fef3c7' : (index % 2 === 0 ? '#e8f5e8' : '#c8e6c9')
                    }}>
                      <span className="text-red-600">
                        {transaction.direction === 'DEBIT' && transaction.amount ? (
                          <>
                            {formatCurrency(transaction.amount)} ر.س
                          </>
                        ) : (
                          <span className="text-black">_</span>
                        )}
                      </span>
                    </td>
                    <td style={{
                      fontSize: '0.75rem',
                      padding: '6px',
                      textAlign: 'center',
                      borderBottom: '1px solid var(--color-gray-100)',
                      backgroundColor: isPending ? '#fef3c7' : (index % 2 === 0 ? '#e8f5e8' : '#c8e6c9')
                    }}>
                      <span style={{ fontSize: '10px' }}>
                        {formatDate(transaction.transaction_date).replace(/\/20/, '/')}
                      </span>
                    </td>
                  </tr>
                  );
                })}
                {/* Totals Footer Row */}
                <tr style={{
                  backgroundColor: 'var(--color-gray-50)',
                  borderTop: '2px solid var(--color-gray-200)',
                  fontWeight: 'bold'
                }}>
                  <td style={{
                    fontSize: '0.75rem',
                    padding: '8px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    backgroundColor: 'var(--color-gray-50)'
                  }}>
                    الإجماليات
                  </td>
                  <td style={{
                    fontSize: '0.75rem',
                    padding: '8px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    backgroundColor: 'var(--color-gray-50)'
                  }}>
                    <span className="text-green-600">
                      {formatCurrency(financialSummary.total_earned.toString())} ر.س
                    </span>
                  </td>
                  <td style={{
                    fontSize: '0.75rem',
                    padding: '8px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    backgroundColor: 'var(--color-gray-50)'
                  }}>
                    <span className="text-red-600">
                      {formatCurrency(financialSummary.total_paid_out.toString())} ر.س
                    </span>
                  </td>
                  <td style={{
                    fontSize: '0.75rem',
                    padding: '8px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    backgroundColor: 'var(--color-gray-50)'
                  }}>
                    <span className={financialSummary.balance_due > 0 ? 'text-red-600' : 'text-black'}>
                      {formatCurrency(financialSummary.balance_due.toString())} ر.س
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer - Show More Button */}
      <div 
        className="px-4 py-2 bg-muted/30 border-t border-border text-center"
        style={{ flexShrink: 0 }}
      >
        <button
          onClick={navigateToFinancials}
          className="text-primary p-0 flex items-center justify-center gap-1 w-full hover:text-primary/80 transition-colors text-sm"
        >
          <MoreHorizontal size={16} />
          <span>عرض جميع المعاملات</span>
        </button>
      </div>
    </div>
  );
};

export default RecentTransactionsPanel;
