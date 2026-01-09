import React, { useState, useEffect } from 'react';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import { NumberInput } from '../ui/NumberInput';
import { DateInput } from '../ui/DateInput';
import { useUpdateTransaction, useValidateTransactionEdit } from '../../queries/transactionQueries';
import { useToast } from '../../hooks/useToast';
import ValidationPreviewModal from './ValidationPreviewModal';
import type { TransactionValidationResult, UpdateTransactionPayload } from '../../api/types';
import { TOAST_MESSAGES } from '../../constants/toastMessages';

interface TransactionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: any; // Replace with Transaction type
}

const TransactionEditModal: React.FC<TransactionEditModalProps> = ({
  isOpen,
  onClose,
  transaction
}) => {
  const { success, error } = useToast();
  const updateTransaction = useUpdateTransaction();
  const validateTransaction = useValidateTransactionEdit();

  const [formData, setFormData] = useState<UpdateTransactionPayload>({
    debit: 0,
    credit: 0,
    description: '',
    transaction_date: '',
    reason: ''
  });

  const [validationResult, setValidationResult] = useState<TransactionValidationResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (transaction && isOpen) {
      setFormData({
        debit: transaction.debit || 0,
        credit: transaction.credit || 0,
        description: transaction.description || '',
        transaction_date: transaction.transaction_date ? transaction.transaction_date.split('T')[0] : '',
        reason: ''
      });
      setValidationResult(null);
      setShowPreview(false);
    }
  }, [transaction, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'debit' || name === 'credit' ? parseFloat(value) || 0 : value
    }));
  };

  const handlePreview = async () => {
    // Auto-generate reason if not provided
    const payload = {
      ...formData,
      reason: formData.reason || `تعديل المعاملة #${transaction.id}`
    };
    try {
      const result = await validateTransaction.mutateAsync({
        id: transaction.id,
        payload
      });
      setValidationResult(result);
      setShowPreview(true);
    } catch (err: any) {
      error(TOAST_MESSAGES.OPERATION_FAILED, err.message);
    }
  };

  const handleConfirm = async () => {
    // Auto-generate reason if not provided
    const payload = {
      ...formData,
      reason: formData.reason || `تعديل المعاملة #${transaction.id}`
    };
    try {
      await updateTransaction.mutateAsync({
        id: transaction.id,
        payload
      });
      success(TOAST_MESSAGES.TRANSACTION_UPDATED);
      onClose();
    } catch (err: any) {
      error(TOAST_MESSAGES.OPERATION_FAILED, err.message);
    }
  };

  if (showPreview && validationResult) {
    return (
      <ValidationPreviewModal
        isOpen={isOpen}
        onClose={() => setShowPreview(false)}
        onConfirm={handleConfirm}
        validationResult={validationResult}
        entityType="transaction"
        entityName={`#${transaction.id}`}
        actionType="edit"
        isPending={updateTransaction.isPending}
      />
    );
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`تعديل المعاملة #${transaction?.id}`}
    >
      <div className="space-y-4 dir-rtl" dir="rtl">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <NumberInput
              name="debit"
              value={formData.debit || 0}
              onChange={handleChange}
              label="مدين"
              className="mt-1"
              disabled={formData.credit! > 0}
            />
          </div>
          <div>
            <NumberInput
              name="credit"
              value={formData.credit || 0}
              onChange={handleChange}
              label="دائن"
              className="mt-1"
              disabled={formData.debit! > 0}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">الوصف</label>
          <input
            type="text"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="mt-1 block w-full border rounded-md shadow-sm p-2"
          />
        </div>

        <div>
          <DateInput
            name="transaction_date"
            value={formData.transaction_date || ''}
            onChange={handleChange}
            label="التاريخ"
            className="mt-1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">سبب التعديل (اختياري)</label>
          <textarea
            name="reason"
            value={formData.reason}
            onChange={handleChange}
            className="mt-1 block w-full border rounded-md shadow-sm p-2"
            rows={2}
            placeholder="مطلوب للمراجعة"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            onClick={handlePreview}
            isLoading={validateTransaction.isPending}
          >
            معاينة التغييرات
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};

export default TransactionEditModal;
