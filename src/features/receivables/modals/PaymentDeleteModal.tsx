import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { useModalStore } from '@/shared/stores/modalStore';
import { useDeletePayment, useGetPayment } from '@/features/receivables/api/paymentQueries';
import { useToast } from '@/shared/hooks/useToast';
import { TOAST_MESSAGES } from '@/shared/constants/toastMessages';
import { getErrorMessage } from '@/shared/utils/errorUtils';
import BaseModal from '@/shared/ui/layout/BaseModal';
import Button from '@/shared/ui/primitives/Button';
import type { Payment } from '@/api/types';

interface PaymentDeleteModalProps {
  payment: Payment;
}

const PaymentDeleteModal = () => {
  const { t } = useTranslation();
  const closeModal = useModalStore((state) => state.closeModal);
  const { success, error } = useToast();
  
  const props = useModalStore((state) => state.props as PaymentDeleteModalProps);
  const { payment } = props;
  const { data: fetchedPayment, isLoading } = useGetPayment(payment.id);

  const receivableDescription = fetchedPayment?.receivable?.description || '';

  const deletePaymentMutation = useDeletePayment();

  const handleDelete = () => {
    deletePaymentMutation.mutate(payment.id, {
      onSuccess: () => {
        success(TOAST_MESSAGES.PAYMENT_DELETED, 'تم حذف الدفعة بنجاح');
        closeModal();
      },
      onError: (err: any) => {
        error(TOAST_MESSAGES.DELETE_FAILED, getErrorMessage(err, 'فشل حذف الدفعة'));
      }
    });
  };

  return (
    <BaseModal
      isOpen={true}
      onClose={closeModal}
      title={t('payments.deletePayment')}
    >
      {isLoading ? (
        <div className="text-center text-muted-foreground py-8">{t('common.loading')}</div>
      ) : (
        <div className="space-y-4">
          {/* Icon & Heading */}
          <div className="text-center space-y-2">
            <AlertTriangle className="h-12 w-12 text-status-warning-text mx-auto" />
            <h5 className="text-lg font-semibold text-text-primary">{t('payments.confirmDeletePayment')}</h5>
            <p className="text-muted-foreground text-sm">
              {t('payments.deletePaymentMessage', {
                amount: payment.amount,
                description: receivableDescription
              })}
            </p>
          </div>

          {/* Warning Alert */}
          <div className="rounded-lg border border-status-warning-border bg-status-warning-bg p-3 flex gap-3">
            <AlertTriangle className="text-status-warning-text flex-shrink-0 mt-0.5 h-5 w-5" />
            <div>
              <p className="font-medium text-yellow-900 text-sm">{t('common.warning')}:</p>
              <p className="text-status-warning-text text-sm">{t('payments.deletePaymentWarning')}</p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-center gap-2 pt-4 border-t border-border">
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
          </div>
        </div>
      )}
    </BaseModal>
  );
};

export default PaymentDeleteModal;