import React from 'react';
import { formatDate } from '../../utils/dateUtils';
import { formatCurrency } from '../../utils/formatUtils';
import { useStickyHeader } from '../../hooks/useStickyHeader';
import { FileText, Edit3, Trash2 } from 'lucide-react';
import { Button } from 'react-bootstrap';
import { useModalStore } from '../../stores/modalStore';
import type { EmployeeCredit } from '../../queries/employeeFinancialQueries';

interface EmployeeCreditsTableProps {
  credits: EmployeeCredit[];
  isLoading: boolean;
}

const EmployeeCreditsTable: React.FC<EmployeeCreditsTableProps> = ({ 
  credits, 
  isLoading 
}) => {
  const { sentinelRef, isSticky } = useStickyHeader();
  const { openModal } = useModalStore();

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center p-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">جاري التحميل...</span>
        </div>
      </div>
    );
  }

  if (!credits.length) {
    return (
      <div className="text-center p-5 text-muted">
        <FileText size={48} className="mb-3 opacity-50" />
        <p className="mb-0">لا توجد ائتمانات للعملاء</p>
      </div>
    );
  }

  // Calculate totals
  const totalAmount = credits.reduce((sum, credit) => sum + parseFloat(credit.amount), 0);
  const totalAllocated = credits.reduce((sum, credit) => sum + parseFloat(credit.allocated_amount || '0'), 0);
  const totalRemaining = credits.reduce((sum, credit) => sum + parseFloat(credit.remaining_amount || credit.amount), 0);

  return (
    <div className="table-responsive" dir="rtl">
      {/* Sentinel element for sticky header detection */}
      <div ref={sentinelRef}></div>
      
      <table className="table table-hover align-middle">
        <thead className={`table-info ${isSticky ? 'is-sticky' : ''}`}>
          <tr className="fw-bold">
            <th scope="col" className="text-center" style={{ width: '20%', color: '#000' }}>اسم العميل</th>
            <th scope="col" className="text-center" style={{ width: '15%', color: '#000' }}>رقم الهاتف</th>
            <th scope="col" className="text-center" style={{ width: '15%', color: '#000' }}>مبلغ الائتمان</th>
            <th scope="col" className="text-center" style={{ width: '15%', color: '#000' }}>المخصص</th>
            <th scope="col" className="text-center" style={{ width: '15%', color: '#000' }}>المتبقي</th>
            <th scope="col" className="text-center" style={{ width: '10%', color: '#000' }}>تاريخ الاستلام</th>
            <th scope="col" className="text-center" style={{ width: '10%', color: '#000' }}>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {credits.map((credit) => {
            const remainingAmount = parseFloat(credit.remaining_amount || credit.amount);
            const isFullyAllocated = remainingAmount === 0;
            
            return (
              <tr
                key={credit.id}
                className={isFullyAllocated ? 'table-success' : ''}
                style={{
                  backgroundColor: isFullyAllocated ? 'rgba(40, 167, 69, 0.1)' : 'transparent'
                }}
              >
                <td className="text-center">
                  <span className="fw-medium">{credit.client_name}</span>
                </td>
                <td className="text-center">
                  <span className="text-muted">{credit.client_phone || '—'}</span>
                </td>
                <td className="text-center">
                  <span className="fw-bold text-primary">
                    {formatCurrency(parseFloat(credit.amount))} ر.س
                  </span>
                </td>
                <td className="text-center">
                  <span className="text-warning fw-bold">
                    {formatCurrency(parseFloat(credit.allocated_amount || '0'))} ر.س
                  </span>
                </td>
                <td className="text-center">
                  <span className={`fw-bold ${isFullyAllocated ? 'text-success' : 'text-danger'}`}>
                    {formatCurrency(remainingAmount)} ر.س
                  </span>
                </td>
                <td className="text-center">
                  <span className="text-muted" style={{ fontSize: '0.85em' }}>
                    {formatDate(credit.received_at)}
                  </span>
                </td>
                <td className="text-center" style={{ padding: '12px 8px' }}>
                  <div className="d-flex gap-1 justify-content-center">
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => openModal('creditEdit', { 
                        credit: {
                          id: parseInt(credit.id),
                          client_id: parseInt(credit.client_id),
                          amount: parseFloat(credit.amount),
                          description: credit.description || '',
                          received_at: credit.received_at,
                          allocated_amount: parseFloat(credit.allocated_amount || '0'),
                          remaining_amount: parseFloat(credit.remaining_amount || credit.amount)
                        } as any,
                        clientId: parseInt(credit.client_id)
                      })}
                      title="تعديل الائتمان"
                    >
                      <Edit3 size={12} />
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => openModal('creditDelete', { 
                        credit: {
                          id: parseInt(credit.id),
                          client_id: parseInt(credit.client_id),
                          amount: parseFloat(credit.amount),
                          description: credit.description || '',
                          received_at: credit.received_at,
                          allocated_amount: parseFloat(credit.allocated_amount || '0'),
                          remaining_amount: parseFloat(credit.remaining_amount || credit.amount)
                        } as any,
                        clientId: parseInt(credit.client_id)
                      })}
                      title="حذف الائتمان"
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
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
            <td className="text-center fw-bold" colSpan={2}>
              الإجماليات
            </td>
            <td className="text-center fw-bold">
              <span className="text-primary">
                {formatCurrency(totalAmount)} ر.س
              </span>
            </td>
            <td className="text-center fw-bold">
              <span className="text-warning">
                {formatCurrency(totalAllocated)} ر.س
              </span>
            </td>
            <td className="text-center fw-bold">
              <span className={totalRemaining > 0 ? 'text-danger' : 'text-success'}>
                {formatCurrency(totalRemaining)} ر.س
              </span>
            </td>
            <td className="text-center" colSpan={2}>
              <span className="text-muted small">
                {credits.length} ائتمان
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default EmployeeCreditsTable;
