import React, { useState } from 'react';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import { useCancelInvoice } from '../../queries/invoiceQueries';
import { useToast } from '../../hooks/useToast';

interface InvoiceCancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any; // Replace with Invoice type
}

const InvoiceCancelModal: React.FC<InvoiceCancelModalProps> = ({
  isOpen,
  onClose,
  invoice
}) => {
  const { success, error } = useToast();
  const cancelInvoice = useCancelInvoice();
  const [reason, setReason] = useState('');

  const handleCancel = async () => {
    try {
      await cancelInvoice.mutateAsync({
        id: invoice.id,
        reason
      });
      success('Invoice cancelled successfully');
      onClose();
    } catch (err: any) {
      error(err.message || 'Cancellation failed');
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Cancel Invoice #${invoice?.id}`}
    >
      <div className="space-y-4">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-yellow-400 text-xl">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Warning</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>This will cancel the invoice and reverse any related transactions.</p>
                <p className="mt-1">This action cannot be undone.</p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Reason for Cancellation (Optional)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 block w-full border rounded-md shadow-sm p-2"
            rows={2}
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={handleCancel}
            isLoading={cancelInvoice.isPending}
          >
            Confirm Cancellation
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};

export default InvoiceCancelModal;
