import React, { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import { useModalStore } from '../../stores/modalStore';
import { useToast } from '../../hooks/useToast';
import { useUpdateEmployeeTransaction } from '../../queries/employeeQueries';

interface EditPayoutFormData {
  amount: string;
  notes: string;
}

const EditEmployeePayoutModal = () => {
  const { success, error } = useToast();
  const { isOpen, modalType, props, closeModal } = useModalStore();
  const updateTransactionMutation = useUpdateEmployeeTransaction();

  const [formData, setFormData] = useState<EditPayoutFormData>({
    amount: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Partial<EditPayoutFormData>>({});

  const isModalOpen = isOpen && modalType === 'editEmployeePayout';
  const { employee, transaction } = props || {};
  const employeeTableId = employee?.id;
  const employeeUserId = employee?.user_id;

  // Initialize form data when modal opens
  useEffect(() => {
    if (isModalOpen && transaction) {
      setFormData({
        amount: transaction.amount || '',
        notes: transaction.notes || '',
      });
    }
  }, [isModalOpen, transaction]);

  const validateForm = (): boolean => {
    const newErrors: Partial<EditPayoutFormData> = {};

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !employeeTableId || !employeeUserId || !transaction) return;

    try {
      const updateData = {
        amount: parseFloat(formData.amount),
        notes: formData.notes,
      };

      await updateTransactionMutation.mutateAsync({ 
        employeeTableId,
        employeeUserId,
        transactionId: parseInt(transaction.id, 10),
        data: updateData
      });

      success('Payout updated successfully');
      closeModal();
      
      // Call onSuccess callback if provided
      if (props?.onSuccess) {
        props.onSuccess();
      }
    } catch (err: any) {
      error(err.message || 'Failed to update payout');
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

  const handleInputChange = (field: keyof EditPayoutFormData, value: string) => {
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
      title="Edit Payout"
    >
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="edit-payout-amount" className="form-label">
            Amount <span className="text-danger">*</span>
          </label>
          <div className="input-group">
            <span className="input-group-text">SAR</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              className={`form-control ${errors.amount ? 'is-invalid' : ''}`}
              id="edit-payout-amount"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              placeholder="Enter payout amount"
              required
            />
            {errors.amount && (
              <div className="invalid-feedback">{errors.amount}</div>
            )}
          </div>
        </div>

        <div className="mb-3">
          <label htmlFor="edit-payout-notes" className="form-label">
            Notes
          </label>
          <textarea
            className="form-control"
            id="edit-payout-notes"
            rows={3}
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Optional notes about this payout"
          />
        </div>

        <div className="d-flex justify-content-end gap-2">
          <Button
            type="button"
            variant="outline-secondary"
            onClick={handleClose}
          >
            <X size={16} className="me-1" />
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={updateTransactionMutation.isPending}
          >
            <Save size={16} className="me-1" />
            Update Payout
          </Button>
        </div>
      </form>
    </BaseModal>
  );
};

export default EditEmployeePayoutModal;
