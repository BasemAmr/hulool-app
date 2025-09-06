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
    <div className="conflict-summary bg-red-50 p-4 rounded-lg mb-6">
      <h3 className="text-lg font-semibold text-red-800 mb-3">
        {t('tasks.prepaidConflictDetected')}
      </h3>
      <div className="space-y-2 text-sm">
        <p><strong>{t('tasks.currentPrepaidAmount')}:</strong> {conflictData.current_prepaid_amount.toLocaleString()} SAR</p>
        <p><strong>{t('tasks.newPrepaidAmount')}:</strong> {conflictData.new_prepaid_amount.toLocaleString()} SAR</p>
        <p><strong>{t('tasks.totalPaidOnPrepaid')}:</strong> {conflictData.total_paid.toLocaleString()} SAR</p>
        <p><strong>{t('tasks.taskAmount')}:</strong> {conflictData.task_amount.toLocaleString()} SAR</p>
      </div>
      
      <div className="mt-4">
        <h4 className="font-semibold text-red-700 mb-2">{t('tasks.identifiedConflicts')}:</h4>
        <ul className="space-y-1">
          {conflictData.conflicts.map((conflict, index) => (
            <li key={index} className={`text-sm p-2 rounded ${
              conflict.severity === 'high' ? 'bg-red-100 text-red-800' :
              conflict.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              <span className="font-semibold">{conflict.type.replace(/_/g, ' ').toUpperCase()}:</span> {conflict.message}
              {conflict.surplus && <span className="block mt-1">Surplus: {conflict.surplus.toLocaleString()} SAR</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  const renderPaymentDecisions = () => (
    <div className="payment-decisions mb-6">
      <h3 className="text-lg font-semibold mb-3">{t('tasks.paymentDecisions')}</h3>
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
                  name={`payment-${payment.id}`}
                  onChange={() => handlePaymentDecision(payment, { payment_id: payment.id, action: 'keep' })}
                  className="mr-2"
                />
                {t('tasks.keepPayment')}
              </label>
              <label className="flex items-center">
                <input 
                  type="radio" 
                  name={`payment-${payment.id}`}
                  onChange={() => handlePaymentDecision(payment, { payment_id: payment.id, action: 'delete' })}
                  className="mr-2"
                />
                {t('tasks.deletePayment')}
              </label>
              <label className="flex items-center">
                <input 
                  type="radio" 
                  name={`payment-${payment.id}`}
                  onChange={() => handlePaymentDecision(payment, { 
                    payment_id: payment.id, 
                    action: 'convert_to_credit',
                    surplus_action: 'convert_to_credit'
                  })}
                  className="mr-2"
                />
                {t('tasks.convertToCredit')}
              </label>
              <div className="flex items-center">
                <input 
                  type="radio" 
                  name={`payment-${payment.id}`}
                  onChange={() => handlePaymentDecision(payment, { 
                    payment_id: payment.id, 
                    action: 'reduce_to',
                    new_amount: newPrepaidAmount
                  })}
                  className="mr-2"
                />
                <label className="mr-2">{t('tasks.reduceTo')}:</label>
                <input 
                  type="number" 
                  className="border rounded px-2 py-1 w-24"
                  defaultValue={newPrepaidAmount}
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
      <h3 className="text-lg font-semibold mb-3">{t('tasks.allocationDecisions')}</h3>
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
                  name={`allocation-${allocation.id}`}
                  onChange={() => handleAllocationDecision(allocation, { allocation_id: allocation.id, action: 'keep' })}
                  className="mr-2"
                />
                {t('tasks.keepAllocation')}
              </label>
              <label className="flex items-center">
                <input 
                  type="radio" 
                  name={`allocation-${allocation.id}`}
                  onChange={() => handleAllocationDecision(allocation, { allocation_id: allocation.id, action: 'return_to_credit' })}
                  className="mr-2"
                />
                {t('tasks.returnToCredit')}
              </label>
              <label className="flex items-center">
                <input 
                  type="radio" 
                  name={`allocation-${allocation.id}`}
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
      title={t('tasks.resolvePrepaidConflict')}
      className="large-modal"
    >
      <div className="prepaid-conflict-modal">
        {renderConflictSummary()}
        
        <div className="receivable-decision mb-6">
          <h3 className="text-lg font-semibold mb-3">{t('tasks.prepaidReceivableDecision')}</h3>
          <select 
            value={receivableDecision}
            onChange={(e) => setReceivableDecision(e.target.value)}
            className="border rounded px-3 py-2 w-full"
          >
            <option value="eliminate_prepaid">{t('tasks.eliminatePrepaidReceivable')}</option>
            <option value="adjust_to_new_amount">{t('tasks.adjustToNewAmount')}</option>
          </select>
        </div>

        {conflictData.financial_records.payments.length > 0 && renderPaymentDecisions()}
        {conflictData.financial_records.allocations.length > 0 && renderAllocationDecisions()}

        <div className="modal-actions flex justify-end gap-3 pt-4 border-t">
          <Button variant="secondary" onClick={closeModal}>
            {t('common.cancel')}
          </Button>
          <Button 
            variant="primary" 
            onClick={handleResolve}
            disabled={resolvePrepaidChange.isPending}
          >
            {resolvePrepaidChange.isPending ? t('common.processing') : t('tasks.resolveConflict')}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};

export default PrepaidConflictModal;
