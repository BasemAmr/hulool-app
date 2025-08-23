import { useTranslation } from 'react-i18next';
import { useModalStore } from '../../stores/modalStore';
import { useDeletePayment, useGetPayment } from '../../queries/paymentQueries';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import type { Payment } from '../../api/types';

interface PaymentDeleteModalProps {
  payment: Payment;
}

const PaymentDeleteModal = () => {
  const { t } = useTranslation();
  const closeModal = useModalStore((state) => state.closeModal);
  
  const props = useModalStore((state) => state.props as PaymentDeleteModalProps);
  const { payment } = props;
  const { data: fetchedPayment, isLoading } = useGetPayment(payment.id);

  const receivableDescription = fetchedPayment?.receivable?.description || '';

  const deletePaymentMutation = useDeletePayment();

  const handleDelete = () => {
    deletePaymentMutation.mutate(payment.id, {
      onSuccess: closeModal,
    });
  };

  return (
    <BaseModal
      isOpen={true}
      onClose={closeModal}
      title={t('payments.deletePayment')}
    >
      {isLoading ? (
        <div className="text-center">{t('common.loading')}</div>
      ) : (
        <>
          <div className="text-center">
            <div className="mb-4">
              <i className="fas fa-exclamation-triangle text-warning" style={{ fontSize: '3rem' }}></i>
            </div>
            <h5 className="mb-3">{t('payments.confirmDeletePayment')}</h5>
            <p className="text-muted">
              {t('payments.deletePaymentMessage', {
                amount: payment.amount,
                description: receivableDescription
              })}
            </p>
            <div className="alert alert-warning">
              <small>
                <strong>{t('common.warning')}:</strong> {t('payments.deletePaymentWarning')}
              </small>
            </div>
          </div>

          <footer className="modal-footer justify-content-center">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={closeModal} 
              disabled={deletePaymentMutation.isPending}
            >
              {t('common.cancel')}
            </Button>
            <Button 
              type="button" 
              variant="danger" 
              onClick={handleDelete} 
              isLoading={deletePaymentMutation.isPending}
            >
              {t('common.delete')}
            </Button>
          </footer>
        </>
      )}
    </BaseModal>
  );
};

export default PaymentDeleteModal;