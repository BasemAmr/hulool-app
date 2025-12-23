import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useModalStore } from '../../stores/modalStore';
import { useUpdateClientCredit, useResolveCreditReduction } from '../../queries/clientCreditQueries';
import { useToast } from '../../hooks/useToast';
import { TOAST_MESSAGES } from '../../constants/toastMessages';
import { getErrorMessage, isConflictError } from '../../utils/errorUtils';
import type { ClientCredit, CreditReductionConflictData, AllocationAdjustment } from '../../api/types';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import SaudiRiyalIcon from '../ui/SaudiRiyalIcon';

interface CreditEditModalProps {
  credit: ClientCredit;
  clientId: number;
}

interface FormData {
  amount: number;
}

const CreditEditModal = () => {
  const { t } = useTranslation();
  const closeModal = useModalStore(state => state.closeModal);
  const { success, error } = useToast();
  const { credit } = useModalStore(state => state.props as CreditEditModalProps);
  
  const [conflictData, setConflictData] = useState<CreditReductionConflictData | null>(null);
  const [allocationAdjustments, setAllocationAdjustments] = useState<AllocationAdjustment[]>([]);
  
  const updateCreditMutation = useUpdateClientCredit();
  const resolveReductionMutation = useResolveCreditReduction();
  
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      amount: credit.amount
    }
  });

  const handleUpdate = async (data: FormData) => {
    try {
      if (conflictData) {
        // Handle conflict resolution
        await resolveReductionMutation.mutateAsync({
          id: credit.id,
          new_amount: data.amount,
          allocation_adjustments: allocationAdjustments
        });
        success(TOAST_MESSAGES.CREDIT_REDUCTION_RESOLVED, 'تم حل تعارض تخفيض الرصيد بنجاح');
      } else {
        // Normal update
        await updateCreditMutation.mutateAsync({
          id: credit.id,
          amount: data.amount
        });
        success(TOAST_MESSAGES.CREDIT_UPDATED, 'تم تحديث مبلغ الرصيد بنجاح');
      }
      closeModal();
    } catch (err: any) {
      if (isConflictError(err) && err.response.data?.code === 'credit_reduction_conflict') {
        setConflictData(err.response.data.data);
        // Initialize allocation adjustments
        const adjustments: AllocationAdjustment[] = err.response.data.data.allocations.map(
          (allocation: any) => ({
            allocation_id: allocation.id,
            action: 'keep' as const,
            new_amount: allocation.amount
          })
        );
        setAllocationAdjustments(adjustments);
      } else {
        error(TOAST_MESSAGES.UPDATE_FAILED, getErrorMessage(err, 'فشل تحديث الرصيد'));
      }
    }
  };

  const handleAllocationActionChange = (allocationId: number, action: AllocationAdjustment['action'], newAmount?: number) => {
    setAllocationAdjustments(prev => 
      prev.map(adj => 
        adj.allocation_id === allocationId 
          ? { ...adj, action, new_amount: newAmount }
          : adj
      )
    );
  };

  const getTotalReduction = () => {
    if (!conflictData) return 0;
    
    return conflictData.allocations.reduce((total, allocation, index) => {
      const adjustment = allocationAdjustments[index];
      if (!adjustment) return total;
      
      switch (adjustment.action) {
        case 'remove_allocation':
          return total + allocation.amount;
        case 'reduce_allocation':
          return total + (allocation.amount - (adjustment.new_amount || 0));
        default:
          return total;
      }
    }, 0);
  };

  const isResolutionValid = () => {
    if (!conflictData) return true;
    
    const totalReduction = getTotalReduction();
    return totalReduction >= conflictData.deficit;
  };

  return (
    <BaseModal isOpen={true} onClose={closeModal} title={t('credits.editCredit')}>
      <form onSubmit={handleSubmit(handleUpdate)} className="space-y-4">
        <div className="space-y-2">
          <label className="font-semibold text-black text-sm block">{t('credits.currentAmount')}</label>
          <div className="text-black">
            <SaudiRiyalIcon amount={credit.amount} />
          </div>
        </div>

        <Input
          label={t('credits.newAmount')}
          type="number"
          step="0.01"
          {...register('amount', { 
            required: true, 
            valueAsNumber: true,
            min: 0,
            validate: (value) => {
              if (conflictData && value > credit.amount) {
                return t('credits.cannotIncreaseAmount');
              }
              return true;
            }
          })}
          error={errors.amount?.message}
        />

        {conflictData && (
          <div className="rounded-lg border border-yellow-600 bg-yellow-50 p-4 space-y-3">
            <div>
              <h6 className="font-semibold text-black">{t('credits.creditReductionConflict')}</h6>
              <p className="text-sm text-yellow-800">{t('credits.cannotReduceBelowAllocated')}</p>
              <p className="text-sm text-yellow-800"><strong>{t('credits.allocatedAmount')}: </strong><SaudiRiyalIcon amount={conflictData.allocated_amount} /></p>
              <p className="text-sm text-yellow-800"><strong>{t('credits.deficit')}: </strong><SaudiRiyalIcon amount={conflictData.deficit} /></p>
            </div>
            
            <div className="space-y-2">
              <h6 className="font-semibold text-black text-sm">{t('credits.allocationAdjustments')}</h6>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {conflictData.allocations.map((allocation, index) => (
                  <div key={allocation.id} className="rounded-lg border border-border bg-card p-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <strong className="text-sm text-black block">{allocation.description ?? t('common.noDescription')}</strong>
                        <div className="text-sm text-muted-foreground mt-1">
                          <SaudiRiyalIcon amount={allocation.amount} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <select
                          className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                          value={allocationAdjustments[index]?.action || 'keep'}
                          onChange={(e) => {
                            const action = e.target.value as AllocationAdjustment['action'];
                            handleAllocationActionChange(allocation.id, action, allocation.amount);
                          }}
                        >
                          <option value="keep">{t('credits.keepAllocation')}</option>
                          <option value="reduce_allocation">{t('credits.reduceAllocation')}</option>
                          <option value="remove_allocation">{t('credits.removeAllocation')}</option>
                        </select>
                        
                        {allocationAdjustments[index]?.action === 'reduce_allocation' && (
                          <div>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder={t('credits.newAmount')}
                              value={allocationAdjustments[index]?.new_amount || ''}
                              onChange={(e) => {
                                handleAllocationActionChange(
                                  allocation.id, 
                                  'reduce_allocation', 
                                  parseFloat(e.target.value) || 0
                                );
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="text-sm font-semibold text-black pt-2 border-t border-yellow-200">
              {t('credits.totalReduction')}: <SaudiRiyalIcon amount={getTotalReduction()} />
            </div>
            
            {!isResolutionValid() && (
              <div className="text-destructive text-xs">
                {t('credits.insufficientReduction')}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button type="button" variant="secondary" onClick={closeModal}>
            {t('common.cancel')}
          </Button>
          <Button 
              type="submit" 
              variant="primary" 
              isLoading={updateCreditMutation.isPending || resolveReductionMutation.isPending}
              disabled={conflictData ? !isResolutionValid() : false}
            >
              {t('common.save')}
            </Button>
        </div>
      </form>
    </BaseModal>
  );
};

export default CreditEditModal;