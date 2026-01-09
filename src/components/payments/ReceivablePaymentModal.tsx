import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useModalStore } from '../../stores/modalStore';
import { useGetPaymentMethods, useCreatePayment, useUpdatePayment, useGetReceivablePayments } from '../../queries/paymentQueries';

import { useGetClientCredits, useReplacePaymentWithCredit } from '../../queries/clientCreditQueries';
import { useToast } from '../../hooks/useToast';
import { TOAST_MESSAGES } from '../../constants/toastMessages';
import { getErrorMessage } from '../../utils/errorUtils';

import type { Receivable, PaymentPayload } from '../../api/types';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { NumberInput } from '../ui/NumberInput';
import { DateInput } from '../ui/DateInput';

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
  const { success, error } = useToast();

  const props = useModalStore((state) => state.props as ReceivablePaymentModalProps);
  const { receivable, isRequired = false } = props;

  const { data: paymentMethods, isLoading: isLoadingMethods } = useGetPaymentMethods();
  const { data: existingPayments, isLoading: isLoadingPayments } = useGetReceivablePayments(Number(receivable.id));
  const createPaymentMutation = useCreatePayment();
  const updatePaymentMutation = useUpdatePayment();
  const replacePaymentWithCreditMutation = useReplacePaymentWithCredit();

  // NEW: Fetch client credits
  const { data: creditData } = useGetClientCredits(Number(receivable.client_id));
  const availableCredit = creditData?.balance || 0;

  // Check if this is a prepaid receivable that might have automatic payment
  const isPrepaidReceivable = isRequired;

  const { register, handleSubmit, control, formState: { errors }, watch } = useForm<PaymentPayload>({
    defaultValues: {
      receivable_id: Number(receivable.id),

      amount: isRequired ? receivable.amount : receivable.remaining_amount, // Use full amount for prepaid
      paid_at: new Date().toISOString().split('T')[0],
      note: isRequired ? `دفع مقدم للمهمة: ${receivable.description}` : '', // Pre-fill note for prepaid
    },
  });

  const onSubmit = (data: PaymentPayload) => {
    // For prepaid receivables with existing payment, use PUT to update
    // console.log(isPrepaidReceivable)
    // console.log(receivable.prepaid_receivable_id)
    if (isPrepaidReceivable && existingPayments && existingPayments.length > 0) {
      const existingPayment = existingPayments[0];
      updatePaymentMutation.mutate(
        { id: existingPayment.id, ...data, amount: Number(data.amount), receivable_id: Number(receivable.id) },
        {
          onSuccess: () => {
            success(TOAST_MESSAGES.PAYMENT_UPDATED, 'تم تحديث الدفعة بنجاح');
            closeModal();
          },
          onError: (err: any) => {
            error(TOAST_MESSAGES.UPDATE_FAILED, getErrorMessage(err, 'فشل تحديث الدفعة'));
          }
        }
      );
    } else {
      // For new payments, use POST
      createPaymentMutation.mutate({
        ...data,
        amount: Number(data.amount),
        receivable_id: Number(receivable.id)
      }, {
        onSuccess: () => {
          success(TOAST_MESSAGES.PAYMENT_RECORDED, 'تم تسجيل الدفعة بنجاح');
          closeModal();
        },
        onError: (err: any) => {
          error(TOAST_MESSAGES.OPERATION_FAILED, getErrorMessage(err, 'فشل تسجيل الدفعة'));
        }
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
          success(TOAST_MESSAGES.CREDIT_APPLIED, 'تم تطبيق الرصيد على الدفعة بنجاح');
          closeModal();
        },
        onError: (err: any) => {
          error(TOAST_MESSAGES.OPERATION_FAILED, getErrorMessage(err, 'فشل تطبيق الرصيد'));
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
          <div className={`alert d-flex justify-content-between align-items-center ${isPrepaidReceivable && availableCredit >= receivable.amount
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

        <NumberInput
          label={`${t('payments.amountLabel')}${isRequired ? ' (مبلغ ثابت)' : ''}`}
          name="amount"
          value={isRequired ? receivable.amount : receivable.remaining_amount}
          disabled={isRequired}
          onChange={() => { }}
          className="mb-3"
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

        <DateInput
          label={t('payments.dateLabel')}
          name="paid_at"
          value={watch('paid_at') || ''}
          onChange={(e) => register('paid_at').onChange(e)}
          className="mb-3"
        />
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