import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useModalStore } from '@/shared/stores/modalStore';
import { useUpdatePayment, useGetPaymentMethods } from '@/features/receivables/api/paymentQueries';
import { useGetClientCredits } from '@/features/clients/api/clientCreditQueries';
import { useToast } from '@/shared/hooks/useToast';
import { TOAST_MESSAGES } from '@/shared/constants/toastMessages';
import { getErrorMessage } from '@/shared/utils/errorUtils';
import BaseModal from '@/shared/ui/layout/BaseModal';
import Button from '@/shared/ui/primitives/Button';
import Input from '@/shared/ui/primitives/Input';
import { NumberInput } from '@/shared/ui/primitives/NumberInput';
import { DateInput } from '@/shared/ui/primitives/DateInput';
import type { Payment, Receivable } from '@/api/types';

interface PaymentEditModalProps {
  payment: Payment;
  receivable: Receivable;
}

const PaymentEditModal = () => {
  const { t } = useTranslation();
  const closeModal = useModalStore((state) => state.closeModal);
  const openModal = useModalStore(state => state.openModal);
  const { success, error } = useToast();

  const props = useModalStore((state) => state.props as PaymentEditModalProps);
  const { payment, receivable } = props;

  const { data: paymentMethods, isLoading: isLoadingMethods } = useGetPaymentMethods();
  const updatePaymentMutation = useUpdatePayment();

  // Fetch client credits for credit application
  const { data: creditData } = useGetClientCredits(Number(receivable.client_id));
  const availableCredit = creditData?.balance || 0;

  const { register, handleSubmit, control, formState: { errors }, watch, setValue } = useForm({
    defaultValues: {
      amount: payment.amount,
      payment_method_id: payment.payment_method_id,
      paid_at: payment.paid_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      note: payment.note || '',
    },
  });

  const onSubmit = (data: any) => {
    updatePaymentMutation.mutate({
      id: payment.id,
      ...data,
      amount: Number(data.amount)
    }, {
      onSuccess: () => {
        success(TOAST_MESSAGES.PAYMENT_UPDATED, 'تم تحديث الدفعة بنجاح');
        closeModal();
      },
      onError: (err: any) => {
        error(TOAST_MESSAGES.UPDATE_FAILED, getErrorMessage(err, 'فشل تحديث الدفعة'));
      }
    });
  };

  const handleApplyCredit = () => {
    closeModal();
    openModal('applyCreditModal', {
      receivable,
      availableCredit,
      paymentToReplace: payment
    });
  };

  return (
    <BaseModal
      isOpen={true}
      onClose={closeModal}
      title={t('payments.editPayment')}
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        {availableCredit > 0 && (
          <div className="alert alert-success d-flex justify-content-between align-items-center">
            <span>
              لدى العميل رصيد متاح: <strong>{availableCredit.toLocaleString()} ريال</strong>
            </span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleApplyCredit}
            >
              تطبيق من الرصيد
            </Button>
          </div>
        )}

        <NumberInput
          label={t('payments.amountLabel')}
          name="amount"
          value={watch('amount') || 0}
          onChange={(e) => setValue('amount', parseFloat(e.target.value) || 0)}
          className="mb-3"
        />

        <div className="mb-3">
          <label className="form-label">{t('payments.methodLabel')}</label>
          <Controller
            name="payment_method_id"
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <select {...field} value={field.value?.toString() || ''} className={`form-select ${errors.payment_method_id ? 'is-invalid' : ''}`} disabled={isLoadingMethods}>
                <option value="">{t('payments.selectMethod')}</option>
                {paymentMethods?.map(method => (
                  <option key={method.id} value={method.id}>{method.name}</option>
                ))}
              </select>
            )}
          />
          {errors.payment_method_id && <div className="invalid-feedback d-block">Required</div>}
        </div>

        <DateInput
          label={t('payments.dateLabel')}
          name="paid_at"
          value={watch('paid_at') || ''}
          onChange={(e) => setValue('paid_at', e.target.value)}
          className="mb-3"
        />

        <Input
          label={t('payments.notesLabel')}
          {...register('note')}
        />

        <footer className="modal-footer">
          <Button type="button" variant="secondary" onClick={closeModal} disabled={updatePaymentMutation.isPending}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" isLoading={updatePaymentMutation.isPending}>
            {t('common.save')}
          </Button>
        </footer>
      </form>
    </BaseModal>
  );
};

export default PaymentEditModal;