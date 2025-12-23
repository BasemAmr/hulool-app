import React, { useState } from 'react';
import { Save, X } from 'lucide-react';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import { useModalStore } from '../../stores/modalStore';
import { useToast } from '../../hooks/useToast';
import { useAddEmployeePayout } from '../../queries/employeeQueries';
import { TOAST_MESSAGES } from '../../constants/toastMessages';

interface PayoutFormData {
  amount: string;
  notes: string;
  type: 'PAYOUT' | 'BONUS' | 'SALARY';
}

const EmployeePayoutModal = () => {
  const { success, error } = useToast();
  const { isOpen, modalType, props, closeModal } = useModalStore();
  const addPayoutMutation = useAddEmployeePayout();

  const [formData, setFormData] = useState<PayoutFormData>({
    amount: '',
    notes: '',
    type: 'PAYOUT',
  });

  const [errors, setErrors] = useState<Partial<PayoutFormData>>({});

  const isModalOpen = isOpen && modalType === 'employeePayout';
  const { employee } = props || {};
  const employeeTableId = employee?.id;
  const employeeUserId = employee?.user_id;

  const validateForm = (): boolean => {
    const newErrors: Partial<PayoutFormData> = {};

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'مطلوب إدخال مبلغ صحيح';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log(formData);
    console.log('Employee Table ID:', employeeTableId);
    console.log('Employee User ID:', employeeUserId);
    console.log(validateForm());
    if (!validateForm() || !employeeUserId) return;

    try {
      const payoutData = {
        amount: parseFloat(formData.amount),
        notes: formData.notes,
        type: formData.type,
      };

      console.log(payoutData);

      await addPayoutMutation.mutateAsync({
        employeeUserId,
        payoutData
      });

      success(TOAST_MESSAGES.EMPLOYEE_PAYOUT_RECORDED);

      // Reset form
      setFormData({
        amount: '',
        notes: '',
        type: 'PAYOUT',
      });
      setErrors({});

      closeModal();

      // Call onSuccess callback if provided
      if (props?.onSuccess) {
        props.onSuccess();
      }
    } catch (err: any) {
      error(TOAST_MESSAGES.OPERATION_FAILED, err.message);
    }
  };

  const handleClose = () => {
    // Reset form data on close
    setFormData({
      amount: '',
      notes: '',
      type: 'PAYOUT',
    });
    setErrors({});
    closeModal();
  };

  const handleInputChange = (field: keyof PayoutFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <BaseModal
      isOpen={isModalOpen}
      onClose={handleClose}
      title={`تسجيل صرف - ${employee?.display_name || 'موظف'}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="payout-amount" className="font-semibold text-black text-sm block">
            المبلغ <span className="text-destructive">*</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="px-3 py-2 border border-border rounded-md bg-muted text-sm font-medium">ريال</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${errors.amount ? 'border-destructive bg-destructive/5' : 'border-border'}`}
              id="payout-amount"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              placeholder="أدخل مبلغ الصرف"
              required
            />
          </div>
          {errors.amount && (
            <div className="text-destructive text-sm">{errors.amount}</div>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="payout-type" className="font-semibold text-black text-sm block">
            نوع الصرف <span className="text-destructive">*</span>
          </label>
          <select
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${errors.type ? 'border-destructive bg-destructive/5' : 'border-border'}`}
            id="payout-type"
            value={formData.type}
            onChange={(e) => handleInputChange('type', e.target.value as PayoutFormData['type'])}
            required
          >
            <option value="PAYOUT">صرف عام</option>
            <option value="BONUS">مكافأة</option>
            <option value="SALARY">راتب</option>
          </select>
          {errors.type && (
            <div className="text-destructive text-sm">{errors.type}</div>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="payout-notes" className="font-semibold text-black text-sm block">
            ملاحظات
          </label>
          <textarea
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            id="payout-notes"
            rows={3}
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="ملاحظات اختيارية حول هذا الصرف"
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline-secondary"
            onClick={handleClose}
          >
            <X size={16} className="mr-1" />
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={addPayoutMutation.isPending}
          >
            <Save size={16} className="mr-1" />
            تسجيل الصرف
          </Button>
        </div>
      </form>
    </BaseModal>
  );
};

export default EmployeePayoutModal;
