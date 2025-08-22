import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useModalStore } from '../../stores/modalStore';
import { useGetPaymentMethods } from '../../queries/paymentQueries';
import { useCompleteTask } from '../../queries/taskQueries';
import { useToast } from '../../hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { Task, CompleteTaskPayload } from '../../api/types';
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
  const remainingAmount = task.amount - (task.prepaid_amount || 0);

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
      setValue('payment_amount', remainingAmount); // Use remaining amount
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
          error(t('common.error'), t('payments.invalidAmount'));
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
    console.log('Form data:', data);
    console.log('Transformed payload:', payload);

    completeTaskMutation.mutate(
      { 
        id: Number(task.id), 
        payload 
      }, 
      {
        onSuccess: (response) => {
          if (data.is_paid && response.payment) {
            success(
              t('tasks.completeSuccess'), 
              t('tasks.completeWithPaymentSuccessMessage', {
                taskName: task.task_name || t(`type.${task.type}`),
                amount: payload.payment_amount
              })
            );
          } else {
            success(
              t('tasks.completeSuccess'), 
              t('tasks.completeSuccessMessage', {
                taskName: task.task_name || t(`type.${task.type}`)
              })
            );
          }
          
          // Invalidate queries
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
          queryClient.invalidateQueries({ queryKey: ['receivables'] });
          queryClient.invalidateQueries({ queryKey: ['clients'] });
          
          closeModal();
        },
        onError: (err: any) => {
          error(t('common.error'), err.message || t('tasks.completeError'));
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
      <div className="alert alert-info py-2">
        <div className="d-flex justify-content-between">
            <span>المبلغ الإجمالي للمهمة:</span>
            <span className="fw-bold">{task.amount.toLocaleString()} ريال</span>
        </div>
        <div className="d-flex justify-content-between">
            <span>المدفوع مقدماً:</span>
            <span className="fw-bold">{(task.prepaid_amount || 0).toLocaleString()} ريال</span>
        </div>
        <hr className="my-1" />
        <div className="d-flex justify-content-between fw-bold">
            <span>المبلغ المتبقي:</span>
            <span>{remainingAmount.toLocaleString()} ريال</span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mb-3">
          <div className="form-check">
            <Controller
              name="is_paid"
              control={control}
              render={({ field }) => (
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="is_paid"
                  checked={field.value}
                  onChange={(e) => {
                    field.onChange(e.target.checked);
                  }}
                />
              )}
            />
            <label className="form-check-label" htmlFor="is_paid">
              {t('tasks.wasPaid')}
            </label>
          </div>
        </div>

        {watchIsPaid ? (
          // Payment fields
          <div className="payment-section">
            <div className="mb-3">
              <div className="form-check">
                <Controller
                  name="is_full_payment"
                  control={control}
                  render={({ field }) => (
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="is_full_payment"
                      checked={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
                <label className="form-check-label" htmlFor="is_full_payment">
                  {t('payments.fullPayment')}
                </label>
              </div>
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

            <div className="mb-3">
              <label className="form-label">{t('payments.methodLabel')}</label>
              <Controller
                name="payment_method_id"
                control={control}
                rules={{ required: watchIsPaid }}
                render={({ field }) => (
                  <select 
                    {...field} 
                    className={`form-select ${errors.payment_method_id ? 'is-invalid' : ''}`} 
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
                <div className="invalid-feedback d-block">{t('payments.methodRequired')}</div>
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

        <footer className="modal-footer">
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
        </footer>
      </form>
    </BaseModal>
  );
};

export default TaskCompletionModal;