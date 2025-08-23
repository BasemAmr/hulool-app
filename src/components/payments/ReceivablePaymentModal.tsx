import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useModalStore } from '../../stores/modalStore';
import { useGetPaymentMethods, useCreatePayment, useUpdatePayment, useGetReceivablePayments } from '../../queries/paymentQueries';

import { useGetClientCredits, useReplacePaymentWithCredit } from '../../queries/clientCreditQueries';


import type { Receivable, PaymentPayload } from '../../api/types';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface ReceivablePaymentModalProps {
  receivable: Receivable;
  isRequired?: boolean; // New prop to make the modal non-closeable
  availableCredit?: number;
  paymentToReplace?: any;
}

const ReceivablePaymentModal = () => {
  const { t } = useTranslation();
  const closeModal = useModalStore((state) => state.closeModal);
  const openModal = useModalStore(state => state.openModal); // Get openModal function



  const props = useModalStore((state) => state.props as ReceivablePaymentModalProps);
  const { receivable, isRequired = false } = props;

  const { data: paymentMethods, isLoading: isLoadingMethods } = useGetPaymentMethods();
  const { data: existingPayments, isLoading: isLoadingPayments } = useGetReceivablePayments(Number(receivable.id));
  const createPaymentMutation = useCreatePayment();
  const updatePaymentMutation = useUpdatePayment();
  const replacePaymentWithCreditMutation = useReplacePaymentWithCredit();

  // NEW: Fetch client credits
  console.log('Fetching client credits for receivable:', receivable);
  const { data: creditData } = useGetClientCredits(Number(receivable.client_id));
  const availableCredit = creditData?.balance || 0;
  console.log('Available credit data:', creditData);
  console.log('Available credit for client:', availableCredit);
  
  // Check if this is a prepaid receivable that might have automatic payment
  const isPrepaidReceivable = isRequired;

  const { register, handleSubmit, control, formState: { errors } } = useForm<PaymentPayload>({
    defaultValues: {
      receivable_id: Number(receivable.id),

      amount: isRequired ? receivable.amount : receivable.remaining_amount, // Use full amount for prepaid
      paid_at: new Date().toISOString().split('T')[0],
      note: isRequired ? `دفع مقدم للمهمة: ${receivable.description}` : '', // Pre-fill note for prepaid
    },
  });

  const onSubmit = (data: PaymentPayload) => {
    // For prepaid receivables with existing payment, use PUT to update
    console.log(isPrepaidReceivable)
    console.log(receivable.prepaid_receivable_id)
    if (isPrepaidReceivable && existingPayments && existingPayments.length > 0) {
      const existingPayment = existingPayments[0];
      updatePaymentMutation.mutate(
        { id: existingPayment.id, ...data, amount: Number(data.amount) },
        { onSuccess: closeModal }
      );
    } else {
      // For new payments, use POST
      createPaymentMutation.mutate({ ...data, amount: Number(data.amount) }, {
        onSuccess: closeModal,
      });
    }
  };

  // Conditional close handler - if required, don't allow closing
  const handleClose = () => {
    if (!isRequired) {
      closeModal();
    }
  };

  const handleApplyCredit = () => {
    // If this is a prepaid receivable with a payment, we can replace it directly
    if (isPrepaidReceivable && existingPayments && existingPayments.length > 0) {
        const existingPayment = existingPayments[0];
        replacePaymentWithCreditMutation.mutate(existingPayment.id, {
            onSuccess: () => {
                closeModal();
            }
        });
    } else {
        // Otherwise, open the apply credit modal
        closeModal();
        openModal('applyCreditModal', { 
            receivable, 
            availableCredit,
        });
    }
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

        {availableCredit > 0 && (
          <div className={`alert d-flex justify-content-between align-items-center ${
            isPrepaidReceivable && availableCredit >= receivable.amount 
              ? 'alert-success' 
              : isPrepaidReceivable && availableCredit < receivable.amount
              ? 'alert-warning'
              : 'alert-success'
          }`}>
            <span>
              لدى العميل رصيد متاح: <strong>{availableCredit.toLocaleString()} ريال</strong>
              {isPrepaidReceivable && (
                <>
                  <br />
                  <small>
                    {availableCredit >= receivable.amount 
                      ? 'الرصيد كافي لتغطية الدفع المقدم' 
                      : `الرصيد غير كافي - مطلوب ${receivable.amount.toLocaleString()} ريال`}
                  </small>
                </>
              )}
            </span>
            {(!isRequired || (isPrepaidReceivable && availableCredit >= receivable.amount)) && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleApplyCredit}
                disabled={isPrepaidReceivable && availableCredit < receivable.amount}
              >
                تطبيق من الرصيد
              </Button>
            )}
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
              <select {...field} className={`form-select ${errors.payment_method_id ? 'is-invalid' : ''}`} disabled={isLoadingMethods || isLoadingPayments}>
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
              <Button type="button" variant="secondary" onClick={handleClose} disabled={createPaymentMutation.isPending || updatePaymentMutation.isPending || isLoadingPayments}>
                {t('common.cancel')}
              </Button>
            )}
            <Button type="submit" isLoading={createPaymentMutation.isPending || updatePaymentMutation.isPending || isLoadingPayments}>
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