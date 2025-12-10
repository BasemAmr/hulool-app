import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import { useModalStore } from '../../stores/modalStore';
import { useResolvePrepaidChange } from '../../queries/taskQueries';
import { useToast } from '../../hooks/useToast';
import type { 
  PrepaidConflictData, 
  PrepaidResolutionDecisions,
  PrepaidPaymentDecision,
  PrepaidAllocationDecision,
  EnrichedPayment,
  EnrichedAllocation
} from '../../api/types';

interface PrepaidConflictModalProps {
  taskId: number;
  conflictData: PrepaidConflictData;
  newPrepaidAmount: number;
  onResolved: () => void;
}

const PrepaidConflictModal: React.FC<PrepaidConflictModalProps> = ({
  taskId,
  conflictData,
  newPrepaidAmount,
  onResolved
}) => {
  const { t } = useTranslation();
  const { closeModal } = useModalStore();
  const { showToast } = useToast();
  const resolvePrepaidChange = useResolvePrepaidChange();

  const [paymentDecisions, setPaymentDecisions] = useState<PrepaidPaymentDecision[]>([]);
  const [allocationDecisions, setAllocationDecisions] = useState<PrepaidAllocationDecision[]>([]);
  const [receivableDecision, setReceivableDecision] = useState<string>('eliminate_prepaid');

  const handlePaymentDecision = (payment: EnrichedPayment, decision: PrepaidPaymentDecision) => {
    setPaymentDecisions(prev => {
      const existing = prev.find(d => d.payment_id === payment.id);
      if (existing) {
        return prev.map(d => d.payment_id === payment.id ? decision : d);
      }
      return [...prev, decision];
    });
  };

  const handleAllocationDecision = (allocation: EnrichedAllocation, decision: PrepaidAllocationDecision) => {
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
      const decisions: PrepaidResolutionDecisions = {
        receivable_decision: receivableDecision,
        payment_decisions: paymentDecisions,
        allocation_decisions: allocationDecisions
      };

      await resolvePrepaidChange.mutateAsync({
        id: taskId,
        new_prepaid_amount: newPrepaidAmount,
        decisions
      });

      showToast({
        type: 'success',
        title: t('tasks.prepaidConflictResolved')
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
        {t('tasks.prepaidConflictDetected')}
      </h3>
      <div className="space-y-2 text-sm">
        <p><strong>{t('tasks.currentPrepaidAmount')}:</strong> {conflictData.current_prepaid_amount.toLocaleString()} SAR</p>
        <p><strong>{t('tasks.newPrepaidAmount')}:</strong> {conflictData.new_prepaid_amount.toLocaleString()} SAR</p>
        <p><strong>{t('tasks.totalPaidOnPrepaid')}:</strong> {conflictData.total_paid.toLocaleString()} SAR</p>
        <p><strong>{t('tasks.taskAmount')}:</strong> {conflictData.task_amount.toLocaleString()} SAR</p>
      </div>
      
      <div className="space-y-2">
        <h4 className="font-semibold text-destructive text-sm">{t('tasks.identifiedConflicts')}:</h4>
        <div className="space-y-1">
          {conflictData.conflicts.map((conflict, index) => (
            <div key={index} className={`text-sm p-2 rounded ${
              conflict.severity === 'high' ? 'border border-destructive bg-destructive/10 text-destructive' :
              conflict.severity === 'medium' ? 'border border-yellow-600 bg-yellow-50 text-yellow-800' :
              'border border-blue-600 bg-blue-50 text-blue-800'
            }`}>
              <span className="font-semibold">{conflict.type.replace(/_/g, ' ').toUpperCase()}:</span> {conflict.message}
              {conflict.surplus && <div className="mt-1">Surplus: {conflict.surplus.toLocaleString()} SAR</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPaymentDecisions = () => (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-black">{t('tasks.paymentDecisions')}</h3>
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
                  name={`payment-${payment.id}`}
                  onChange={() => handlePaymentDecision(payment, { payment_id: payment.id, action: 'keep' })}
                  className="rounded"
                />
                <span className="text-sm">{t('tasks.keepPayment')}</span>
              </label>
              <label className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 transition-colors cursor-pointer">
                <input 
                  type="radio" 
                  name={`payment-${payment.id}`}
                  onChange={() => handlePaymentDecision(payment, { payment_id: payment.id, action: 'delete' })}
                  className="rounded"
                />
                <span className="text-sm">{t('tasks.deletePayment')}</span>
              </label>
              <label className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 transition-colors cursor-pointer">
                <input 
                  type="radio" 
                  name={`payment-${payment.id}`}
                  onChange={() => handlePaymentDecision(payment, { 
                    payment_id: payment.id, 
                    action: 'convert_to_credit',
                    surplus_action: 'convert_to_credit'
                  })}
                  className="rounded"
                />
                <span className="text-sm">{t('tasks.convertToCredit')}</span>
              </label>
              <div className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 transition-colors">
                <input 
                  type="radio" 
                  name={`payment-${payment.id}`}
                  onChange={() => handlePaymentDecision(payment, { 
                    payment_id: payment.id, 
                    action: 'reduce_to',
                    new_amount: newPrepaidAmount
                  })}
                  className="rounded"
                />
                <label className="text-sm cursor-pointer">{t('tasks.reduceTo')}:</label>
                <input 
                  type="number" 
                  className="border border-border rounded px-2 py-1 w-24 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  defaultValue={newPrepaidAmount}
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
      <h3 className="text-lg font-semibold text-black">{t('tasks.allocationDecisions')}</h3>
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
                  name={`allocation-${allocation.id}`}
                  onChange={() => handleAllocationDecision(allocation, { allocation_id: allocation.id, action: 'keep' })}
                  className="rounded"
                />
                <span className="text-sm">{t('tasks.keepAllocation')}</span>
              </label>
              <label className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 transition-colors cursor-pointer">
                <input 
                  type="radio" 
                  name={`allocation-${allocation.id}`}
                  onChange={() => handleAllocationDecision(allocation, { allocation_id: allocation.id, action: 'return_to_credit' })}
                  className="rounded"
                />
                <span className="text-sm">{t('tasks.returnToCredit')}</span>
              </label>
              <label className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 transition-colors cursor-pointer">
                <input 
                  type="radio" 
                  name={`allocation-${allocation.id}`}
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
      title={t('tasks.resolvePrepaidConflict')}
    >
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {renderConflictSummary()}
        
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-black">{t('tasks.prepaidReceivableDecision')}</h3>
          <select 
            value={receivableDecision}
            onChange={(e) => setReceivableDecision(e.target.value)}
            className="w-full border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="eliminate_prepaid">{t('tasks.eliminatePrepaidReceivable')}</option>
            <option value="adjust_to_new_amount">{t('tasks.adjustToNewAmount')}</option>
          </select>
        </div>

        {conflictData.financial_records.payments.length > 0 && renderPaymentDecisions()}
        {conflictData.financial_records.allocations.length > 0 && renderAllocationDecisions()}

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="secondary" onClick={closeModal}>
            {t('common.cancel')}
          </Button>
          <Button 
            variant="primary" 
            onClick={handleResolve}
            isLoading={resolvePrepaidChange.isPending}
          >
            {t('tasks.resolveConflict')}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};

export default PrepaidConflictModal;
