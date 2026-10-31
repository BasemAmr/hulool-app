import React, { useState, useEffect } from 'react';
import BaseModal from '@/shared/ui/layout/BaseModal';
import Button from '@/shared/ui/primitives/Button';
import { useUpdateTransaction, useValidateTransactionEdit } from '@/features/financials/api/transactionQueries';
import { useToast } from '@/shared/hooks/useToast';
import ValidationPreviewModal from '@/features/tasks/modals/ValidationPreviewModal';
import type { TransactionValidationResult, UpdateTransactionPayload } from '@/api/types';
import { TOAST_MESSAGES } from '@/shared/constants/toastMessages';

function parseDateTimeParts(raw: any): { date: string; time: string } {
  if (!raw) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return { date: `${y}-${m}-${d}`, time: `${hh}:${mm}:${ss}` };
  }

  const str = String(raw).trim().replace('Z', '').split('.')[0];
  let d = '';
  let t = '00:00:00';

  if (str.includes('T')) {
    const parts = str.split('T');
    d = parts[0] || '';
    t = parts[1] || '00:00:00';
  } else if (str.includes(' ')) {
    const parts = str.split(' ');
    d = parts[0] || '';
    t = parts[1] || '00:00:00';
  } else {
    d = str;
  }

  if (d.includes('/')) {
    const slashParts = d.split('/');
    if (slashParts[0].length === 4) {
      d = `${slashParts[0]}-${slashParts[1].padStart(2, '0')}-${slashParts[2].padStart(2, '0')}`;
    } else if (slashParts[2]?.length === 4) {
      d = `${slashParts[2]}-${slashParts[1].padStart(2, '0')}-${slashParts[0].padStart(2, '0')}`;
    }
  }

  const timeParts = t.split(':');
  if (timeParts.length === 2) {
    t = `${timeParts[0].padStart(2, '0')}:${timeParts[1].padStart(2, '0')}:00`;
  } else if (timeParts.length >= 3) {
    t = `${timeParts[0].padStart(2, '0')}:${timeParts[1].padStart(2, '0')}:${timeParts[2].substring(0, 2).padStart(2, '0')}`;
  }

  return { date: d, time: t };
}

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

  const [datePart, setDatePart] = useState<string>('');
  const [timePart, setTimePart] = useState<string>('00:00:00');

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
      // Parse transaction date and time
      const rawDate = transaction.transaction_date || transaction.created_at || transaction.date || '';
      const { date: initialDate, time: initialTime } = parseDateTimeParts(rawDate);

      setDatePart(initialDate);
      setTimePart(initialTime);

      setFormData({
        debit: Number(transaction.debit || 0),
        credit: Number(transaction.credit || 0),
        description: transaction.description || '',
        transaction_date: `${initialDate} ${initialTime}`,
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

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setDatePart(newDate);
    setFormData(prev => ({
      ...prev,
      transaction_date: newDate ? `${newDate} ${timePart || '00:00:00'}` : ''
    }));
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newTime = e.target.value;
    if (newTime && newTime.split(':').length === 2) {
      newTime = `${newTime}:00`;
    }
    setTimePart(newTime);
    setFormData(prev => ({
      ...prev,
      transaction_date: datePart ? `${datePart} ${newTime}` : ''
    }));
  };

  const handlePreview = async () => {
    if (!formData.reason) {
      error(TOAST_MESSAGES.VALIDATION_ERROR, 'سبب التعديل مطلوب');
      return;
    }
    const finalDateTime = datePart ? `${datePart} ${timePart || '00:00:00'}` : formData.transaction_date;
    const submissionPayload = {
      ...formData,
      transaction_date: finalDateTime
    };

    try {
      const result = await validateTransaction.mutateAsync({
        id: transaction.id,
        payload: submissionPayload
      });
      setValidationResult(result);
      setShowPreview(true);
    } catch (err: any) {
      error(TOAST_MESSAGES.OPERATION_FAILED, err.message);
    }
  };

  const handleConfirm = async () => {
    const finalDateTime = datePart ? `${datePart} ${timePart || '00:00:00'}` : formData.transaction_date;
    const submissionPayload = {
      ...formData,
      transaction_date: finalDateTime
    };

    try {
      await updateTransaction.mutateAsync({
        id: transaction.id,
        payload: submissionPayload
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
      className="max-w-xl"
    >
      <div className="space-y-4 dir-rtl p-1" dir="rtl">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">مدين</label>
            <input
              type="number"
              step="any"
              name="debit"
              value={formData.debit}
              onChange={handleChange}
              className="w-full rounded-lg border border-border-default bg-background p-2.5 text-sm font-medium text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all disabled:opacity-50"
              disabled={formData.credit! > 0}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">دائن</label>
            <input
              type="number"
              step="any"
              name="credit"
              value={formData.credit}
              onChange={handleChange}
              className="w-full rounded-lg border border-border-default bg-background p-2.5 text-sm font-medium text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all disabled:opacity-50"
              disabled={formData.debit! > 0}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1.5">الوصف (البيان)</label>
          <input
            type="text"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="w-full rounded-lg border border-border-default bg-background p-2.5 text-sm font-medium text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
            placeholder="اكتب بيان الحركة..."
          />
        </div>

        {/* Date and Time row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">تاريخ المعاملة</label>
            <input
              type="date"
              value={datePart}
              onChange={handleDateChange}
              className="w-full rounded-lg border border-border-default bg-background p-2.5 text-sm font-medium text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">وقت المعاملة (HH:MM:SS)</label>
            <input
              type="time"
              step="1"
              value={timePart}
              onChange={handleTimeChange}
              className="w-full rounded-lg border border-border-default bg-background p-2.5 text-sm font-medium text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1.5">
            سبب التعديل <span className="text-status-danger-text">*</span>
          </label>
          <textarea
            name="reason"
            value={formData.reason}
            onChange={handleChange}
            className="w-full rounded-lg border border-border-default bg-background p-2.5 text-sm font-medium text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all resize-none"
            rows={2}
            placeholder="مطلوب للمراجعة وسجل التدقيق..."
          />
        </div>

        <div className="flex justify-end gap-2.5 pt-4 border-t border-border-default">
          <Button variant="outline-danger" size="sm" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            size="sm"
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
