import React, { useState } from 'react';
import BaseModal from '@/shared/ui/layout/BaseModal';
import Button from '@/shared/ui/primitives/Button';
import { useReassignCashBoxEmployee } from '../api/cashBoxQueries';
import { useGetEmployeesForSelection } from '@/features/employees/api/employeeQueries';
import { useToast } from '@/shared/hooks/useToast';
import type { CashBox } from '@/api/types';

interface ReassignCashBoxEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  cashBox: CashBox;
  onSuccess?: () => void;
}

export const ReassignCashBoxEmployeeModal: React.FC<ReassignCashBoxEmployeeModalProps> = ({
  isOpen,
  onClose,
  cashBox,
  onSuccess,
}) => {
  const { success, error } = useToast();
  const { data: employees = [], isLoading: isLoadingEmployees } = useGetEmployeesForSelection();
  const reassignMutation = useReassignCashBoxEmployee();

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

  const handleSubmit = async () => {
    if (!selectedEmployeeId) return;

    try {
      await reassignMutation.mutateAsync({
        boxId: cashBox.id,
        employee_id: parseInt(selectedEmployeeId, 10),
      });
      success('تم إعادة تعيين الموظف بنجاح');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      error(err.response?.data?.message || err.message || 'فشل إعادة التعيين');
    }
  };

  const isClosed = cashBox.status === 'closed';

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`إعادة تعيين الموظف المسؤول - ${cashBox.name}`}
    >
      <div className="space-y-4" dir="rtl">
        {/* Current employee info */}
        <div className="p-3 bg-muted/30 rounded-lg border border-border-default">
          <p className="text-sm text-text-secondary">الموظف الحالي</p>
          <p className="text-base font-semibold text-text-primary mt-1">
            {cashBox.employee_name || '—'}
          </p>
        </div>

        {isClosed ? (
          <div className="p-3 bg-status-warning-bg/20 rounded-lg border border-status-warning-border">
            <p className="text-sm text-status-warning-text">
              الصندوق مغلق ولا يمكن إعادة تعيين الموظف.
            </p>
          </div>
        ) : (
          <>
            {/* New employee selector */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-secondary block">
                الموظف الجديد
              </label>
              {isLoadingEmployees ? (
                <div className="text-sm text-text-secondary py-2">جاري تحميل الموظفين...</div>
              ) : (
                <select
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                >
                  <option value="">اختر موظف...</option>
                  {employees
                    .filter((emp: any) => emp.user_id)
                    .map((emp: any) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.display_name}
                      </option>
                    ))}
                </select>
              )}
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button variant="outline-secondary" onClick={onClose}>
                إلغاء
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={!selectedEmployeeId || reassignMutation.isPending}
                isLoading={reassignMutation.isPending}
              >
                تأكيد إعادة التعيين
              </Button>
            </div>
          </>
        )}
      </div>
    </BaseModal>
  );
};
