import React, { useState, useEffect } from 'react';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import { useUpdateTransaction, useValidateTransactionEdit } from '../../queries/transactionQueries';
import { useToast } from '../../hooks/useToast';
import ValidationPreviewModal from './ValidationPreviewModal';
import type { TransactionValidationResult, UpdateTransactionPayload } from '../../api/types';

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
    if (!formData.reason) {
      error('Reason is required');
      return;
    }
    try {
      const result = await validateTransaction.mutateAsync({
        id: transaction.id,
        payload: formData
      });
      setValidationResult(result);
      setShowPreview(true);
    } catch (err: any) {
      error(err.message || 'Validation failed');
    }
  };

  const handleConfirm = async () => {
    try {
      await updateTransaction.mutateAsync({
        id: transaction.id,
        payload: formData
      });
      success('Transaction updated successfully');
      onClose();
    } catch (err: any) {
      error(err.message || 'Update failed');
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
            <label className="block text-sm font-medium text-gray-700">مدين</label>
            <input
              type="number"
              name="debit"
              value={formData.debit}
              onChange={handleChange}
              className="mt-1 block w-full border rounded-md shadow-sm p-2"
              disabled={formData.credit! > 0}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">دائن</label>
            <input
              type="number"
              name="credit"
              value={formData.credit}
              onChange={handleChange}
              className="mt-1 block w-full border rounded-md shadow-sm p-2"
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
          <label className="block text-sm font-medium text-gray-700">التاريخ</label>
          <input
            type="date"
            name="transaction_date"
            value={formData.transaction_date}
            onChange={handleChange}
            className="mt-1 block w-full border rounded-md shadow-sm p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">سبب التعديل <span className="text-red-500">*</span></label>
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
