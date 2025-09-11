import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../../utils/dateUtils';
import { formatCurrency } from '../../utils/formatUtils';
import { useStickyHeader } from '../../hooks/useStickyHeader';
import { FileText } from 'lucide-react';
import type { EmployeeTransaction } from '../../queries/employeeFinancialQueries';

interface EmployeeTransactionsTableProps {
  transactions: EmployeeTransaction[];
  isLoading: boolean;
  highlightTransactionId?: string;
}

const EmployeeTransactionsTable: React.FC<EmployeeTransactionsTableProps> = ({ 
  transactions, 
  isLoading,
  highlightTransactionId
}) => {
  const { sentinelRef, isSticky } = useStickyHeader();
  const navigate = useNavigate();

  const handleHighlightClick = () => {
    // Remove highlight by navigating to financials page without highlight parameter
    navigate('/employee/financials?mode=Employee');
  };

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center p-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">جاري التحميل...</span>
        </div>
      </div>
    );
  }

  if (!transactions.length) {
    return (
      <div className="text-center p-5 text-muted">
        <FileText size={48} className="mb-3 opacity-50" />
        <p className="mb-0">لا توجد معاملات مالية</p>
      </div>
    );
  }

  const getTransactionBg = (direction: 'CREDIT' | 'DEBIT') => {
    return direction === 'CREDIT' 
      ? 'rgba(40, 167, 69, 0.1)' 
      : 'rgba(220, 53, 69, 0.1)';
  };

  // Calculate totals
  const totalCredit = transactions.reduce((sum, t) => {
    const amount = parseFloat(t.amount) || 0;
    return sum + (t.direction === 'CREDIT' ? amount : 0);
  }, 0);
  
  const totalDebit = transactions.reduce((sum, t) => {
    const amount = parseFloat(t.amount) || 0;
    return sum + (t.direction === 'DEBIT' ? amount : 0);
  }, 0);
  
  const netBalance = totalCredit - totalDebit;

  return (
    <div className="table-responsive" dir="rtl">
      {/* Sentinel element for sticky header detection */}
      <div ref={sentinelRef}></div>
      
      <table className="table table-hover align-middle">
        <thead className={`table-primary ${isSticky ? 'is-sticky' : ''}`}>
          <tr className="fw-bold">
            <th scope="col" className="text-center" style={{ width: '15%', color: '#000' }}>العميل/المهمة</th>
            <th scope="col" className="text-center" style={{ width: '12%', color: '#000' }}>مبلغ المهمة</th>
            <th scope="col" className="text-center" style={{ width: '12%', color: '#000' }}>المستلم</th>
            <th scope="col" className="text-center" style={{ width: '12%', color: '#000' }}>المدفوع</th>
            <th scope="col" className="text-center" style={{ width: '10%', color: '#000' }}>التاريخ</th>
            <th scope="col" className="text-center" style={{ width: '25%', color: '#000' }}>الملاحظات</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => {
            const isHighlighted = highlightTransactionId && transaction.id === highlightTransactionId;
            return (
            <tr
              key={transaction.id}
              style={{
                backgroundColor: isHighlighted 
                  ? 'rgba(255, 193, 7, 0.1)' 
                  : getTransactionBg(transaction.direction),
                transition: 'all 0.2s ease-in-out',
                border: isHighlighted ? '2px solid rgba(255, 193, 7, 0.3)' : 'none',
                position: 'relative'
              }}
            >
              {isHighlighted && (
                <td colSpan={7} className="p-0" style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
                  <div 
                    className="w-100 text-center py-1"
                    style={{ 
                      backgroundColor: 'rgba(255, 193, 7, 0.9)', 
                      cursor: 'pointer',
                      fontSize: '0.8em'
                    }}
                    onClick={handleHighlightClick}
                    title="انقر لإزالة التمييز"
                  >
                    <small className="text-dark fw-bold">
                      ⭐ هذه المعاملة المحددة من الإشعار - انقر لإزالة التمييز
                    </small>
                  </div>
                </td>
              )}
              {!isHighlighted && (
              <>
              <td className="text-center">
                <div>
                  {transaction.client_name && (
                    <span className="fw-medium" style={{ fontSize: '0.9em' }}>
                      {transaction.client_name}
                    </span>
                  )}
                  {transaction.task_name && (
                    <div>
                      <span className="text-muted" style={{ fontSize: '0.8em' }}>
                        {transaction.task_name}
                      </span>
                    </div>
                  )}
                  {!transaction.client_name && !transaction.task_name && (
                    <span className="text-muted" style={{ fontSize: '0.8em' }}>
                      معاملة عامة
                    </span>
                  )}
                </div>
              </td>
              <td className="text-center">
                <span className="text-dark">
                  {transaction.task_amount ? (
                    <>{formatCurrency(parseFloat(transaction.task_amount))} ر.س</>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </span>
              </td>
              <td className="text-center">
                <span className="text-success fw-bold">
                  {transaction.direction === 'CREDIT' && transaction.amount ? (
                    <>{formatCurrency(parseFloat(transaction.amount))} ر.س</>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </span>
              </td>
              <td className="text-center">
                <span className="text-danger fw-bold">
                  {transaction.direction === 'DEBIT' && transaction.amount ? (
                    <>{formatCurrency(parseFloat(transaction.amount))} ر.س</>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </span>
              </td>
              <td className="text-center">
                <span style={{ fontSize: '0.8em' }}>
                  {formatDate(transaction.transaction_date).replace(/\/20/, '/')}
                </span>
              </td>
              <td className="text-center">
                <span className="text-muted" style={{ fontSize: '0.9em' }}>
                  {transaction.notes || transaction.transaction_name || '—'}
                </span>
              </td>
              </>
              )}
            </tr>
            );
          })}
          
          {/* Totals Footer Row */}
          <tr style={{
            backgroundColor: 'var(--color-gray-50)',
            borderTop: '2px solid var(--color-gray-200)',
            fontWeight: 'bold'
          }}>
            <td className="text-center fw-bold">
              الإجماليات
            </td>
            <td className="text-center">
              <span className="text-muted">—</span>
            </td>
            <td className="text-center fw-bold">
              <span className="text-success">
                {formatCurrency(totalCredit)} ر.س
              </span>
            </td>
            <td className="text-center fw-bold">
              <span className="text-danger">
                {formatCurrency(totalDebit)} ر.س
              </span>
            </td>
            <td className="text-center fw-bold">
              <span className={netBalance > 0 ? 'text-success' : netBalance < 0 ? 'text-danger' : 'text-muted'}>
                {formatCurrency(Math.abs(netBalance))} ر.س
              </span>
            </td>
            <td className="text-center">
              <span className="text-muted small">
                {netBalance > 0 ? 'رصيد موجب' : netBalance < 0 ? 'رصيد سالب' : 'رصيد متوازن'}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default EmployeeTransactionsTable;
