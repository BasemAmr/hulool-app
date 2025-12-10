import React from 'react';
import { formatDate } from '@/utils/dateUtils';
import { formatCurrency } from '@/utils/formatUtils';
import { useStickyHeader } from '@/hooks/useStickyHeader';
import { FileText, Edit3, Trash2 } from 'lucide-react';
// TODO: Replace with Shadcn UI Button in Phase 2
import Button from '@/components/ui/Button';
import { useModalStore } from '@/stores/modalStore';
import type { EmployeeCredit } from '@/queries/employeeFinancialQueries';

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
      <div className="flex justify-center items-center p-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">جاري التحميل...</span>
        </div>
      </div>
    );
  }

  if (!credits.length) {
    return (
      <div className="text-center p-5 text-black">
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
    <div className="w-full overflow-x-auto" dir="rtl">
      {/* Sentinel element for sticky header detection */}
      <div ref={sentinelRef}></div>
      
      <table className="w-full">
        <thead className={`bg-blue-500 text-white ${isSticky ? 'is-sticky' : ''}`}>
          <tr className="font-bold">
            <th scope="col" className="text-center py-3 px-2" style={{ width: '20%' }}>اسم العميل</th>
            <th scope="col" className="text-center py-3 px-2" style={{ width: '15%' }}>رقم الهاتف</th>
            <th scope="col" className="text-center py-3 px-2" style={{ width: '15%' }}>مبلغ الائتمان</th>
            <th scope="col" className="text-center py-3 px-2" style={{ width: '15%' }}>المخصص</th>
            <th scope="col" className="text-center py-3 px-2" style={{ width: '15%' }}>المتبقي</th>
            <th scope="col" className="text-center py-3 px-2" style={{ width: '10%' }}>تاريخ الاستلام</th>
            <th scope="col" className="text-center py-3 px-2" style={{ width: '10%' }}>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {credits.map((credit) => {
            const remainingAmount = parseFloat(credit.remaining_amount || credit.amount);
            const isFullyAllocated = remainingAmount === 0;
            
            return (
              <tr
                key={credit.id}
                className={`hover:bg-muted/50 transition-colors ${isFullyAllocated ? 'bg-green-100/50' : ''}`}
              >
                <td className="text-center py-3 px-2">
                  <span className="font-medium">{credit.client_name}</span>
                </td>
                <td className="text-center py-3 px-2">
                  <span className="text-black">{credit.client_phone || '—'}</span>
                </td>
                <td className="text-center py-3 px-2">
                  <span className="font-bold text-primary">
                    {formatCurrency(parseFloat(credit.amount))} ر.س
                  </span>
                </td>
                <td className="text-center py-3 px-2">
                  <span className="text-yellow-600 font-bold">
                    {formatCurrency(parseFloat(credit.allocated_amount || '0'))} ر.س
                  </span>
                </td>
                <td className="text-center py-3 px-2">
                  <span className={`font-bold ${isFullyAllocated ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(remainingAmount)} ر.س
                  </span>
                </td>
                <td className="text-center py-3 px-2">
                  <span className="text-black" style={{ fontSize: '0.85em' }}>
                    {formatDate(credit.received_at)}
                  </span>
                </td>
                <td className="text-center py-3 px-2">
                  <div className="flex gap-1 justify-center">
                    {/* TODO: Replace with Shadcn UI Button in Phase 2 */}
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
            <td className="text-center font-bold" colSpan={2}>
              الإجماليات
            </td>
            <td className="text-center font-bold">
              <span className="text-primary">
                {formatCurrency(totalAmount)} ر.س
              </span>
            </td>
            <td className="text-center font-bold">
              <span className="text-yellow-600">
                {formatCurrency(totalAllocated)} ر.س
              </span>
            </td>
            <td className="text-center font-bold">
              <span className={totalRemaining > 0 ? 'text-red-600' : 'text-green-600'}>
                {formatCurrency(totalRemaining)} ر.س
              </span>
            </td>
            <td className="text-center" colSpan={2}>
              <span className="text-black text-sm">
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
