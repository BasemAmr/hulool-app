import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import { useModalStore } from '../../stores/modalStore';
import { useCancelTask } from '../../queries/taskQueries';
import { useToast } from '../../hooks/useToast';
import type { 
  TaskCancellationAnalysis,
  TaskCancellationDecisions,
  PrepaidPaymentDecision,
  PrepaidAllocationDecision,
  MainReceivablePaymentDecision,
  MainReceivableAllocationDecision,
  ReceivableFinancialState
} from '../../api/types';

interface TaskCancellationModalProps {
  taskId: number;
  analysisData: TaskCancellationAnalysis;
  onResolved: () => void;
}

const TaskCancellationModal: React.FC<TaskCancellationModalProps> = ({
  taskId,
  analysisData,
  onResolved
}) => {
  const { t } = useTranslation();
  const { closeModal } = useModalStore();
  const { showToast } = useToast();
  const cancelTask = useCancelTask();

  const [taskAction, setTaskAction] = useState<'cancel' | 'delete'>('cancel');
  const [prepaidPaymentDecisions, setPrepaidPaymentDecisions] = useState<PrepaidPaymentDecision[]>([]);
  const [prepaidAllocationDecisions, setPrepaidAllocationDecisions] = useState<PrepaidAllocationDecision[]>([]);
  const [mainPaymentDecisions, setMainPaymentDecisions] = useState<MainReceivablePaymentDecision[]>([]);
  const [mainAllocationDecisions, setMainAllocationDecisions] = useState<MainReceivableAllocationDecision[]>([]);

  const handlePrepaidPaymentDecision = (paymentId: number, decision: PrepaidPaymentDecision) => {
    setPrepaidPaymentDecisions(prev => {
      const existing = prev.find(d => d.payment_id === paymentId);
      if (existing) {
        return prev.map(d => d.payment_id === paymentId ? decision : d);
      }
      return [...prev, decision];
    });
  };

  const handlePrepaidAllocationDecision = (allocationId: number, decision: PrepaidAllocationDecision) => {
    setPrepaidAllocationDecisions(prev => {
      const existing = prev.find(d => d.allocation_id === allocationId);
      if (existing) {
        return prev.map(d => d.allocation_id === allocationId ? decision : d);
      }
      return [...prev, decision];
    });
  };

  const handleMainPaymentDecision = (paymentId: number, decision: MainReceivablePaymentDecision) => {
    setMainPaymentDecisions(prev => {
      const existing = prev.find(d => d.payment_id === paymentId);
      if (existing) {
        return prev.map(d => d.payment_id === paymentId ? decision : d);
      }
      return [...prev, decision];
    });
  };

  const handleMainAllocationDecision = (allocationId: number, decision: MainReceivableAllocationDecision) => {
    setMainAllocationDecisions(prev => {
      const existing = prev.find(d => d.allocation_id === allocationId);
      if (existing) {
        return prev.map(d => d.allocation_id === allocationId ? decision : d);
      }
      return [...prev, decision];
    });
  };

  const handleCancel = async () => {
    try {
      const decisions: TaskCancellationDecisions = {
        task_action: taskAction
      };

      // Only include decisions if there are financial records to handle
      if (analysisData.prepaid_receivable && 
          (analysisData.prepaid_receivable.payments.length > 0 || analysisData.prepaid_receivable.allocations.length > 0)) {
        decisions.prepaid_receivable_decisions = {
          payment_decisions: prepaidPaymentDecisions,
          allocation_decisions: prepaidAllocationDecisions
        };
      }

      if (analysisData.main_receivable && 
          (analysisData.main_receivable.payments.length > 0 || analysisData.main_receivable.allocations.length > 0)) {
        decisions.main_receivable_decisions = {
          payment_decisions: mainPaymentDecisions,
          allocation_decisions: mainAllocationDecisions
        };
      }

      await cancelTask.mutateAsync({
        id: taskId,
        decisions
      });

      showToast({
        type: 'success',
        title: taskAction === 'delete' ? t('tasks.taskDeleted') : t('tasks.taskCancelled')
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

  const renderAnalysisSummary = () => (
    <div className="analysis-summary bg-yellow-50 p-4 rounded-lg mb-6">
      <h3 className="text-lg font-semibold text-yellow-800 mb-3">
        {t('tasks.cancellationAnalysis')}
      </h3>
      <div className="space-y-2 text-sm">
        <p><strong>{t('tasks.taskId')}:</strong> {analysisData.task_id}</p>
        <p><strong>{t('tasks.totalFundsInvolved')}:</strong> {analysisData.total_funds_involved.toLocaleString()} SAR</p>
        
        {analysisData.prepaid_receivable && (
          <div className="mt-3 p-3 bg-blue-50 rounded">
            <p className="font-semibold text-blue-800">{t('tasks.prepaidReceivable')}:</p>
            <p>{t('tasks.amount')}: {analysisData.prepaid_receivable.amount.toLocaleString()} SAR</p>
            <p>{t('tasks.totalPaid')}: {analysisData.prepaid_receivable.total_paid.toLocaleString()} SAR</p>
            <p>{t('tasks.balance')}: {analysisData.prepaid_receivable.balance.toLocaleString()} SAR</p>
          </div>
        )}
        
        {analysisData.main_receivable && (
          <div className="mt-3 p-3 bg-green-50 rounded">
            <p className="font-semibold text-green-800">{t('tasks.mainReceivable')}:</p>
            <p>{t('tasks.amount')}: {analysisData.main_receivable.amount.toLocaleString()} SAR</p>
            <p>{t('tasks.totalPaid')}: {analysisData.main_receivable.total_paid.toLocaleString()} SAR</p>
            <p>{t('tasks.balance')}: {analysisData.main_receivable.balance.toLocaleString()} SAR</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderReceivableDecisions = (
    receivable: ReceivableFinancialState,
    title: string,
    paymentDecisionHandler: (paymentId: number, decision: any) => void,
    allocationDecisionHandler: (allocationId: number, decision: any) => void,
    paymentNamePrefix: string
  ) => (
    <div className="receivable-decisions mb-6">
      <h3 className="text-lg font-semibold mb-3">{title}</h3>
      
      {receivable.payments.length > 0 && (
        <div className="payments-section mb-4">
          <h4 className="font-semibold mb-2">{t('tasks.paymentDecisions')}</h4>
          {receivable.payments.map((payment) => (
            <div key={payment.id} className="payment-item border p-3 rounded mb-2">
              <div className="payment-info mb-2 text-sm">
                <p><strong>{t('payments.amount')}:</strong> {payment.amount.toLocaleString()} SAR</p>
                <p><strong>{t('payments.paidAt')}:</strong> {new Date(payment.paid_at).toLocaleDateString()}</p>
              </div>
              
              <div className="decision-options">
                <div className="space-y-1">
                  <label className="flex items-center text-sm">
                    <input 
                      type="radio" 
                      name={`${paymentNamePrefix}-payment-${payment.id}`}
                      onChange={() => paymentDecisionHandler(payment.id, { payment_id: payment.id, action: 'keep' })}
                      className="mr-2"
                    />
                    {t('tasks.keepPayment')}
                  </label>
                  <label className="flex items-center text-sm">
                    <input 
                      type="radio" 
                      name={`${paymentNamePrefix}-payment-${payment.id}`}
                      onChange={() => paymentDecisionHandler(payment.id, { payment_id: payment.id, action: 'delete' })}
                      className="mr-2"
                    />
                    {t('tasks.deletePayment')}
                  </label>
                  <label className="flex items-center text-sm">
                    <input 
                      type="radio" 
                      name={`${paymentNamePrefix}-payment-${payment.id}`}
                      onChange={() => paymentDecisionHandler(payment.id, { 
                        payment_id: payment.id, 
                        action: 'convert_to_credit'
                      })}
                      className="mr-2"
                    />
                    {t('tasks.convertToCredit')}
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {receivable.allocations.length > 0 && (
        <div className="allocations-section mb-4">
          <h4 className="font-semibold mb-2">{t('tasks.allocationDecisions')}</h4>
          {receivable.allocations.map((allocation) => (
            <div key={allocation.id} className="allocation-item border p-3 rounded mb-2">
              <div className="allocation-info mb-2 text-sm">
                <p><strong>{t('allocations.amount')}:</strong> {allocation.amount.toLocaleString()} SAR</p>
                <p><strong>{t('allocations.allocatedAt')}:</strong> {new Date(allocation.allocated_at).toLocaleDateString()}</p>
              </div>
              
              <div className="decision-options">
                <div className="space-y-1">
                  <label className="flex items-center text-sm">
                    <input 
                      type="radio" 
                      name={`${paymentNamePrefix}-allocation-${allocation.id}`}
                      onChange={() => allocationDecisionHandler(allocation.id, { allocation_id: allocation.id, action: 'keep' })}
                      className="mr-2"
                    />
                    {t('tasks.keepAllocation')}
                  </label>
                  <label className="flex items-center text-sm">
                    <input 
                      type="radio" 
                      name={`${paymentNamePrefix}-allocation-${allocation.id}`}
                      onChange={() => allocationDecisionHandler(allocation.id, { allocation_id: allocation.id, action: 'return_to_credit' })}
                      className="mr-2"
                    />
                    {t('tasks.returnToCredit')}
                  </label>
                  <label className="flex items-center text-sm">
                    <input 
                      type="radio" 
                      name={`${paymentNamePrefix}-allocation-${allocation.id}`}
                      onChange={() => allocationDecisionHandler(allocation.id, { allocation_id: allocation.id, action: 'delete_allocation' })}
                      className="mr-2"
                    />
                    {t('tasks.deleteAllocation')}
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <BaseModal
      isOpen={true}
      onClose={closeModal}
      title={t('tasks.cancelTask')}
      className="large-modal"
    >
      <div className="task-cancellation-modal">
        {renderAnalysisSummary()}
        
        <div className="task-action-decision mb-6">
          <h3 className="text-lg font-semibold mb-3">{t('tasks.chooseTaskAction')}</h3>
          <div className="space-y-2">
            <label className="flex items-center">
              <input 
                type="radio" 
                name="task-action"
                value="cancel"
                checked={taskAction === 'cancel'}
                onChange={(e) => setTaskAction(e.target.value as 'cancel' | 'delete')}
                className="mr-2"
              />
              <div>
                <span className="font-semibold">{t('tasks.cancelTask')}</span>
                <p className="text-sm text-gray-600">{t('tasks.cancelTaskDescription')}</p>
              </div>
            </label>
            <label className="flex items-center">
              <input 
                type="radio" 
                name="task-action"
                value="delete"
                checked={taskAction === 'delete'}
                onChange={(e) => setTaskAction(e.target.value as 'cancel' | 'delete')}
                className="mr-2"
              />
              <div>
                <span className="font-semibold text-red-600">{t('tasks.deleteTask')}</span>
                <p className="text-sm text-gray-600">{t('tasks.deleteTaskDescription')}</p>
              </div>
            </label>
          </div>
        </div>

        {analysisData.prepaid_receivable && 
          renderReceivableDecisions(
            analysisData.prepaid_receivable, 
            t('tasks.prepaidReceivableDecisions'),
            handlePrepaidPaymentDecision,
            handlePrepaidAllocationDecision,
            'prepaid'
          )
        }

        {analysisData.main_receivable && 
          renderReceivableDecisions(
            analysisData.main_receivable, 
            t('tasks.mainReceivableDecisions'),
            handleMainPaymentDecision,
            handleMainAllocationDecision,
            'main'
          )
        }

        <div className="modal-actions flex justify-end gap-3 pt-4 border-t">
          <Button variant="secondary" onClick={closeModal}>
            {t('common.cancel')}
          </Button>
          <Button 
            variant={taskAction === 'delete' ? 'danger' : 'primary'}
            onClick={handleCancel}
            disabled={cancelTask.isPending}
          >
            {cancelTask.isPending ? t('common.processing') : 
             taskAction === 'delete' ? t('tasks.deleteTask') : t('tasks.cancelTask')}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};

export default TaskCancellationModal;
