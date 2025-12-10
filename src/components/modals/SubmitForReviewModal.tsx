import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useModalStore } from '../../stores/modalStore';
import { useGetPaymentMethods } from '../../queries/paymentQueries';
import { useToast } from '../../hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { Task } from '../../api/types';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import apiClient from '../../api/apiClient';

interface SubmitForReviewModalProps {
  task: Task;
}

interface SubmitForReviewPayload {
  is_paid: boolean;
  is_full_payment: boolean;
  payment_amount: number;
  paid_at: string;
  due_date: string;
  payment_note: string;
  payment_method_id?: number;
}

const SubmitForReviewModal = () => {
  const { t } = useTranslation();
  const closeModal = useModalStore((state) => state.closeModal);
  const props = useModalStore((state) => state.props as SubmitForReviewModalProps);
  const { task } = props;
  const { success, error } = useToast();
  const queryClient = useQueryClient();

  // Calculate the remaining amount for this task
  const actualPrepaidAmount = task.prepaid_receivable?.amount || task.prepaid_amount || 0;
  const remainingAmount = task.amount - actualPrepaidAmount;

  const { data: paymentMethods, isLoading: isLoadingMethods } = useGetPaymentMethods();

  const { register, handleSubmit, control, formState: { errors }, watch, setValue } = useForm<SubmitForReviewPayload>({
    defaultValues: {
      is_paid: false,
      is_full_payment: true,
      payment_amount: remainingAmount,
      paid_at: new Date().toISOString().split('T')[0],
      due_date: new Date().toISOString().split('T')[0],
      payment_note: '',
    },
  });

  const watchIsPaid = watch('is_paid');
  const watchIsFullPayment = watch('is_full_payment');

  // Update payment amount when full payment checkbox changes
  useEffect(() => {
    if (watchIsFullPayment && watchIsPaid) {
      setValue('payment_amount', remainingAmount);
    }
  }, [watchIsFullPayment, watchIsPaid, remainingAmount, setValue]);

  const onSubmit = async (data: SubmitForReviewPayload) => {
    try {
      // First, submit the task for review - this creates the receivable
      const submitResponse = await apiClient.post(`/tasks/${task.id}/submit-for-review`);
      
      if (!submitResponse.data.success) {
        throw new Error(submitResponse.data.message || 'Failed to submit task for review');
      }

      const receivableId = submitResponse.data.data.receivable_id;
      
      if (!receivableId) {
        throw new Error('No receivable was created');
      }

      // If the user marked it as paid, create a payment
      if (data.is_paid && data.payment_method_id) {
        const paymentAmount = data.is_full_payment ? remainingAmount : Number(data.payment_amount);
        
        if (isNaN(paymentAmount) || paymentAmount <= 0 || paymentAmount > remainingAmount) {
          error(t('common.error'), t('payments.invalidAmount'));
          return;
        }

        const paymentPayload = {
          receivable_id: receivableId,
          amount: paymentAmount,
          payment_method_id: Number(data.payment_method_id),
          paid_at: data.paid_at,
          notes: data.payment_note || '',
        };

        const paymentResponse = await apiClient.post('/payments', paymentPayload);
        
        if (!paymentResponse.data.success) {
          console.warn('Task submitted but payment creation failed:', paymentResponse.data.message);
        }

        success(
          t('tasks.submitSuccess'), 
          t('tasks.submitWithPaymentSuccessMessage', {
            taskName: task.task_name || t(`type.${task.type}`),
            amount: paymentAmount
          })
        );
      } else {
        success(
          t('tasks.submitSuccess'), 
          t('tasks.submitSuccessMessage', {
            taskName: task.task_name || t(`type.${task.type}`)
          })
        );
      }
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['receivables'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['employee'] });
      
      closeModal();
    } catch (err: any) {
      error(t('common.error'), err.message || t('tasks.submitError'));
    }
  };

  return (
    <BaseModal
      isOpen={true}
      onClose={closeModal}
      title={t('tasks.submitForReview', { taskName: task.task_name || t(`type.${task.type}`) })}
    >
      <div className="rounded-lg border border-blue-600 bg-blue-50 p-3 flex flex-col gap-2">
        <div className="flex justify-between items-start">
          <span className="text-sm">المبلغ الإجمالي للمهمة:</span>
          <span className="font-semibold text-sm">{task.amount.toLocaleString()} ريال</span>
        </div>
        <div className="flex justify-between items-start">
          <span className="text-sm">المدفوع مقدماً:</span>
          <span className="font-semibold text-sm">{(task.prepaid_amount || 0).toLocaleString()} ريال</span>
        </div>
        <div className="border-t border-blue-600 my-1 pt-2"></div>
        <div className="flex justify-between items-start">
          <span className="font-semibold text-sm">المبلغ المتبقي:</span>
          <span className="font-semibold text-sm">{remainingAmount.toLocaleString()} ريال</span>
        </div>
      </div>

      <div className="rounded-lg border border-yellow-600 bg-yellow-50 p-3 flex flex-col gap-2">
        <h6 className="font-semibold text-yellow-800 text-sm">{t('tasks.submitForReviewModal.title')}</h6>
        <p className="text-yellow-700 text-sm mb-2">{t('tasks.submitForReviewModal.taskWillBeSubmitted', { taskName: task.task_name || `#${task.id}` })}</p>
        <p className="text-yellow-700 text-sm mb-0">{t('tasks.submitForReviewModal.askAboutPayment')}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex items-center gap-2">
          <Controller
            name="is_paid"
            control={control}
            render={({ field }) => (
              <input
                type="checkbox"
                className="rounded cursor-pointer"
                id="is_paid"
                checked={field.value}
                onChange={(e) => {
                  field.onChange(e.target.checked);
                }}
              />
            )}
          />
          <label className="cursor-pointer text-sm" htmlFor="is_paid">
            {t('tasks.submitForReviewModal.paymentReceived')}
          </label>
        </div>

        {watchIsPaid ? (
          // Payment fields
          <div className="space-y-4 pl-6 border-l-2 border-primary">
            <div className="flex items-center gap-2">
              <Controller
                name="is_full_payment"
                control={control}
                render={({ field }) => (
                  <input
                    type="checkbox"
                    className="rounded cursor-pointer"
                    id="is_full_payment"
                    checked={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              <label className="cursor-pointer text-sm" htmlFor="is_full_payment">
                {t('payments.fullPayment')}
              </label>
            </div>

            <Input
              label={t('payments.amountLabel')}
              type="number"
              step="0.01"
              max={remainingAmount}
              disabled={watchIsFullPayment}
              {...register('payment_amount', { 
                required: watchIsPaid && !watchIsFullPayment, 
                valueAsNumber: true, 
                max: {
                  value: remainingAmount,
                  message: `المبلغ لا يمكن أن يتجاوز المتبقي وهو ${remainingAmount} ريال`
                },
                min: 0.01
              })}
              error={errors.payment_amount ? (errors.payment_amount.message || t('payments.amountRequired')) : undefined}
            />

            <div className="space-y-2">
              <label className="font-semibold text-black text-sm block">{t('payments.methodLabel')}</label>
              <Controller
                name="payment_method_id"
                control={control}
                rules={{ required: watchIsPaid }}
                render={({ field }) => (
                  <select 
                    {...field} 
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${errors.payment_method_id ? 'border-destructive bg-destructive/5' : 'border-border'}`} 
                    disabled={isLoadingMethods}
                  >
                    <option value="">{t('payments.selectMethod')}</option>
                    {paymentMethods?.map(method => (
                      <option key={method.id} value={method.id}>{method.name}</option>
                    ))}
                  </select>
                )}
              />
              {errors.payment_method_id && (
                <div className="text-destructive text-sm">{t('payments.methodRequired')}</div>
              )}
            </div>

            <Input 
              label={t('payments.dateLabel')} 
              type="date" 
              {...register('paid_at', { required: watchIsPaid })} 
              error={errors.paid_at ? t('payments.dateRequired') : undefined} 
            />

            <Input 
              label={t('payments.notesLabel')} 
              {...register('payment_note')} 
            />
          </div>
        ) : (
          // Due date field for unpaid receivables
          <Input 
            label={t('receivables.dueDate')} 
            type="date" 
            {...register('due_date')} 
            error={errors.due_date ? t('receivables.dueDateRequired') : undefined} 
          />
        )}

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button 
            type="button" 
            variant="secondary" 
            onClick={closeModal}
          >
            {t('common.cancel')}
          </Button>
          <Button 
            type="submit"
          >
            {watchIsPaid ? t('tasks.submitForReviewModal.submitWithPayment') : t('tasks.submitForReviewModal.submitWithoutPayment')}
          </Button>
        </div>
      </form>
    </BaseModal>
  );
};

export default SubmitForReviewModal;