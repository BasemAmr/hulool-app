import React, { useState } from 'react';
import { Save, X } from 'lucide-react';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import { useModalStore } from '../../stores/modalStore';
import { useToast } from '../../hooks/useToast';
import { useAddEmployeeBorrow } from '../../queries/employeeQueries';
import { TOAST_MESSAGES } from '../../constants/toastMessages';

interface BorrowFormData {
  amount: string;
  notes: string;
}

const EmployeeBorrowModal = () => {
  const { success, error } = useToast();
  const { isOpen, modalType, props, closeModal } = useModalStore();
  const addBorrowMutation = useAddEmployeeBorrow();

  const [formData, setFormData] = useState<BorrowFormData>({
    amount: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Partial<BorrowFormData>>({});

  const isModalOpen = isOpen && modalType === 'employeeBorrow';
  const { employee } = props || {};
  const employeeTableId = employee?.id;
  const employeeUserId = employee?.user_id;

  const validateForm = (): boolean => {
    const newErrors: Partial<BorrowFormData> = {};

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
    if (!validateForm()  || !employeeUserId) return;

    try {
      const borrowData = {
        amount: parseFloat(formData.amount),
        notes: formData.notes,
      };

      console.log(borrowData);

      await addBorrowMutation.mutateAsync({
        employeeUserId,
        borrowData
      });

      success(TOAST_MESSAGES.BORROW_RECORDED);

      // Reset form
      setFormData({
        amount: '',
        notes: '',
      });
      setErrors({});

      closeModal();

      // Call onSuccess callback if provided
      if (props?.onSuccess) {
        props.onSuccess();
      }
    } catch (err: any) {
      error(err.message || TOAST_MESSAGES.OPERATION_FAILED);
    }
  };

  const handleClose = () => {
    // Reset form data on close
    setFormData({
      amount: '',
      notes: '',
    });
    setErrors({});
    closeModal();
  };

  const handleInputChange = (field: keyof BorrowFormData, value: string) => {
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
      title={`تسجيل مبلغ - ${employee?.display_name || 'موظف'}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="borrow-amount" className="font-semibold text-black text-sm block">
            المبلغ <span className="text-destructive">*</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="px-3 py-2 border border-border rounded-md bg-muted text-sm font-medium">ريال</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${errors.amount ? 'border-destructive bg-destructive/5' : 'border-border'}`}
              id="borrow-amount"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              placeholder="أدخل مبلغ"
              required
            />
          </div>
          {errors.amount && (
            <div className="text-destructive text-sm">{errors.amount}</div>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="borrow-notes" className="font-semibold text-black text-sm block">
            ملاحظات
          </label>
          <textarea
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            id="borrow-notes"
            rows={3}
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="ملاحظات اختيارية حول هذه"
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
            isLoading={addBorrowMutation.isPending}
          >
            <Save size={16} className="mr-1" />
            تسجيل
          </Button>
        </div>
      </form>
    </BaseModal>
  );
};

export default EmployeeBorrowModal;