import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import { useModalStore } from '../../stores/modalStore';
import { useToast } from '../../hooks/useToast';
import { useAddEmployeeManualCredit } from '../../queries/employeeQueries';

interface ManualCreditFormData {
  amount: string;
  reason: string;
  notes: string;
}

const EmployeeManualCreditModal = () => {
  const { success, error } = useToast();
  const { isOpen, modalType, props, closeModal } = useModalStore();
  const addManualCreditMutation = useAddEmployeeManualCredit();

  const [formData, setFormData] = useState<ManualCreditFormData>({
    amount: '',
    reason: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Partial<ManualCreditFormData>>({});

  const isModalOpen = isOpen && modalType === 'employeeManualCredit';
  const { employee } = props || {};
  const employeeUserId = employee?.user_id;

  const validateForm = (): boolean => {
    const newErrors: Partial<ManualCreditFormData> = {};

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'مطلوب إدخال مبلغ صحيح';
    }

    if (!formData.reason || formData.reason.trim() === '') {
      newErrors.reason = 'السبب مطلوب';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !employeeUserId) return;

    try {
      const creditData = {
        amount: parseFloat(formData.amount),
        reason: formData.reason.trim(),
        notes: formData.notes.trim(),
      };

      await addManualCreditMutation.mutateAsync({ 
        employeeUserId, 
        creditData 
      });
      
      success('تم تسجيل الرصيد بنجاح');
      
      // Reset form
      setFormData({
        amount: '',
        reason: '',
        notes: '',
      });
      setErrors({});
      
      closeModal();
      
      // Call onSuccess callback if provided
      if (props?.onSuccess) {
        props.onSuccess();
      }
    } catch (err: any) {
      error(err.message || 'فشل في تسجيل الرصيد');
    }
  };

  const handleClose = () => {
    // Reset form data on close
    setFormData({
      amount: '',
      reason: '',
      notes: '',
    });
    setErrors({});
    closeModal();
  };

  const handleInputChange = (field: keyof ManualCreditFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Predefined common reasons
  const commonReasons = [
    'مكافأة',
    'مستحقات سابقة',
    'تعديل',
    'عمولة يدوية',
    'حافز',
  ];

  return (
    <BaseModal
      isOpen={isModalOpen}
      onClose={handleClose}
      title={`تسجيل رصيد - ${employee?.display_name || 'موظف'}`}
    >
      <form onSubmit={handleSubmit}>
        {/* Amount */}
        <div className="mb-3">
          <label htmlFor="credit-amount" className="form-label">
            المبلغ <span className="text-danger">*</span>
          </label>
          <div className="input-group">
            <span className="input-group-text">ريال</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              className={`form-control ${errors.amount ? 'is-invalid' : ''}`}
              id="credit-amount"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              placeholder="أدخل مبلغ الرصيد"
              required
            />
            {errors.amount && (
              <div className="invalid-feedback">{errors.amount}</div>
            )}
          </div>
        </div>

        {/* Reason */}
        <div className="mb-3">
          <label htmlFor="credit-reason" className="form-label">
            السبب <span className="text-danger">*</span>
          </label>
          <select
            className={`form-select ${errors.reason ? 'is-invalid' : ''}`}
            id="credit-reason"
            value={formData.reason}
            onChange={(e) => handleInputChange('reason', e.target.value)}
            required
          >
            <option value="">اختر السبب</option>
            {commonReasons.map((reason) => (
              <option key={reason} value={reason}>
                {reason}
              </option>
            ))}
            <option value="__custom__">أخرى (تحديد مخصص)</option>
          </select>
          {errors.reason && (
            <div className="invalid-feedback d-block">{errors.reason}</div>
          )}
        </div>

        {/* Custom Reason (if selected) */}
        {formData.reason === '__custom__' && (
          <div className="mb-3">
            <label htmlFor="credit-custom-reason" className="form-label">
              السبب المخصص <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              className="form-control"
              id="credit-custom-reason"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="اكتب السبب المخصص"
              required
            />
          </div>
        )}

        {/* Notes */}
        {formData.reason !== '__custom__' && (
          <div className="mb-3">
            <label htmlFor="credit-notes" className="form-label">
              ملاحظات
            </label>
            <textarea
              className="form-control"
              id="credit-notes"
              rows={3}
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="ملاحظات إضافية اختيارية"
            />
          </div>
        )}

        {/* Info Box */}
        <div className="alert alert-info small mb-3">
          <strong>ملاحظة:</strong> تسجيل رصيد يزيد من المبلغ المستحق للموظف. سيتم إضافة هذا المبلغ إلى الرصيد الحالي للموظف.
        </div>

        {/* Action Buttons */}
        <div className="d-flex justify-content-end gap-2">
          <Button
            type="button"
            variant="outline-secondary"
            onClick={handleClose}
          >
            <X size={16} className="me-1" />
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="outline-success"
            isLoading={addManualCreditMutation.isPending}
          >
            <Plus size={16} className="me-1" />
            تسجيل الرصيد
          </Button>
        </div>
      </form>
    </BaseModal>
  );
};

export default EmployeeManualCreditModal;
