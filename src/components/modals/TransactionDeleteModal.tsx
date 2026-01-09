import React, { useState } from 'react';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import { useDeleteTransaction } from '../../queries/transactionQueries';
import { useToast } from '../../hooks/useToast';
import { TOAST_MESSAGES } from '../../constants/toastMessages';

interface TransactionDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: any; // Replace with Transaction type
}

const TransactionDeleteModal: React.FC<TransactionDeleteModalProps> = ({
  isOpen,
  onClose,
  transaction
}) => {
  const { success, error } = useToast();
  const deleteTransaction = useDeleteTransaction();
  const [reason, setReason] = useState('');

  const handleDelete = async () => {
    // Auto-generate reason if not provided
    const deleteReason = reason || `حذف المعاملة #${transaction.id}`;
    try {
      await deleteTransaction.mutateAsync({
        id: transaction.id,
        reason: deleteReason
      });
      success(TOAST_MESSAGES.TRANSACTION_DELETED);
      onClose();
    } catch (err: any) {
      error(TOAST_MESSAGES.OPERATION_FAILED, err.message || 'Delete failed');
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`حذف المعاملة #${transaction?.id}`}
    >
      <div className="space-y-4 dir-rtl" dir="rtl">
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400 text-xl">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">تحذير</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>سيتم حذف العمليتين المقترنتين (الجانبين). لا يمكن التراجع عن هذا الإجراء.</p>
                {transaction?.related_transaction_id && (
                  <p className="mt-1">المعاملة المقترنة: #{transaction.related_transaction_id}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">سبب الحذف (اختياري)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 block w-full border rounded-md shadow-sm p-2"
            rows={3}
            placeholder="مطلوب للمراجعة"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            isLoading={deleteTransaction.isPending}
          >
            حذف المعاملة
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};

export default TransactionDeleteModal;
