import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useModalStore } from '../../stores/modalStore';
import { useGetPaymentMethods } from '../../queries/paymentQueries';
import { useCompleteTask } from '../../queries/taskQueries';
import { useToast } from '../../hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { Task, CompleteTaskPayload } from '../../api/types';
import { TOAST_MESSAGES } from '../../constants/toastMessages';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface TaskCompletionModalProps {
  task: Task;
}

const TaskCompletionModal = () => {
  const { t } = useTranslation();
  const closeModal = useModalStore((state) => state.closeModal);
  const props = useModalStore((state) => state.props as TaskCompletionModalProps);
  const { task } = props;
  const { success, error } = useToast();
  const queryClient = useQueryClient();

  // Correctly calculate the remaining amount for this task
  // If there's a prepaid receivable but prepaid_amount is 0, we need to get the actual prepaid amount
  // For now, we'll use the prepaid_receivable amount if available, otherwise fall back to prepaid_amount
  const actualPrepaidAmount = task.prepaid_receivable?.amount || task.prepaid_amount || 0;
  const remainingAmount = task.amount - actualPrepaidAmount;

  const { data: paymentMethods, isLoading: isLoadingMethods } = useGetPaymentMethods();
  const completeTaskMutation = useCompleteTask();

  const { register, handleSubmit, control, formState: { errors }, watch, setValue } = useForm<CompleteTaskPayload>({
    defaultValues: {
      is_paid: false,
      is_full_payment: true,
      payment_amount: remainingAmount, // Default to the correct remaining amount
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
      setValue('payment_amount', remainingAmount); // Use calculated remaining amount
    }
  }, [watchIsFullPayment, watchIsPaid, remainingAmount, setValue]);

  const onSubmit = (data: CompleteTaskPayload) => {
    // Transform data to ensure proper types
    const payload: CompleteTaskPayload = {
      ...data,
      // Ensure payment_method_id is a number
      payment_method_id: data.payment_method_id ? Number(data.payment_method_id) : undefined,
    };

    // Handle payment amount based on payment type
    if (data.is_paid) {
      if (data.is_full_payment) {
        payload.payment_amount = remainingAmount; // Use remaining amount for full payment
      } else {
        // Ensure partial payment amount is a valid number
        const amount = Number(data.payment_amount);
        if (isNaN(amount) || amount <= 0 || amount > remainingAmount) {
          error(TOAST_MESSAGES.VALIDATION_ERROR, t('payments.invalidAmount'));
          return;
        }
        payload.payment_amount = amount;
      }
    } else {
      // Remove payment fields if not paid
      delete payload.payment_amount;
      delete payload.payment_method_id;
      delete payload.payment_note;
      delete payload.paid_at;
      delete payload.is_full_payment;
    }

    // Debug logging
    // console.log('Form data:', data);
    // console.log('Transformed payload:', payload);

    completeTaskMutation.mutate(
      {
        id: Number(task.id),
        payload
      },
      {
        onSuccess: (response) => {
          if (data.is_paid && response.payment) {
            success(TOAST_MESSAGES.TASK_COMPLETED, 'تم إكمال المهمة بنجاح');
          } else {
            success(TOAST_MESSAGES.TASK_COMPLETED);
          }

          // Invalidate queries
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
          queryClient.invalidateQueries({ queryKey: ['receivables'] });
          queryClient.invalidateQueries({ queryKey: ['clients'] });

          closeModal();
        },
        onError: (err: any) => {
          error(TOAST_MESSAGES.OPERATION_FAILED, err.message);
        }
      }
    );
  };

  return (
    <BaseModal
      isOpen={true}
      onClose={closeModal}
      title={t('tasks.completeTask', { taskName: task.task_name || t(`type.${task.type}`) })}
    >
      <div className="rounded-lg border border-blue-600 bg-blue-50 p-3 flex flex-col gap-2 mb-4">
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
            {t('tasks.wasPaid')}
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
          // Due date field for unpaid tasks
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
            disabled={completeTaskMutation.isPending}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            isLoading={completeTaskMutation.isPending}
          >
            {watchIsPaid ? t('tasks.completeAndPay') : t('tasks.complete')}
          </Button>
        </div>
      </form>
    </BaseModal>
  );
};

export default TaskCompletionModal;