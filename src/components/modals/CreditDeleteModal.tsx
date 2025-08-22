import  { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useModalStore } from '../../stores/modalStore';
import { useDeleteClientCredit, useResolveCreditDeletion } from '../../queries/clientCreditQueries';
import { useGetPaymentMethods } from '../../queries/paymentQueries';
import type { ClientCredit, CreditDeletionConflictData, AllocationResolution } from '../../api/types';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import SaudiRiyalIcon from '../ui/SaudiRiyalIcon';

interface CreditDeleteModalProps {
  credit: ClientCredit;
  clientId: number;
}

const CreditDeleteModal = () => {
  const { t } = useTranslation();
  const closeModal = useModalStore(state => state.closeModal);
  const { credit } = useModalStore(state => state.props as CreditDeleteModalProps);
  
  const [conflictData, setConflictData] = useState<CreditDeletionConflictData | null>(null);
  const [allocationResolutions, setAllocationResolutions] = useState<AllocationResolution[]>([]);
  
  const deleteCreditMutation = useDeleteClientCredit();
  const resolveDeletionMutation = useResolveCreditDeletion();
  const { data: paymentMethods } = useGetPaymentMethods();

  const handleDelete = async () => {
    try {
      if (conflictData) {
        // Handle conflict resolution
        await resolveDeletionMutation.mutateAsync({
          id: credit.id,
          allocation_resolutions: allocationResolutions
        });
      } else {
        // Normal deletion
        await deleteCreditMutation.mutateAsync(credit.id);
      }
      closeModal();
    } catch (error: any) {
      if (error.response?.status === 409 && error.response.data?.code === 'credit_deletion_conflict') {
        setConflictData(error.response.data.data);
        // Initialize allocation resolutions
        const resolutions: AllocationResolution[] = error.response.data.data.allocations.map(
          (allocation: any) => ({
            allocation_id: allocation.id,
            action: 'delete_allocation' as const
          })
        );
        setAllocationResolutions(resolutions);
      }
    }
  };

  const handleAllocationResolutionChange = (allocationId: number, action: AllocationResolution['action'], paymentMethodId?: number) => {
    setAllocationResolutions(prev => 
      prev.map(res => 
        res.allocation_id === allocationId 
          ? { ...res, action, payment_method_id: paymentMethodId }
          : res
      )
    );
  };

  const isResolutionValid = () => {
    if (!conflictData) return true;
    
    // Check if all convert_to_payment actions have payment method selected
    return allocationResolutions.every(res => {
      if (res.action === 'convert_to_payment') {
        return res.payment_method_id !== undefined;
      }
      return true;
    });
  };

  return (
    <BaseModal isOpen={true} onClose={closeModal} title={t('credits.deleteCredit')}>
      <div className="mb-3">
        <p className="text-dark">{t('credits.deleteCreditConfirmation', { description: credit.description })}</p>
        <div className="text-dark">
          <strong>{t('credits.amount')}: </strong>
          <SaudiRiyalIcon amount={credit.amount} />
        </div>
        <div className="text-dark">
          <strong>{t('credits.allocatedAmount')}: </strong>
          <SaudiRiyalIcon amount={credit.allocated_amount} />
        </div>
        <div className="text-dark">
          <strong>{t('credits.remainingAmount')}: </strong>
          <SaudiRiyalIcon amount={credit.amount - credit.allocated_amount} />
        </div>
      </div>

      {conflictData && (
        <div className="alert alert-warning text-dark">
          <h6>{t('credits.creditDeletionConflict')}</h6>
          <p>{t('credits.cannotDeleteWithAllocations')}</p>
          <p><strong>{t('credits.allocatedAmount')}: </strong><SaudiRiyalIcon amount={conflictData.allocated_amount} /></p>
          
          <div className="mt-3">
            <h6>{t('credits.allocationResolutions')}</h6>
            {conflictData.allocations.map((allocation, index) => (
              <div key={allocation.id} className="card mb-2">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <strong>{allocation.description ?? t('common.noDescription')}</strong>
                      <br />
                      <SaudiRiyalIcon amount={allocation.amount} />
                    </div>
                    <div>
                      <select
                        className="form-select form-select-sm"
                        value={allocationResolutions[index]?.action || 'delete_allocation'}
                        onChange={(e) => {
                          const action = e.target.value as AllocationResolution['action'];
                          handleAllocationResolutionChange(allocation.id, action);
                        }}
                      >
                        <option value="delete_allocation">{t('credits.deleteAllocation')}</option>
                        <option value="convert_to_payment">{t('credits.convertToPayment')}</option>
                      </select>
                      
                      {allocationResolutions[index]?.action === 'convert_to_payment' && (
                        <div className="mt-2">
                          <select
                            className="form-select form-select-sm"
                            value={allocationResolutions[index]?.payment_method_id || ''}
                            onChange={(e) => {
                              handleAllocationResolutionChange(
                                allocation.id, 
                                'convert_to_payment', 
                                parseInt(e.target.value)
                              );
                            }}
                          >
                            <option value="">{t('common.selectPaymentMethod')}</option>
                            {paymentMethods?.map(method => (
                              <option key={method.id} value={method.id}>{method.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {!isResolutionValid() && (
            <div className="text-danger small mt-2">
              {t('credits.selectPaymentMethodForConversion')}
            </div>
          )}
        </div>
      )}

      <footer className="modal-footer">
        <Button type="button" variant="secondary" onClick={closeModal}>
          {t('common.cancel')}
        </Button>
        <Button 
          type="button" 
          variant="danger" 
          onClick={handleDelete}
          isLoading={deleteCreditMutation.isPending || resolveDeletionMutation.isPending}
          disabled={conflictData ? !isResolutionValid() : false}
        >
          {t('common.delete')}
        </Button>
      </footer>
    </BaseModal>
  );
};

export default CreditDeleteModal;