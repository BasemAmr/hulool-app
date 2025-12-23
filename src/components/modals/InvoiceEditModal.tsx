import React, { useState, useEffect } from 'react';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import { useUpdateInvoice, useValidateInvoiceEdit } from '../../queries/invoiceQueries';
import { useToast } from '../../hooks/useToast';
import { TOAST_MESSAGES } from '../../constants/toastMessages';
import ValidationPreviewModal from '../modals/ValidationPreviewModal';
import type { InvoiceValidationResult, UpdateInvoicePayload } from '../../api/types';

interface InvoiceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
}

const InvoiceEditModal: React.FC<InvoiceEditModalProps> = ({
  isOpen,
  onClose,
  invoice
}) => {
  const { success, error } = useToast();
  const updateInvoice = useUpdateInvoice();
  const validateInvoice = useValidateInvoiceEdit();

  const [formData, setFormData] = useState<UpdateInvoicePayload>({
    amount: 0
  });

  const [validationResult, setValidationResult] = useState<InvoiceValidationResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (invoice && isOpen) {
      setFormData({
        amount: invoice.amount || 0
      });
      setValidationResult(null);
      setShowPreview(false);
    }
  }, [invoice, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || 0 : value
    }));
  };

  const handlePreview = async () => {
    try {
      const result = await validateInvoice.mutateAsync({
        invoiceId: invoice.id,
        proposed: formData
      });
      setValidationResult(result);
      setShowPreview(true);
    } catch (err: any) {
      error(TOAST_MESSAGES.OPERATION_FAILED, err.message);
    }
  };

  const handleConfirm = async () => {
    try {
      await updateInvoice.mutateAsync({
        id: invoice.id,
        payload: formData
      });
      success(TOAST_MESSAGES.INVOICE_UPDATED);
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
        entityType="invoice"
        entityName={`#${invoice.id}`}
        actionType="edit"
        isPending={updateInvoice.isPending}
      />
    );
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`تعديل الفاتورة #${invoice?.id}`}
    >
      <div className="space-y-4 dir-rtl" dir="rtl">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            المبلغ الحالي
          </label>
          <div className="mt-1 p-2 bg-gray-100 rounded-md font-medium">
            {invoice?.amount} SAR
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            المبلغ الجديد *
          </label>
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            className="mt-1 block w-full border rounded-md shadow-sm p-2"
            step="0.01"
            min="0"
            required
          />
        </div>

        {invoice?.paid_amount > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md text-sm">
            <p className="font-medium text-yellow-800">⚠️ تحذير</p>
            <p className="text-yellow-700 mt-1">
              تحتوي هذه الفاتورة على مدفوعات بقيمة {invoice.paid_amount} ر.س.
              تغيير المبلغ قد يؤثر على حالة السداد.
            </p>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            onClick={handlePreview}
            isLoading={validateInvoice.isPending}
            disabled={formData.amount === invoice?.amount}
          >
            معاينة التغييرات
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};

export default InvoiceEditModal;
