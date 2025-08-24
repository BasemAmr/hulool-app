import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useModalStore } from '../../stores/modalStore';
import { useUpdateReceivable, useResolveReceivableOverpayment } from '../../queries/receivableQueries';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { useState, useEffect } from 'react';
import AmountDetailsInput from '../shared/AmountDetailsInput';
import { formatDateForInput } from '../../utils/dateUtils';
import type { Receivable, UpdateReceivablePayload, TaskType, PaymentDecision, AllocationDecision } from '../../api/types';

interface EditManualReceivableModalProps {
  receivable: Receivable;
}

const EditManualReceivableModal = () => {
  const { t } = useTranslation();
  const closeModal = useModalStore((state) => state.closeModal);
  const { receivable } = useModalStore(state => state.props as EditManualReceivableModalProps);
  
  const { register, handleSubmit, formState: { errors }, watch, control, reset, setValue } = useForm<UpdateReceivablePayload>({
    defaultValues: {
      description: receivable.description,
      amount: receivable.amount,
      amount_details: Array.isArray(receivable.amount_details) ? receivable.amount_details : [],
      notes: receivable.notes || '',
      due_date: formatDateForInput(receivable.due_date),
      type: receivable.type as TaskType
    }
  });

  const updateMutation = useUpdateReceivable();
  const resolveOverpaymentMutation = useResolveReceivableOverpayment();
  const totalAmount = watch('amount') || 0;

  // Conflict resolution state
  const [conflictData, setConflictData] = useState<{
    new_amount: number;
    total_paid: number;
    surplus: number;
    payments: any[];
    allocations: any[];
  } | null>(null);
  const [paymentDecisions, setPaymentDecisions] = useState<PaymentDecision[]>([]);
  const [allocationDecisions, setAllocationDecisions] = useState<AllocationDecision[]>([]);

  // Check if receivable is tied to a task
  const isTiedToTask = !!receivable.task_id;

  useEffect(() => {
    reset({
      description: receivable.description,
      amount: receivable.amount,
      amount_details: Array.isArray(receivable.amount_details) ? receivable.amount_details : [],
      notes: receivable.notes || '',
      due_date: formatDateForInput(receivable.due_date),
      type: receivable.type as TaskType
    });
  }, [receivable, reset]);

  const onSubmit = (data: UpdateReceivablePayload) => {
    if (conflictData) {
      // Handle conflict resolution
      resolveOverpaymentMutation.mutate(
        { 
          id: receivable.id, 
          resolution: {
            new_amount: data.amount || 0,
            payment_decisions: paymentDecisions,
            allocation_decisions: allocationDecisions
          }
        },
        { onSuccess: closeModal }
      );
    } else {
      updateMutation.mutate(
        { id: receivable.id, payload: data },
        { 
          onSuccess: closeModal,
          onError: (error: any) => {
            if (error.response?.status === 409 && error.response.data?.code === 'overpayment_detected') {
              setConflictData(error.response.data.data);
              
              // Initialize payment decisions
              const payments: PaymentDecision[] = error.response.data.data.payments.map(
                (payment: any) => ({
                  payment_id: payment.id,
                  action: 'keep' as const
                })
              );
              setPaymentDecisions(payments);

              // Initialize allocation decisions
              const allocations: AllocationDecision[] = error.response.data.data.allocations.map(
                (allocation: any) => ({
                  allocation_id: allocation.id,
                  action: 'keep' as const
                })
              );
              setAllocationDecisions(allocations);
            }
          }
        }
      );
    }
  };

  const taskTypes: TaskType[] = ['Government', 'RealEstate', 'Accounting', 'Other'];

  const handlePaymentActionChange = (paymentId: number, action: PaymentDecision['action'], newAmount?: number) => {
    setPaymentDecisions(prev => 
      prev.map(decision => 
        decision.payment_id === paymentId 
          ? { ...decision, action, new_amount: newAmount }
          : decision
      )
    );
  };

  const handleAllocationActionChange = (allocationId: number, action: AllocationDecision['action']) => {
    setAllocationDecisions(prev => 
      prev.map(decision => 
        decision.allocation_id === allocationId 
          ? { ...decision, action }
          : decision
      )
    );
  };

  return (
  <BaseModal isOpen={true} onClose={closeModal} title={t('receivables.editReceivable')}>
    {conflictData ? (
      // Conflict Resolution Mode
      <div className="p-4">
        <div className="alert alert-danger mb-4">
          <h5 className="alert-heading mb-2">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            {t('receivables.overpaymentDetected')}
          </h5>
          <p className="mb-0">
            {t('receivables.overpaymentMessage', {
              new_amount: conflictData.new_amount,
              total_paid: conflictData.total_paid,
              surplus: conflictData.surplus
            })}
          </p>
        </div>

        {/* Payment Decisions */}
        {conflictData.payments.length > 0 && (
          <div className="mb-4">
            <h6 className="mb-3">
              <i className="bi bi-cash-coin me-2"></i>
              {t('receivables.paymentDecisions')}
            </h6>
            
            {conflictData.payments.map((payment) => (
              <div key={payment.id} className="row align-items-center mb-3 p-3 border rounded">
                <div className="col-md-4">
                  <div className="fw-bold">{payment.amount} SAR</div>
                  <small className="text-muted">{payment.paid_at}</small>
                </div>
                <div className="col-md-8">
                  <select
                    className="form-select"
                    value={paymentDecisions.find(d => d.payment_id === payment.id)?.action || 'keep'}
                    onChange={(e) => handlePaymentActionChange(payment.id, e.target.value as PaymentDecision['action'])}
                  >
                    <option value="keep">{t('common.keep')}</option>
                    <option value="refund">{t('common.refund')}</option>
                    <option value="convert_to_credit">{t('common.convertToCredit')}</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Allocation Decisions */}
        {conflictData.allocations.length > 0 && (
          <div className="mb-4">
            <h6 className="mb-3">
              <i className="bi bi-arrow-left-right me-2"></i>
              {t('receivables.allocationDecisions')}
            </h6>
            
            {conflictData.allocations.map((allocation) => (
              <div key={allocation.id} className="row align-items-center mb-3 p-3 border rounded">
                <div className="col-md-4">
                  <div className="fw-bold">{allocation.amount} SAR</div>
                  <small className="text-muted">{allocation.description || t('common.noDescription')}</small>
                </div>
                <div className="col-md-8">
                  <select
                    className="form-select"
                    value={allocationDecisions.find(d => d.allocation_id === allocation.id)?.action || 'keep'}
                    onChange={(e) => handleAllocationActionChange(allocation.id, e.target.value as AllocationDecision['action'])}
                  >
                    <option value="keep">{t('common.keep')}</option>
                    <option value="delete_allocation">{t('common.unallocate')}</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="d-flex justify-content-end gap-2">
          <Button type="button" variant="secondary" onClick={closeModal}>
            {t('common.cancel')}
          </Button>
          <Button 
            type="button"
            variant="danger"
            onClick={handleSubmit(onSubmit)}
            isLoading={resolveOverpaymentMutation.isPending}
            disabled={resolveOverpaymentMutation.isPending}
          >
            {t('common.resolve')}
          </Button>
        </div>
      </div>
    ) : (
      // Edit Mode
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="p-4">
          {/* Client and Task Info */}
          <div className="row mb-4">
            <div className="col-12">
              <div className="alert alert-info">
                <div className="d-flex align-items-center">
                  <i className="bi bi-info-circle me-2"></i>
                  <div>
                    <strong>{t('receivables.client')}: </strong> {receivable.client_name}
                    {isTiedToTask && (
                      <>
                        <br />
                        <strong>{t('receivables.task')}: </strong> {receivable.task_name}
                        <br />
                        <small className="text-muted">{t('receivables.tiedToTaskNotice')}</small>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Type Field */}
          <div className="row mb-3">
            <div className="col-12">
              <label className="form-label fw-semibold">{t('receivables.chooseType')}</label>
              <select
                className="form-select"
                {...register('type', { required: true })}
                value={watch('type') || ''}
                onChange={(e) => {
                  setValue('type', e.target.value as TaskType);
                }}
              >
                <option value="">{t('common.selectType')}</option>
                {taskTypes.map(type => (
                  <option key={type} value={type}>{t(`receivables.type.${type}`)}</option>
                ))}
              </select>
              {errors.type && <div className="text-danger small">{t('common.required')}</div>}
            </div>
          </div>

          {/* Description Field */}
          <div className="row mb-3">
            <div className="col-12">
              <Input
                label={t('receivables.tableHeaderDescription')}
                {...register('description', { required: true })}
                error={errors.description && t('common.required')}
              />
            </div>
          </div>

          {/* Amount Field */}
          <div className="row mb-3">
            <div className="col-12">
              <Input
                label={t('receivables.tableHeaderTotal')}
                type="number"
                step="0.01"
                {...register('amount', {
                  required: true,
                  valueAsNumber: true,
                  validate: (value) => {
                    const detailsSum = watch('amount_details')?.reduce((sum, item) => sum + (Number(item?.amount) || 0), 0) || 0;
                    return (value || 0) >= detailsSum || t('receivables.amountLessThanDetails', { sum: detailsSum });
                  }
                })}
                error={errors.amount ? errors.amount.message || t('common.required') : undefined}
              />
            </div>
          </div>

          {/* Due Date Field */}
          <div className="row mb-3">
            <div className="col-12">
              <Input
                label={t('receivables.tableHeaderDueDate')}
                type="date"
                {...register('due_date', { required: true })}
                error={errors.due_date && t('common.required')}
              />
            </div>
          </div>

          {/* Amount Details */}
          <div className="row mb-3">
            <div className="col-12">
              <AmountDetailsInput
                control={control}
                register={register}
                totalAmount={totalAmount}
              />
            </div>
          </div>

          {/* Notes Field */}
          <div className="row mb-4">
            <div className="col-12">
              <label className="form-label fw-semibold">{t('receivables.notes')}</label>
              <textarea
                className="form-control"
                rows={4}
                {...register('notes')}
                placeholder={t('receivables.notesPlaceholder')}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="row">
            <div className="col-12">
              <div className="d-flex justify-content-end gap-2">
                <Button type="button" variant="secondary" onClick={closeModal}>
                  {t('common.cancel')}
                </Button>
                <Button 
                  type="submit" 
                  isLoading={updateMutation.isPending}
                  disabled={updateMutation.isPending}
                >
                  {t('common.save')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>
    )}
  </BaseModal>
);
};

export default EditManualReceivableModal;