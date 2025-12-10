import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { useModalStore } from '../../stores/modalStore';
import { useDeleteReceivable, useDeleteReceivableWithResolution } from '../../queries/receivableQueries';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import SaudiRiyalIcon from '../ui/SaudiRiyalIcon';
import type { Receivable, PaymentDecision, AllocationDecision } from '../../api/types';

interface DeleteReceivableModalProps {
  receivable: Receivable;
}

const DeleteReceivableModal = () => {
  const { t } = useTranslation();
  const closeModal = useModalStore((state) => state.closeModal);
  const { receivable } = useModalStore(state => state.props as DeleteReceivableModalProps);
  
  interface ConflictResponse {
    receivable_id: number;
    total_paid: number;
    surplus: number;
    payments: any[];
    allocations: any[];
  }

  const [conflictData, setConflictData] = useState<ConflictResponse | null>(null);
  const [paymentDecisions, setPaymentDecisions] = useState<PaymentDecision[]>([]);
  const [allocationDecisions, setAllocationDecisions] = useState<AllocationDecision[]>([]);

  const deleteMutation = useDeleteReceivable();
  const deleteWithResolutionMutation = useDeleteReceivableWithResolution();

  useEffect(() => {
    // Check for conflicts when modal opens
    // This will be handled by the API when delete is attempted
  }, [receivable]);

  const handleDelete = () => {
    if (conflictData) {
      deleteWithResolutionMutation.mutate(
        { 
            id: receivable.id, 
            resolution: {
              payment_decisions: paymentDecisions,
              allocation_decisions: allocationDecisions
            }
          },
          { onSuccess: closeModal }
      );
    } else {
      deleteMutation.mutate(
        receivable.id,
        { 
          onSuccess: closeModal,
          onError: (error: any) => {
            if (error.response?.status === 409 && error.response.data?.code === 'deletion_conflict_financial_records_exist') {
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

  const handlePaymentDecisionChange = (paymentId: number, action: PaymentDecision['action'], newAmount?: number) => {
    setPaymentDecisions(prev => 
      prev.map(decision => 
        decision.payment_id === paymentId 
          ? { ...decision, action, new_amount: newAmount }
          : decision
      )
    );
  };

  const handleAllocationDecisionChange = (allocationId: number, action: AllocationDecision['action']) => {
    setAllocationDecisions(prev => 
      prev.map(decision => 
        decision.allocation_id === allocationId 
          ? { ...decision, action }
          : decision
      )
    );
  };



  const isReadyToDelete = () => {
    if (!conflictData) return true;
    return true; // Allow deletion with current decisions
  };



  return (
    <BaseModal isOpen={true} onClose={closeModal} title={t('receivables.deleteReceivable')}>
      <div className="space-y-4">
        {/* Warning Alert */}
        <div className="rounded-lg border border-yellow-600 bg-yellow-50 p-4 flex gap-3">
          <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-0.5 h-5 w-5" />
          <div className="space-y-1">
            <h6 className="font-semibold text-yellow-900">{t('common.warning')}!</h6>
            <p className="text-yellow-800 text-sm">{t('receivables.deleteReceivableWarning', { 
              description: receivable.description,
              amount: receivable.amount 
            })}</p>
          </div>
        </div>

        {conflictData && (
          <div className="rounded-lg border border-yellow-600 bg-yellow-50 p-4 space-y-3">
            <div className="space-y-2">
              <h6 className="font-semibold text-yellow-900">{t('receivables.overpaymentConflict')}</h6>
              <p className="text-yellow-800 text-sm">{t('receivables.cannotDeleteWithPayments')}</p>
              <p className="text-yellow-800 text-sm">
                <span className="font-medium">{t('receivables.totalPaid')}: </span>
                <SaudiRiyalIcon amount={conflictData.total_paid} />
              </p>
              <p className="text-yellow-800 text-sm">
                <span className="font-medium">{t('receivables.surplus')}: </span>
                <SaudiRiyalIcon amount={conflictData.surplus} />
              </p>
            </div>
            
            {conflictData.payments.length > 0 && (
              <div className="space-y-2">
                <h6 className="font-semibold text-yellow-900">{t('receivables.paymentDecisions')}</h6>
                {conflictData.payments.map((payment) => (
                  <div key={payment.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
                    <div className="flex justify-between gap-4 items-start">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-black text-sm">
                          {payment.description || t('common.noDescription')}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          <SaudiRiyalIcon amount={payment.amount} />
                        </p>
                      </div>
                      <div className="space-y-2 min-w-fit">
                        <select
                          className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          value={paymentDecisions.find(p => p.payment_id === payment.id)?.action || 'keep'}
                          onChange={(e) => {
                            const action = e.target.value as PaymentDecision['action'];
                            handlePaymentDecisionChange(payment.id, action);
                          }}
                        >
                          <option value="keep">{t('receivables.keepPayment')}</option>
                          <option value="delete">{t('receivables.deletePayment')}</option>
                          <option value="convert_to_credit">{t('receivables.convertToCredit')}</option>
                          <option value="reduce_to_X">{t('receivables.reducePayment')}</option>
                        </select>
                        
                        {paymentDecisions.find(p => p.payment_id === payment.id)?.action === 'reduce_to_X' && (
                          <Input
                            type="number"
                            step="0.01"
                            placeholder={t('receivables.newAmount')}
                            value={paymentDecisions.find(p => p.payment_id === payment.id)?.new_amount || ''}
                            onChange={(e) => {
                              handlePaymentDecisionChange(
                                payment.id, 
                                'reduce_to_X', 
                                parseFloat(e.target.value) || 0
                              );
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {conflictData.allocations.length > 0 && (
              <div className="space-y-2">
                <h6 className="font-semibold text-yellow-900">{t('receivables.allocationDecisions')}</h6>
                {conflictData.allocations.map((allocation) => (
                  <div key={allocation.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
                    <div className="flex justify-between gap-4 items-start">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-black text-sm">
                          {allocation.description || t('common.noDescription')}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          <SaudiRiyalIcon amount={allocation.amount} />
                        </p>
                      </div>
                      <div className="min-w-fit">
                        <select
                          className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          value={allocationDecisions.find(a => a.allocation_id === allocation.id)?.action || 'keep'}
                          onChange={(e) => {
                            const action = e.target.value as AllocationDecision['action'];
                            handleAllocationDecisionChange(allocation.id, action);
                          }}
                        >
                          <option value="keep">{t('receivables.keepAllocation')}</option>
                          <option value="delete_allocation">{t('receivables.deleteAllocation')}</option>
                          <option value="return_to_credit">{t('receivables.returnToCredit')}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
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
            isLoading={deleteMutation.isPending || deleteWithResolutionMutation.isPending}
            disabled={!isReadyToDelete() || deleteMutation.isPending || deleteWithResolutionMutation.isPending}
          >
            {t('common.delete')}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};

export default DeleteReceivableModal;