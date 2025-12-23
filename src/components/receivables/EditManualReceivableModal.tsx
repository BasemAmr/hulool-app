import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useModalStore } from '../../stores/modalStore';
import { useUpdateReceivable, useResolveReceivableOverpayment, useAutoResolveReceivableOverpayment } from '../../queries/receivableQueries';
import { useToast } from '../../hooks/useToast';
import { TOAST_MESSAGES } from '../../constants/toastMessages';
import { getErrorMessage, isConflictError } from '../../utils/errorUtils';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { useState, useEffect } from 'react';
import AmountDetailsInput from '../shared/AmountDetailsInput';
import { formatDateForInput } from '../../utils/dateUtils';
import type { Receivable, UpdateReceivablePayload, TaskType, PaymentDecision, AllocationDecision, EnhancedOverpaymentData } from '../../api/types';

interface EditManualReceivableModalProps {
  receivable: Receivable;
}

const EditManualReceivableModal = () => {
  const { t } = useTranslation();
  const closeModal = useModalStore((state) => state.closeModal);
  const { success, error } = useToast();
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
  const autoResolveOverpaymentMutation = useAutoResolveReceivableOverpayment();
  const totalAmount = watch('amount') || 0;

  // Conflict resolution state
  const [conflictData, setConflictData] = useState<EnhancedOverpaymentData | null>(null);
  const [selectedResolution, setSelectedResolution] = useState<string>('');
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
      if (selectedResolution === 'manual_resolution') {
        // Manual resolution with specific decisions
        resolveOverpaymentMutation.mutate(
          { 
            id: receivable.id, 
            resolution: {
              new_amount: data.amount || 0,
              payment_decisions: paymentDecisions,
              allocation_decisions: allocationDecisions
            }
          },
          { 
            onSuccess: () => {
              success(TOAST_MESSAGES.RECEIVABLE_OVERPAYMENT_RESOLVED, 'تم حل تعارض الدفع الزائد بنجاح');
              closeModal();
            },
            onError: (err: any) => {
              error(TOAST_MESSAGES.OPERATION_FAILED, getErrorMessage(err, 'فشل حل التعارض'));
            }
          }
        );
      } else {
        // Auto resolution
        autoResolveOverpaymentMutation.mutate(
          {
            id: receivable.id,
            new_amount: data.amount || 0,
            resolution_type: selectedResolution as 'auto_reduce_payments' | 'auto_reduce_latest' | 'convert_surplus_to_credit'
          },
          { 
            onSuccess: () => {
              success(TOAST_MESSAGES.RECEIVABLE_OVERPAYMENT_RESOLVED, 'تم حل تعارض الدفع الزائد تلقائياً');
              closeModal();
            },
            onError: (err: any) => {
              error(TOAST_MESSAGES.OPERATION_FAILED, getErrorMessage(err, 'فشل الحل التلقائي'));
            }
          }
        );
      }
    } else {
      updateMutation.mutate(
        { id: receivable.id, payload: data },
        { 
          onSuccess: () => {
            success(TOAST_MESSAGES.RECEIVABLE_UPDATED, 'تم تحديث المستحق بنجاح');
            closeModal();
          },
          onError: (err: any) => {
            if (isConflictError(err) && err.response.data?.code === 'overpayment_detected') {
              setConflictData(err.response.data.data);
              setSelectedResolution('auto_reduce_payments'); // Default to recommended option
              
              // Initialize payment decisions for manual resolution
              const payments: PaymentDecision[] = err.response.data.data.payments.map(
                (payment: any) => ({
                  payment_id: payment.id,
                  action: 'keep' as const
                })
              );
              setPaymentDecisions(payments);

              // Initialize allocation decisions for manual resolution
              const allocations: AllocationDecision[] = err.response.data.data.allocations.map(
                (allocation: any) => ({
                  allocation_id: allocation.id,
                  action: 'keep' as const
                })
              );
              setAllocationDecisions(allocations);
            } else {
              error(TOAST_MESSAGES.UPDATE_FAILED, getErrorMessage(err, 'فشل تحديث المستحق'));
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
      // Enhanced Conflict Resolution Mode
      <div className="p-4 space-y-4">
        <div className="rounded-lg border border-yellow-600 bg-yellow-50 p-4">
          <h5 className="flex items-center gap-2 font-semibold text-yellow-900 mb-2">
            <i className="bi bi-exclamation-triangle-fill"></i>
            {t('receivables.overpaymentDetected')}
          </h5>
          <p className="text-yellow-800 text-sm mb-0">
            The new amount ({conflictData.new_amount} SAR) is less than the total already paid ({conflictData.total_paid} SAR). 
            Please choose how to resolve the surplus of {conflictData.surplus} SAR.
          </p>
        </div>

        {/* Resolution Options */}
        <div>
          <h6 className="flex items-center gap-2 font-semibold text-black mb-3">
            <i className="bi bi-gear-fill"></i>
            Choose Resolution Method
          </h6>
          
          {Object.entries(conflictData.resolution_options).map(([key, option]) => (
            <div key={key} className={`rounded-lg border p-3 mb-2 ${selectedResolution === key ? 'border-primary bg-primary/5' : 'border-border'}`}>
              <div className="flex items-start gap-2">
                <input
                  className="rounded mt-1"
                  type="radio"
                  name="resolutionMethod"
                  id={key}
                  value={key}
                  checked={selectedResolution === key}
                  onChange={(e) => setSelectedResolution(e.target.value)}
                  disabled={option.available === false}
                />
                <label className="flex-1 cursor-pointer" htmlFor={key}>
                  <div className="flex justify-between items-start">
                    <div>
                      <strong className={option.recommended ? 'text-green-600' : 'text-black'}>
                        {option.label}
                        {option.recommended && <span className="ml-2 inline-block px-2 py-1 rounded-full bg-green-600 text-white text-xs">Recommended</span>}
                      </strong>
                      <div className="text-muted-foreground text-sm mt-1">{option.description}</div>
                    </div>
                    {option.available === false && (
                      <span className="px-2 py-1 rounded-full bg-gray-400 text-white text-xs">Not Available</span>
                    )}
                  </div>
                </label>
              </div>
            </div>
          ))}
        </div>

        {/* Manual Resolution Details */}
        {selectedResolution === 'manual_resolution' && (
          <div className="border border-border rounded-lg p-3 space-y-4">
            <h6 className="font-semibold text-black mb-3">Manual Resolution Details</h6>
            
            {/* Payment Decisions */}
            {conflictData.payments.length > 0 && (
              <div>
                <h6 className="flex items-center gap-2 font-semibold text-black mb-3">
                  <i className="bi bi-cash-coin"></i>
                  Payment Actions
                </h6>
                
                {conflictData.payments.map((payment) => (
                  <div key={payment.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center mb-3 p-3 border border-border rounded-lg">
                    <div>
                      <div className="font-semibold text-black">{payment.amount} SAR</div>
                      <small className="text-muted-foreground text-xs">{payment.paid_at}</small>
                    </div>
                    <div>
                      <select
                        className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        value={paymentDecisions.find(d => d.payment_id === payment.id)?.action || 'keep'}
                        onChange={(e) => handlePaymentActionChange(payment.id, e.target.value as PaymentDecision['action'])}
                      >
                        <option value="keep">{t('common.keep')}</option>
                        <option value="delete">{t('common.delete')}</option>
                        <option value="convert_to_credit">{t('common.convertToCredit')}</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Allocation Decisions */}
            {conflictData.allocations.length > 0 && (
              <div>
                <h6 className="flex items-center gap-2 font-semibold text-black mb-3">
                  <i className="bi bi-arrow-left-right"></i>
                  Allocation Actions
                </h6>
                
                {conflictData.allocations.map((allocation) => (
                  <div key={allocation.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center mb-3 p-3 border border-border rounded-lg">
                    <div>
                      <div className="font-semibold text-black">{allocation.amount} SAR</div>
                      <small className="text-muted-foreground text-xs">{allocation.description || t('common.noDescription')}</small>
                    </div>
                    <div>
                      <select
                        className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        value={allocationDecisions.find(d => d.allocation_id === allocation.id)?.action || 'keep'}
                        onChange={(e) => handleAllocationActionChange(allocation.id, e.target.value as AllocationDecision['action'])}
                      >
                        <option value="keep">{t('common.keep')}</option>
                        <option value="return_to_credit">Return to Credit</option>
                        <option value="delete_allocation">{t('common.unallocate')}</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={closeModal}>
            {t('common.cancel')}
          </Button>
          <Button 
            type="button"
            variant="primary"
            onClick={handleSubmit(onSubmit)}
            isLoading={resolveOverpaymentMutation.isPending || autoResolveOverpaymentMutation.isPending}
            disabled={resolveOverpaymentMutation.isPending || autoResolveOverpaymentMutation.isPending || !selectedResolution}
          >
            {selectedResolution === 'manual_resolution' ? 'Apply Manual Resolution' : 'Apply Auto Resolution'}
          </Button>
        </div>
      </div>
    ) : (
      // Edit Mode
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="p-4 space-y-4">
          {/* Client and Task Info */}
          <div className="rounded-lg border border-blue-600 bg-blue-50 p-4">
            <div className="flex items-start gap-2">
              <i className="bi bi-info-circle text-blue-600"></i>
              <div className="text-sm text-blue-800">
                <strong>{t('receivables.client')}: </strong> {receivable.client_name}
                {isTiedToTask && (
                  <>
                    <br />
                    <strong>{t('receivables.task')}: </strong> {receivable.task_name}
                    <br />
                    <small className="text-blue-700">{t('receivables.tiedToTaskNotice')}</small>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Type Field */}
          <div>
            <label className="font-semibold text-black text-sm block mb-2">{t('receivables.chooseType')}</label>
            <select
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
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
            {errors.type && <div className="text-destructive text-xs mt-1">{t('common.required')}</div>}
          </div>

          {/* Description Field */}
          <div>
            <Input
              label={t('receivables.tableHeaderDescription')}
              {...register('description', { required: true })}
              error={errors.description && t('common.required')}
            />
          </div>

          {/* Amount Field */}
          <div>
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

          {/* Due Date Field */}
          <div>
            <Input
              label={t('receivables.tableHeaderDueDate')}
              type="date"
              {...register('due_date', { required: true })}
              error={errors.due_date && t('common.required')}
            />
          </div>

          {/* Amount Details */}
          <div>
            <AmountDetailsInput
              control={control}
              register={register}
              totalAmount={totalAmount}
            />
          </div>

          {/* Notes Field */}
          <div>
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