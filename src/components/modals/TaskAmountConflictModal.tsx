import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import { useModalStore } from '../../stores/modalStore';
import { useResolveTaskAmountChange } from '../../queries/taskQueries';
import { useToast } from '../../hooks/useToast';
import type { 
  TaskAmountConflictData, 
  MainReceivableDecisions,
  MainReceivablePaymentDecision,
  MainReceivableAllocationDecision,
  EnrichedPayment,
  EnrichedAllocation
} from '../../api/types';

interface TaskAmountConflictModalProps {
  taskId: number;
  conflictData: TaskAmountConflictData;
  newTaskAmount: number;
  onResolved: () => void;
}

const TaskAmountConflictModal: React.FC<TaskAmountConflictModalProps> = ({
  taskId,
  conflictData,
  newTaskAmount,
  onResolved
}) => {
  const { t } = useTranslation();
  const { closeModal } = useModalStore();
  const { showToast } = useToast();
  const resolveAmountChange = useResolveTaskAmountChange();

  const [paymentDecisions, setPaymentDecisions] = useState<MainReceivablePaymentDecision[]>([]);
  const [allocationDecisions, setAllocationDecisions] = useState<MainReceivableAllocationDecision[]>([]);

  const handlePaymentDecision = (payment: EnrichedPayment, decision: MainReceivablePaymentDecision) => {
    setPaymentDecisions(prev => {
      const existing = prev.find(d => d.payment_id === payment.id);
      if (existing) {
        return prev.map(d => d.payment_id === payment.id ? decision : d);
      }
      return [...prev, decision];
    });
  };

  const handleAllocationDecision = (allocation: EnrichedAllocation, decision: MainReceivableAllocationDecision) => {
    setAllocationDecisions(prev => {
      const existing = prev.find(d => d.allocation_id === allocation.id);
      if (existing) {
        return prev.map(d => d.allocation_id === allocation.id ? decision : d);
      }
      return [...prev, decision];
    });
  };

  const handleResolve = async () => {
    try {
      const decisions: MainReceivableDecisions = {
        payment_decisions: paymentDecisions,
        allocation_decisions: allocationDecisions
      };

      await resolveAmountChange.mutateAsync({
        id: taskId,
        new_task_amount: newTaskAmount,
        main_receivable_decisions: decisions
      });

      showToast({
        type: 'success',
        title: t('tasks.amountConflictResolved')
      });
      onResolved();
      closeModal();
    } catch (error: any) {
      showToast({
        type: 'error',
        title: error.message || t('common.error')
      });
    }
  };

  const renderConflictSummary = () => (
    <div className="conflict-summary bg-red-50 p-4 rounded-lg mb-6">
      <h3 className="text-lg font-semibold text-red-800 mb-3">
        {t('tasks.taskAmountConflictDetected')}
      </h3>
      <div className="space-y-2 text-sm">
        <p><strong>{t('tasks.currentTaskAmount')}:</strong> {conflictData.current_task_amount.toLocaleString()} SAR</p>
        <p><strong>{t('tasks.newTaskAmount')}:</strong> {conflictData.new_task_amount.toLocaleString()} SAR</p>
        <p><strong>{t('tasks.currentMainReceivableAmount')}:</strong> {conflictData.current_main_receivable_amount.toLocaleString()} SAR</p>
        <p><strong>{t('tasks.calculatedNewMainAmount')}:</strong> {conflictData.calculated_new_main_amount.toLocaleString()} SAR</p>
        <p><strong>{t('tasks.totalPaidOnMain')}:</strong> {conflictData.main_receivable_paid.toLocaleString()} SAR</p>
        <p className="text-red-700 font-semibold">
          <strong>{t('tasks.overpaymentSurplus')}:</strong> {conflictData.surplus.toLocaleString()} SAR
        </p>
      </div>
      
      <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400">
        <p className="text-yellow-800 text-sm">
          <strong>{t('tasks.conflictExplanation')}:</strong> {t('tasks.mainReceivableOverpaymentMessage')}
        </p>
      </div>
    </div>
  );

  const renderPaymentDecisions = () => (
    <div className="payment-decisions mb-6">
      <h3 className="text-lg font-semibold mb-3">{t('tasks.mainReceivablePaymentDecisions')}</h3>
      {conflictData.financial_records.payments.map((payment) => (
        <div key={payment.id} className="payment-item border p-4 rounded-lg mb-3">
          <div className="payment-info mb-3">
            <p><strong>{t('payments.amount')}:</strong> {payment.amount.toLocaleString()} SAR</p>
            <p><strong>{t('payments.method')}:</strong> {payment.payment_method_name || 'Cash'}</p>
            <p><strong>{t('payments.paidAt')}:</strong> {new Date(payment.paid_at).toLocaleDateString()}</p>
            <p><strong>{t('payments.createdBy')}:</strong> {payment.created_by_name || 'Unknown'}</p>
          </div>
          
          <div className="decision-options">
            <label className="block mb-2 font-semibold">{t('tasks.chooseAction')}:</label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input 
                  type="radio" 
                  name={`main-payment-${payment.id}`}
                  onChange={() => handlePaymentDecision(payment, { payment_id: payment.id, action: 'keep' })}
                  className="mr-2"
                />
                {t('tasks.keepPayment')} ({t('tasks.willCreateOverpayment')})
              </label>
              <label className="flex items-center">
                <input 
                  type="radio" 
                  name={`main-payment-${payment.id}`}
                  onChange={() => handlePaymentDecision(payment, { payment_id: payment.id, action: 'delete' })}
                  className="mr-2"
                />
                {t('tasks.deletePayment')}
              </label>
              <label className="flex items-center">
                <input 
                  type="radio" 
                  name={`main-payment-${payment.id}`}
                  onChange={() => handlePaymentDecision(payment, { 
                    payment_id: payment.id, 
                    action: 'convert_to_credit'
                  })}
                  className="mr-2"
                />
                {t('tasks.convertToCredit')}
              </label>
              <div className="flex items-center">
                <input 
                  type="radio" 
                  name={`main-payment-${payment.id}`}
                  onChange={() => handlePaymentDecision(payment, { 
                    payment_id: payment.id, 
                    action: 'reduce_to',
                    new_amount: Math.min(payment.amount, conflictData.calculated_new_main_amount)
                  })}
                  className="mr-2"
                />
                <label className="mr-2">{t('tasks.reduceTo')}:</label>
                <input 
                  type="number" 
                  className="border rounded px-2 py-1 w-24"
                  max={payment.amount}
                  defaultValue={Math.min(payment.amount, conflictData.calculated_new_main_amount)}
                  onChange={(e) => handlePaymentDecision(payment, { 
                    payment_id: payment.id, 
                    action: 'reduce_to',
                    new_amount: parseFloat(e.target.value)
                  })}
                />
                <span className="ml-1">SAR</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderAllocationDecisions = () => (
    <div className="allocation-decisions mb-6">
      <h3 className="text-lg font-semibold mb-3">{t('tasks.mainReceivableAllocationDecisions')}</h3>
      {conflictData.financial_records.allocations.map((allocation) => (
        <div key={allocation.id} className="allocation-item border p-4 rounded-lg mb-3">
          <div className="allocation-info mb-3">
            <p><strong>{t('allocations.amount')}:</strong> {allocation.amount.toLocaleString()} SAR</p>
            <p><strong>{t('allocations.allocatedAt')}:</strong> {new Date(allocation.allocated_at).toLocaleDateString()}</p>
            <p><strong>{t('allocations.creditSource')}:</strong> {allocation.credit_description || 'Credit'}</p>
          </div>
          
          <div className="decision-options">
            <label className="block mb-2 font-semibold">{t('tasks.chooseAction')}:</label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input 
                  type="radio" 
                  name={`main-allocation-${allocation.id}`}
                  onChange={() => handleAllocationDecision(allocation, { allocation_id: allocation.id, action: 'keep' })}
                  className="mr-2"
                />
                {t('tasks.keepAllocation')} ({t('tasks.willCreateOverpayment')})
              </label>
              <label className="flex items-center">
                <input 
                  type="radio" 
                  name={`main-allocation-${allocation.id}`}
                  onChange={() => handleAllocationDecision(allocation, { allocation_id: allocation.id, action: 'return_to_credit' })}
                  className="mr-2"
                />
                {t('tasks.returnToCredit')}
              </label>
              <label className="flex items-center">
                <input 
                  type="radio" 
                  name={`main-allocation-${allocation.id}`}
                  onChange={() => handleAllocationDecision(allocation, { allocation_id: allocation.id, action: 'delete_allocation' })}
                  className="mr-2"
                />
                {t('tasks.deleteAllocation')}
              </label>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <BaseModal
      isOpen={true}
      onClose={closeModal}
      title={t('tasks.resolveAmountConflict')}
      className="large-modal"
    >
      <div className="task-amount-conflict-modal">
        {renderConflictSummary()}
        
        {conflictData.financial_records.payments.length > 0 && renderPaymentDecisions()}
        {conflictData.financial_records.allocations.length > 0 && renderAllocationDecisions()}

        <div className="modal-actions flex justify-end gap-3 pt-4 border-t">
          <Button variant="secondary" onClick={closeModal}>
            {t('common.cancel')}
          </Button>
          <Button 
            variant="primary" 
            onClick={handleResolve}
            disabled={resolveAmountChange.isPending}
          >
            {resolveAmountChange.isPending ? t('common.processing') : t('tasks.resolveConflict')}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};

export default TaskAmountConflictModal;
