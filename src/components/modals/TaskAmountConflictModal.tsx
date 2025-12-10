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
    <div className="rounded-lg border border-destructive bg-destructive/10 p-4 space-y-3">
      <h3 className="text-lg font-semibold text-destructive">
        {t('tasks.taskAmountConflictDetected')}
      </h3>
      <div className="space-y-2 text-sm">
        <p><strong>{t('tasks.currentTaskAmount')}:</strong> {conflictData.current_task_amount.toLocaleString()} SAR</p>
        <p><strong>{t('tasks.newTaskAmount')}:</strong> {conflictData.new_task_amount.toLocaleString()} SAR</p>
        <p><strong>{t('tasks.currentMainReceivableAmount')}:</strong> {conflictData.current_main_receivable_amount.toLocaleString()} SAR</p>
        <p><strong>{t('tasks.calculatedNewMainAmount')}:</strong> {conflictData.calculated_new_main_amount.toLocaleString()} SAR</p>
        <p><strong>{t('tasks.totalPaidOnMain')}:</strong> {conflictData.main_receivable_paid.toLocaleString()} SAR</p>
        <p className="text-destructive font-semibold">
          <strong>{t('tasks.overpaymentSurplus')}:</strong> {conflictData.surplus.toLocaleString()} SAR
        </p>
      </div>
      
      <div className="p-3 rounded-lg border border-yellow-600 bg-yellow-50">
        <p className="text-yellow-800 text-sm">
          <strong>{t('tasks.conflictExplanation')}:</strong> {t('tasks.mainReceivableOverpaymentMessage')}
        </p>
      </div>
    </div>
  );

  const renderPaymentDecisions = () => (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-black">{t('tasks.mainReceivablePaymentDecisions')}</h3>
      {conflictData.financial_records.payments.map((payment) => (
        <div key={payment.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="space-y-2 text-sm">
            <p><strong>{t('payments.amount')}:</strong> {payment.amount.toLocaleString()} SAR</p>
            <p><strong>{t('payments.method')}:</strong> {payment.payment_method_name || 'Cash'}</p>
            <p><strong>{t('payments.paidAt')}:</strong> {new Date(payment.paid_at).toLocaleDateString()}</p>
            <p><strong>{t('payments.createdBy')}:</strong> {payment.created_by_name || 'Unknown'}</p>
          </div>
          
          <div className="space-y-2">
            <label className="block font-semibold text-sm text-black">{t('tasks.chooseAction')}:</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 transition-colors cursor-pointer">
                <input 
                  type="radio" 
                  name={`main-payment-${payment.id}`}
                  onChange={() => handlePaymentDecision(payment, { payment_id: payment.id, action: 'keep' })}
                  className="rounded"
                />
                <span className="text-sm">{t('tasks.keepPayment')} ({t('tasks.willCreateOverpayment')})</span>
              </label>
              <label className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 transition-colors cursor-pointer">
                <input 
                  type="radio" 
                  name={`main-payment-${payment.id}`}
                  onChange={() => handlePaymentDecision(payment, { payment_id: payment.id, action: 'delete' })}
                  className="rounded"
                />
                <span className="text-sm">{t('tasks.deletePayment')}</span>
              </label>
              <label className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 transition-colors cursor-pointer">
                <input 
                  type="radio" 
                  name={`main-payment-${payment.id}`}
                  onChange={() => handlePaymentDecision(payment, { 
                    payment_id: payment.id, 
                    action: 'convert_to_credit'
                  })}
                  className="rounded"
                />
                <span className="text-sm">{t('tasks.convertToCredit')}</span>
              </label>
              <div className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 transition-colors">
                <input 
                  type="radio" 
                  name={`main-payment-${payment.id}`}
                  onChange={() => handlePaymentDecision(payment, { 
                    payment_id: payment.id, 
                    action: 'reduce_to',
                    new_amount: Math.min(payment.amount, conflictData.calculated_new_main_amount)
                  })}
                  className="rounded"
                />
                <label className="text-sm cursor-pointer">{t('tasks.reduceTo')}:</label>
                <input 
                  type="number" 
                  className="border border-border rounded px-2 py-1 w-24 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  max={payment.amount}
                  defaultValue={Math.min(payment.amount, conflictData.calculated_new_main_amount)}
                  onChange={(e) => handlePaymentDecision(payment, { 
                    payment_id: payment.id, 
                    action: 'reduce_to',
                    new_amount: parseFloat(e.target.value)
                  })}
                />
                <span className="text-sm">SAR</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderAllocationDecisions = () => (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-black">{t('tasks.mainReceivableAllocationDecisions')}</h3>
      {conflictData.financial_records.allocations.map((allocation) => (
        <div key={allocation.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="space-y-2 text-sm">
            <p><strong>{t('allocations.amount')}:</strong> {allocation.amount.toLocaleString()} SAR</p>
            <p><strong>{t('allocations.allocatedAt')}:</strong> {new Date(allocation.allocated_at).toLocaleDateString()}</p>
            <p><strong>{t('allocations.creditSource')}:</strong> {allocation.credit_description || 'Credit'}</p>
          </div>
          
          <div className="space-y-2">
            <label className="block font-semibold text-sm text-black">{t('tasks.chooseAction')}:</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 transition-colors cursor-pointer">
                <input 
                  type="radio" 
                  name={`main-allocation-${allocation.id}`}
                  onChange={() => handleAllocationDecision(allocation, { allocation_id: allocation.id, action: 'keep' })}
                  className="rounded"
                />
                <span className="text-sm">{t('tasks.keepAllocation')} ({t('tasks.willCreateOverpayment')})</span>
              </label>
              <label className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 transition-colors cursor-pointer">
                <input 
                  type="radio" 
                  name={`main-allocation-${allocation.id}`}
                  onChange={() => handleAllocationDecision(allocation, { allocation_id: allocation.id, action: 'return_to_credit' })}
                  className="rounded"
                />
                <span className="text-sm">{t('tasks.returnToCredit')}</span>
              </label>
              <label className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 transition-colors cursor-pointer">
                <input 
                  type="radio" 
                  name={`main-allocation-${allocation.id}`}
                  onChange={() => handleAllocationDecision(allocation, { allocation_id: allocation.id, action: 'delete_allocation' })}
                  className="rounded"
                />
                <span className="text-sm">{t('tasks.deleteAllocation')}</span>
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
    >
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {renderConflictSummary()}
        
        {conflictData.financial_records.payments.length > 0 && renderPaymentDecisions()}
        {conflictData.financial_records.allocations.length > 0 && renderAllocationDecisions()}

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="secondary" onClick={closeModal}>
            {t('common.cancel')}
          </Button>
          <Button 
            variant="primary" 
            onClick={handleResolve}
            isLoading={resolveAmountChange.isPending}
          >
            {t('tasks.resolveConflict')}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};

export default TaskAmountConflictModal;
