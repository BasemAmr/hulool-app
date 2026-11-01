import React from 'react';
import VoucherDetailsModal from './VoucherDetailsModal';

interface TransactionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: any;
  onSuccess?: () => void;
}

const TransactionEditModal: React.FC<TransactionEditModalProps> = ({
  isOpen,
  onClose,
  transaction,
}) => {
  return (
    <VoucherDetailsModal
      voucher={transaction}
      initialEditing={true}
      isOpen={isOpen}
      onClose={onClose}
    />
  );
};

export default TransactionEditModal;
