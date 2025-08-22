import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useModalStore } from '../../stores/modalStore';
import { useGetPaymentMethods, useCreatePayment } from '../../queries/paymentQueries';

import { useGetClientCredits } from '../../queries/clientCreditQueries';


import type { Receivable, PaymentPayload } from '../../api/types';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface ReceivablePaymentModalProps {
  receivable: Receivable;
  isRequired?: boolean; // New prop to make the modal non-closeable
}

const ReceivablePaymentModal = () => {
  const { t } = useTranslation();
  const closeModal = useModalStore((state) => state.closeModal);
  const openModal = useModalStore(state => state.openModal); // Get openModal function



  const props = useModalStore((state) => state.props as ReceivablePaymentModalProps);
  const { receivable, isRequired = false } = props;

  const { data: paymentMethods, isLoading: isLoadingMethods } = useGetPaymentMethods();
  const createPaymentMutation = useCreatePayment();

  // NEW: Fetch client credits
  console.log('Fetching client credits for receivable:', receivable);
  const { data: creditData } = useGetClientCredits(Number(receivable.client_id));
  // const applyCreditMutation = useApplyCreditToReceivable();
  const availableCredit = creditData?.balance || 0;
  console.log('Available credit data:', creditData);
  console.log('Available credit for client:', availableCredit);

  const { register, handleSubmit, control, formState: { errors } } = useForm<PaymentPayload>({
    defaultValues: {
      receivable_id: Number(receivable.id),

      amount: isRequired ? receivable.amount : receivable.remaining_amount, // Use full amount for prepaid
      paid_at: new Date().toISOString().split('T')[0],
      note: isRequired ? `دفع مقدم للمهمة: ${receivable.description}` : '', // Pre-fill note for prepaid
    },
  });

  const onSubmit = (data: PaymentPayload) => {
    createPaymentMutation.mutate({ ...data, amount: Number(data.amount) }, {
      onSuccess: closeModal,
    });
  };

  // Conditional close handler - if required, don't allow closing
  const handleClose = () => {
    if (!isRequired) {
      closeModal();
    }
  };

  const handleApplyCredit = () => {
    // We close the current payment modal and open the apply credit modal
    closeModal();
    openModal('applyCreditModal', { receivable, availableCredit });
  };


  return (
    <BaseModal
      isOpen={true}
      onClose={handleClose}
      title={isRequired ? `دفع مقدم مطلوب: ${receivable.description}` : t('payments.settleTitle', { description: receivable.description })}
    >
      {isRequired && (
        <div className="alert alert-warning mb-3">
          <strong>{t('payments.paymentRequired')}</strong>
          <p className="mb-0">{t('payments.paymentRequiredMessage')}</p>
          <small className="text-muted">
            المبلغ المطلوب: {receivable.amount} {/* Show the fixed amount */}
          </small>
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)}>

        {availableCredit > 0 && !isRequired && (
          <div className="alert alert-success d-flex justify-content-between align-items-center">
            <span>
              لدى العميل رصيد متاح: <strong>{availableCredit.toLocaleString()} ريال</strong>
            </span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleApplyCredit} // Use the new handler
            >
              تطبيق من الرصيد
            </Button>
          </div>
        )}

        <Input
          label={`${t('payments.amountLabel')}${isRequired ? ' (مبلغ ثابت)' : ''}`}
          type="number"
          step="0.01"
          max={isRequired ? receivable.amount : receivable.remaining_amount}
          readOnly={isRequired} // Make readonly when required (prepaid)
          {...register('amount', {
            required: true,
            valueAsNumber: true,
            max: isRequired ? receivable.amount : receivable.remaining_amount
          })}
          error={errors.amount ? "Amount is required and cannot exceed remaining balance." : undefined}
        />

        <div className="mb-3">
          <label className="form-label">{t('payments.methodLabel')}</label>
          <Controller
            name="payment_method_id"
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <select {...field} className={`form-select ${errors.payment_method_id ? 'is-invalid' : ''}`} disabled={isLoadingMethods}>
                <option value="">{t('payments.selectMethod')}</option>
                {paymentMethods?.map(method => (
                  <option key={method.id} value={method.id}>{method.name}</option>
                ))}
              </select>
            )}
          />
          {errors.payment_method_id && <div className="invalid-feedback d-block">Required</div>}
        </div>

        <Input label={t('payments.dateLabel')} type="date" {...register('paid_at', { required: true })} error={errors.paid_at && "Required"} />
        <Input
          label={`${t('payments.notesLabel')}`}
          {...register('note')}

        />

        <footer className="modal-footer">
          {!isRequired && (
            <Button type="button" variant="secondary" onClick={handleClose} disabled={createPaymentMutation.isPending}>
              {t('common.cancel')}
            </Button>
          )}
          <Button type="submit" isLoading={createPaymentMutation.isPending}>
            {isRequired ? t('payments.payNow') : t('common.save')}
          </Button>
        </footer>
      </form>

      {/* Add styling for readonly fields when required */}
      {isRequired && (
        <style>{`
          .form-control[readonly] {
            background-color: #f8f9fa;
            border-color: #6c757d;
            color: #495057;
            cursor: not-allowed;
          }
          
          .alert-warning {
            border-left: 4px solid #ffc107;
          }
        `}</style>
      )}
    </BaseModal>
  );
};

export default ReceivablePaymentModal;