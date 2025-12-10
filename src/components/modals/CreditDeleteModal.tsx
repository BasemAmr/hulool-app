import  { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
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
      <div className="space-y-4">
        {/* Credit Details */}
        <div className="space-y-2">
          <p className="text-black text-sm">{t('credits.deleteCreditConfirmation', { description: credit.description })}</p>
          <div className="text-black text-sm">
            <span className="font-medium">{t('credits.amount')}: </span>
            <SaudiRiyalIcon amount={credit.amount} />
          </div>
          <div className="text-black text-sm">
            <span className="font-medium">{t('credits.allocatedAmount')}: </span>
            <SaudiRiyalIcon amount={credit.allocated_amount} />
          </div>
          <div className="text-black text-sm">
            <span className="font-medium">{t('credits.remainingAmount')}: </span>
            <SaudiRiyalIcon amount={credit.amount - credit.allocated_amount} />
          </div>
        </div>

        {conflictData && (
          <div className="rounded-lg border border-yellow-600 bg-yellow-50 p-4 space-y-3">
            <div className="flex gap-3">
              <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-0.5 h-5 w-5" />
              <div className="space-y-2">
                <h6 className="font-semibold text-yellow-900">{t('credits.creditDeletionConflict')}</h6>
                <p className="text-yellow-800 text-sm">{t('credits.cannotDeleteWithAllocations')}</p>
                <p className="text-yellow-800 text-sm">
                  <span className="font-medium">{t('credits.allocatedAmount')}: </span>
                  <SaudiRiyalIcon amount={conflictData.allocated_amount} />
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <h6 className="font-semibold text-yellow-900">{t('credits.allocationResolutions')}</h6>
              {conflictData.allocations.map((allocation, index) => (
                <div key={allocation.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
                  <div className="flex justify-between gap-4 items-start">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-black text-sm">
                        {allocation.description ?? t('common.noDescription')}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        <SaudiRiyalIcon amount={allocation.amount} />
                      </p>
                    </div>
                    <div className="space-y-2 min-w-fit">
                      <select
                        className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
                        <select
                          className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {!isResolutionValid() && (
              <div className="text-destructive text-xs font-medium mt-2">
                {t('credits.selectPaymentMethodForConversion')}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t border-border">
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
        </div>
      </div>
    </BaseModal>
  );
};

export default CreditDeleteModal;