// src/components/employee/RecentTransactionsPanel.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {  MoreHorizontal } from 'lucide-react';
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

  const getTransactionBg = (direction: 'CREDIT' | 'DEBIT') => {
    return direction === 'CREDIT' 
      ? 'rgba(40, 167, 69, 0.1)' 
      : 'rgba(220, 53, 69, 0.1)';
  };

  const navigateToFinancials = () => {
    navigate('/employee/financials');
  };


  return (
    <div 
      className="card h-100 shadow-sm"
      style={{
        borderRadius: 'var(--border-radius)',
        border: '1px solid var(--color-gray-100)',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Header */}
      <div
        className="card-header border-0 py-2"
        style={{
          backgroundColor: 'var(--color-primary)',
          color: 'var(--color-white)',
          flexShrink: 0
        }}
      >
        <div className="d-flex justify-content-between align-items-center">
          <h6 className="mb-0 fw-bold" style={{ fontSize: 'var(--font-size-base)' }}>
            المعاملات الأخيرة
          </h6>
          <span style={{ fontSize: 'var(--font-size-sm)' }}>
            {transactions.length} معاملة
          </span>
        </div>
      </div>

      {/* Body - Transactions Table */}
      <div className="card-body p-0" style={{ flex: 1, overflow: 'hidden' }}>
        {transactions.length === 0 ? (
          <div className="d-flex justify-content-center align-items-center h-100">
            <div className="text-center">
              <p className="text-muted mb-0" style={{ fontSize: 'var(--font-size-sm)' }}>
                لا توجد معاملات مالية
              </p>
            </div>
          </div>
        ) : (
          <div className="table-responsive h-100" style={{ overflow: 'auto' }}>
            <table className="table table-sm mb-0">
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
                    fontSize: 'var(--font-size-xs)',
                    padding: '8px',
                    borderBottom: '2px solid var(--color-gray-100)',
                    textAlign: 'center'
                  }}>العميل/المهمة</th>
                  <th style={{
                    fontSize: 'var(--font-size-xs)',
                    padding: '8px',
                    borderBottom: '2px solid var(--color-gray-100)',
                    textAlign: 'center'
                  }}>مبلغ المعاملة</th>
                  <th style={{
                    fontSize: 'var(--font-size-xs)',
                    padding: '8px',
                    borderBottom: '2px solid var(--color-gray-100)',
                    textAlign: 'center'
                  }}>المدين</th>
                  <th style={{
                    fontSize: 'var(--font-size-xs)',
                    padding: '8px',
                    borderBottom: '2px solid var(--color-gray-100)',
                    textAlign: 'center'
                  }}>الدائن</th>
                  <th style={{
                    fontSize: 'var(--font-size-xs)',
                    padding: '8px',
                    borderBottom: '2px solid var(--color-gray-100)',
                    textAlign: 'center'
                  }}>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    style={{
                      backgroundColor: getTransactionBg(transaction.direction),
                      transition: 'all 0.2s ease-in-out',
                      cursor: transaction.related_task_id ? 'pointer' : 'default'
                    }}
                  >
                    <td style={{
                      fontSize: 'var(--font-size-xs)',
                      padding: '6px',
                      textAlign: 'center',
                      borderBottom: '1px solid var(--color-gray-100)'
                    }}>
                      <div className="text-center">
                        {transaction.client_name && (
                          <span style={{ fontSize: '11px' }}>
                            {transaction.client_name}: &nbsp;
                          </span>
                        )}
                        {transaction.task_name && (
                          <span style={{ fontSize: '10px' }}>
                            {transaction.task_name}
                          </span>
                        )}
                        {!transaction.client_name && !transaction.task_name && (
                          <span style={{ fontSize: '10px' }}>
                            معاملة عامة
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{
                      fontSize: 'var(--font-size-xs)',
                      padding: '6px',
                      textAlign: 'center',
                      borderBottom: '1px solid var(--color-gray-100)'
                    }}>
                      <span className="text-dark">
                        {transaction.task_amount ? (
                          <>
                            {formatCurrency(transaction.task_amount)} ر.س
                          </>
                        ) : (
                          <span className="text-muted">_</span>
                        )}
                      </span>
                    </td>
                    <td style={{
                      fontSize: 'var(--font-size-xs)',
                      padding: '6px',
                      textAlign: 'center',
                      borderBottom: '1px solid var(--color-gray-100)'
                    }}>
                      <span className="text-dark">
                        {transaction.related_task_id && transaction.amount ? (
                          <>
                            {formatCurrency(transaction.amount)} ر.س
                          </>
                        ) : (
                          <span className="text-muted">_</span>
                        )}
                      </span>
                    </td>
                    <td style={{
                      fontSize: 'var(--font-size-xs)',
                      padding: '6px',
                      textAlign: 'center',
                      borderBottom: '1px solid var(--color-gray-100)'
                    }}>
                      <span className="text-dark">
                        {!transaction.related_task_id && transaction.amount ? (
                          <>
                            {formatCurrency(transaction.amount)} ر.س
                          </>
                        ) : (
                          <span className="text-muted">_</span>
                        )}
                      </span>
                    </td>
                    <td style={{
                      fontSize: 'var(--font-size-xs)',
                      padding: '6px',
                      textAlign: 'center',
                      borderBottom: '1px solid var(--color-gray-100)'
                    }}>
                      <span style={{ fontSize: '10px' }}>
                        {formatDate(transaction.transaction_date).replace(/\/20/, '/')}
                      </span>
                    </td>
                  </tr>
                ))}
                {/* Totals Footer Row */}
                <tr style={{
                  backgroundColor: 'var(--color-gray-50)',
                  borderTop: '2px solid var(--color-gray-200)',
                  fontWeight: 'bold'
                }}>
                  <td style={{
                    fontSize: 'var(--font-size-xs)',
                    padding: '8px',
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }}>
                    الإجماليات
                  </td>
                  <td style={{
                    fontSize: 'var(--font-size-xs)',
                    padding: '8px',
                    textAlign: 'center'
                  }}>
                    <span className="text-muted">_</span>
                  </td>
                  <td style={{
                    fontSize: 'var(--font-size-xs)',
                    padding: '8px',
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }}>
                    <span className="text-dark">
                      {formatCurrency(financialSummary.total_earned.toString())} ر.س
                    </span>
                  </td>
                  <td style={{
                    fontSize: 'var(--font-size-xs)',
                    padding: '8px',
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }}>
                    <span className="text-dark">
                      {formatCurrency(financialSummary.total_paid_out.toString())} ر.س
                    </span>
                  </td>
                  <td style={{
                    fontSize: 'var(--font-size-xs)',
                    padding: '8px',
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }}>
                    <span className={financialSummary.balance_due > 0 ? 'text-success' : 'text-muted'}>
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
        className="card-footer bg-light border-0 py-2"
        style={{ flexShrink: 0, textAlign: 'center' }}
      >
        <button
          onClick={navigateToFinancials}
          className="btn btn-link text-primary p-0 d-flex align-items-center justify-content-center gap-1 w-100"
          style={{ fontSize: 'var(--font-size-sm)' }}
        >
          <MoreHorizontal size={16} />
          <span>عرض جميع المعاملات</span>
        </button>
      </div>
    </div>
  );
};

export default RecentTransactionsPanel;
