import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useModalStore } from '../../stores/modalStore';
import { useUpdateClientCredit, useResolveCreditReduction } from '../../queries/clientCreditQueries';
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
      } else {
        // Normal update
        await updateCreditMutation.mutateAsync({
          id: credit.id,
          amount: data.amount
        });
      }
      closeModal();
    } catch (error: any) {
      if (error.response?.status === 409 && error.response.data?.code === 'credit_reduction_conflict') {
        setConflictData(error.response.data.data);
        // Initialize allocation adjustments
        const adjustments: AllocationAdjustment[] = error.response.data.data.allocations.map(
          (allocation: any) => ({
            allocation_id: allocation.id,
            action: 'keep' as const,
            new_amount: allocation.amount
          })
        );
        setAllocationAdjustments(adjustments);
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
      <form onSubmit={handleSubmit(handleUpdate)}>
        <div className="mb-3">
          <label className="form-label text-dark">{t('credits.currentAmount')}</label>
          <div className="text-dark">
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
          <div className="alert alert-warning text-dark">
            <h6>{t('credits.creditReductionConflict')}</h6>
            <p>{t('credits.cannotReduceBelowAllocated')}</p>
            <p><strong>{t('credits.allocatedAmount')}: </strong><SaudiRiyalIcon amount={conflictData.allocated_amount} /></p>
            <p><strong>{t('credits.deficit')}: </strong><SaudiRiyalIcon amount={conflictData.deficit} /></p>
            
            <div className="mt-3">
              <h6>{t('credits.allocationAdjustments')}</h6>
              {conflictData.allocations.map((allocation, index) => (
                <div key={allocation.id} className="card mb-2">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <strong>{allocation.description ?? t('common.noDescription')}</strong>
                      <br />
                      <br />
                      <SaudiRiyalIcon amount={allocation.amount} />
                      </div>
                      <div>
                        <select
                          className="form-select form-select-sm"
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
                          <div className="mt-2">
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
                </div>
              ))}
            </div>
            
            <div className="mt-2">
              <strong>{t('credits.totalReduction')}: <SaudiRiyalIcon amount={getTotalReduction()} /></strong>
            </div>
            
            {!isResolutionValid() && (
              <div className="text-danger small mt-2">
                {t('credits.insufficientReduction')}
              </div>
            )}
          </div>
        )}

        <footer className="modal-footer">
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
        </footer>
      </form>
    </BaseModal>
  );
};

export default CreditEditModal;