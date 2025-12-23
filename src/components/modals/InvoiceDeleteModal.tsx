import React from 'react';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import { useDeleteInvoice } from '../../queries/invoiceQueries';
import { useToast } from '../../hooks/useToast';
import { TOAST_MESSAGES } from '../../constants/toastMessages';

interface InvoiceDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
}

const InvoiceDeleteModal: React.FC<InvoiceDeleteModalProps> = ({
  isOpen,
  onClose,
  invoice
}) => {
  const { success, error } = useToast();
  const deleteInvoice = useDeleteInvoice();

  const handleDelete = async () => {
    try {
      await deleteInvoice.mutateAsync(invoice.id);
      success(TOAST_MESSAGES.INVOICE_DELETED);
      onClose();
    } catch (err: any) {
      error(TOAST_MESSAGES.OPERATION_FAILED, err.message);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`حذف الفاتورة #${invoice?.id}`}
    >
      <div className="space-y-4" dir="rtl">
        <div className="bg-red-50 border-r-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0 ml-3">
              <span className="text-red-400 text-xl">⚠️</span>
            </div>
            <div>
              <h3 className="text-sm font-medium text-red-800">تنبيه</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>هل أنت متأكد من رغبتك في حذف هذه الفاتورة؟</p>
                <p className="mt-1">لا يمكن التراجع عن هذا الإجراء.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            isLoading={deleteInvoice.isPending}
          >
            حذف الفاتورة
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};

export default InvoiceDeleteModal;
