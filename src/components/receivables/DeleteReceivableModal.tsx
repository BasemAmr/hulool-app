import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
      <div className="modal-body">
        <div className="alert alert-warning">
          <h6>{t('common.warning')}!</h6>
          <p>{t('receivables.deleteReceivableWarning', { 
            description: receivable.description,
            amount: receivable.amount 
          })}</p>
        </div>

        {conflictData && (
          <div className="alert alert-warning text-dark">
            <h6>{t('receivables.overpaymentConflict')}</h6>
            <p>{t('receivables.cannotDeleteWithPayments')}</p>
            <p><strong>{t('receivables.totalPaid')}: </strong><SaudiRiyalIcon amount={conflictData.total_paid} /></p>
            <p><strong>{t('receivables.surplus')}: </strong><SaudiRiyalIcon amount={conflictData.surplus} /></p>
            <p className="text-muted">
              {t('receivables.cannotDeleteWithPayments')}
            </p>
            
            {conflictData.payments.length > 0 && (
              <div className="mt-3">
                <h6>{t('receivables.paymentDecisions')}</h6>
                {conflictData.payments.map((payment) => (
                  <div key={payment.id} className="card mb-2">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <strong>{payment.description || t('common.noDescription')}</strong>
                          <br />
                          <SaudiRiyalIcon amount={payment.amount} />
                        </div>
                        <div>
                          <select
                            className="form-select form-select-sm"
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
                            <div className="mt-2">
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
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {conflictData.allocations.length > 0 && (
              <div className="mt-4">
                <h6>{t('receivables.allocationDecisions')}</h6>
                {conflictData.allocations.map((allocation) => (
                  <div key={allocation.id} className="card mb-2">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <strong>{allocation.description || t('common.noDescription')}</strong>
                          <br />
                          <SaudiRiyalIcon amount={allocation.amount} />
                        </div>
                        <div>
                          <select
                            className="form-select form-select-sm"
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
                  </div>
                ))}
              </div>
            )}
            

          </div>
        )}
      </div>

      <footer className="modal-footer">
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
      </footer>
    </BaseModal>
  );
};

export default DeleteReceivableModal;