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
    <div className="analysis-summary bg-orange-50 p-4 rounded-lg mb-6 border border-orange-200">
      <div className="flex items-center mb-3">
        <div className="text-orange-600 mr-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-orange-800">
          تعارض في إلغاء المهمة
        </h3>
      </div>
      <div className="space-y-2 text-sm text-gray-700">
        <p className="font-medium">
          ⚠️ هذه المهمة تحتوي على سجلات مالية مرتبطة بها
        </p>
        <p>
          <strong>رقم المهمة:</strong> {analysisData.task_id}
        </p>
        <p>
          <strong>إجمالي المبالغ المالية المعنية:</strong> {analysisData.total_funds_involved.toLocaleString()} ريال
        </p>
        
        {analysisData.prepaid_receivable && (
          <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
            <p className="font-semibold text-blue-800 mb-1">الدفعة المقدمة:</p>
            <p className="text-sm">المبلغ: {analysisData.prepaid_receivable.amount.toLocaleString()} ريال</p>
            <p className="text-sm">المبلغ المدفوع: {analysisData.prepaid_receivable.total_paid.toLocaleString()} ريال</p>
            <p className="text-sm">المبلغ المتبقي: {analysisData.prepaid_receivable.balance.toLocaleString()} ريال</p>
          </div>
        )}
        
        {analysisData.main_receivable && (
          <div className="mt-3 p-3 bg-green-50 rounded border border-green-200">
            <p className="font-semibold text-green-800 mb-1">القيمة الأساسية:</p>
            <p className="text-sm">المبلغ: {analysisData.main_receivable.amount.toLocaleString()} ريال</p>
            <p className="text-sm">المبلغ المدفوع: {analysisData.main_receivable.total_paid.toLocaleString()} ريال</p>
            <p className="text-sm">المبلغ المتبقي: {analysisData.main_receivable.balance.toLocaleString()} ريال</p>
          </div>
        )}
        
        <div className="mt-4 p-3 bg-yellow-50 rounded border border-yellow-200">
          <p className="text-sm text-yellow-800">
            <strong>ملاحظة:</strong> يجب حل هذه التعارضات المالية قبل إلغاء المهمة. 
            يمكنك اختيار كيفية التعامل مع المدفوعات والتخصيصات الموجودة.
          </p>
        </div>
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
          <h4 className="font-semibold mb-3 text-gray-700">كيف تريد التعامل مع المدفوعات؟</h4>
          {receivable.payments.map((payment) => (
            <div key={payment.id} className="payment-item border p-4 rounded-lg mb-3 bg-gray-50">
              <div className="payment-info mb-3">
                <p className="font-medium text-gray-800">
                  دفعة بقيمة {payment.amount.toLocaleString()} ريال
                </p>
                <p className="text-sm text-gray-600">
                  تاريخ الدفع: {new Date(payment.paid_at).toLocaleDateString('ar-SA')}
                </p>
              </div>
              
              <div className="decision-options space-y-2">
                <label className="flex items-center p-2 rounded hover:bg-white cursor-pointer">
                  <input 
                    type="radio" 
                    name={`${paymentNamePrefix}-payment-${payment.id}`}
                    onChange={() => paymentDecisionHandler(payment.id, { payment_id: payment.id, action: 'keep' })}
                    className="mr-3"
                    defaultChecked
                  />
                  <div>
                    <span className="font-medium">الاحتفاظ بالدفعة</span>
                    <p className="text-sm text-gray-600">الدفعة ستظل مرتبطة بالعميل</p>
                  </div>
                </label>
                <label className="flex items-center p-2 rounded hover:bg-white cursor-pointer">
                  <input 
                    type="radio" 
                    name={`${paymentNamePrefix}-payment-${payment.id}`}
                    onChange={() => paymentDecisionHandler(payment.id, { payment_id: payment.id, action: 'delete' })}
                    className="mr-3"
                  />
                  <div>
                    <span className="font-medium text-red-600">حذف الدفعة</span>
                    <p className="text-sm text-gray-600">سيتم حذف سجل الدفعة نهائياً</p>
                  </div>
                </label>
                <label className="flex items-center p-2 rounded hover:bg-white cursor-pointer">
                  <input 
                    type="radio" 
                    name={`${paymentNamePrefix}-payment-${payment.id}`}
                    onChange={() => paymentDecisionHandler(payment.id, { 
                      payment_id: payment.id, 
                      action: 'convert_to_credit'
                    })}
                    className="mr-3"
                  />
                  <div>
                    <span className="font-medium text-green-600">تحويل إلى رصيد</span>
                    <p className="text-sm text-gray-600">سيتم تحويل المبلغ إلى رصيد للعميل</p>
                  </div>
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      {receivable.allocations.length > 0 && (
        <div className="allocations-section mb-4">
          <h4 className="font-semibold mb-3 text-gray-700">كيف تريد التعامل مع التخصيصات؟</h4>
          {receivable.allocations.map((allocation) => (
            <div key={allocation.id} className="allocation-item border p-4 rounded-lg mb-3 bg-gray-50">
              <div className="allocation-info mb-3">
                <p className="font-medium text-gray-800">
                  تخصيص بقيمة {allocation.amount.toLocaleString()} ريال
                </p>
                <p className="text-sm text-gray-600">
                  تاريخ التخصيص: {new Date(allocation.allocated_at).toLocaleDateString('ar-SA')}
                </p>
              </div>
              
              <div className="decision-options space-y-2">
                <label className="flex items-center p-2 rounded hover:bg-white cursor-pointer">
                  <input 
                    type="radio" 
                    name={`${paymentNamePrefix}-allocation-${allocation.id}`}
                    onChange={() => allocationDecisionHandler(allocation.id, { allocation_id: allocation.id, action: 'keep' })}
                    className="mr-3"
                    defaultChecked
                  />
                  <div>
                    <span className="font-medium">الاحتفاظ بالتخصيص</span>
                    <p className="text-sm text-gray-600">التخصيص سيظل مرتبط بالرصيد</p>
                  </div>
                </label>
                <label className="flex items-center p-2 rounded hover:bg-white cursor-pointer">
                  <input 
                    type="radio" 
                    name={`${paymentNamePrefix}-allocation-${allocation.id}`}
                    onChange={() => allocationDecisionHandler(allocation.id, { allocation_id: allocation.id, action: 'return_to_credit' })}
                    className="mr-3"
                  />
                  <div>
                    <span className="font-medium text-blue-600">إرجاع إلى الرصيد</span>
                    <p className="text-sm text-gray-600">سيتم إرجاع المبلغ إلى رصيد العميل</p>
                  </div>
                </label>
                <label className="flex items-center p-2 rounded hover:bg-white cursor-pointer">
                  <input 
                    type="radio" 
                    name={`${paymentNamePrefix}-allocation-${allocation.id}`}
                    onChange={() => allocationDecisionHandler(allocation.id, { allocation_id: allocation.id, action: 'delete_allocation' })}
                    className="mr-3"
                  />
                  <div>
                    <span className="font-medium text-red-600">حذف التخصيص</span>
                    <p className="text-sm text-gray-600">سيتم حذف سجل التخصيص نهائياً</p>
                  </div>
                </label>
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
      title="إلغاء المهمة - حل التعارضات المالية"
      className="large-modal"
    >
      <div className="task-cancellation-modal">
        {renderAnalysisSummary()}
        
        <div className="task-action-decision mb-6">
          <h3 className="text-lg font-semibold mb-3">اختر نوع الإلغاء</h3>
          <div className="space-y-3">
            <label className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <input 
                type="radio" 
                name="task-action"
                value="cancel"
                checked={taskAction === 'cancel'}
                onChange={(e) => setTaskAction(e.target.value as 'cancel' | 'delete')}
                className="mr-3 text-blue-600"
              />
              <div className="flex-1">
                <span className="font-semibold text-gray-800">إلغاء المهمة</span>
                <p className="text-sm text-gray-600 mt-1">
                  المهمة ستظل موجودة في السجلات مع وضع "ملغية" ويمكن استعراضها لاحقاً
                </p>
              </div>
            </label>
            <label className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer border-red-200">
              <input 
                type="radio" 
                name="task-action"
                value="delete"
                checked={taskAction === 'delete'}
                onChange={(e) => setTaskAction(e.target.value as 'cancel' | 'delete')}
                className="mr-3 text-red-600"
              />
              <div className="flex-1">
                <span className="font-semibold text-red-600">حذف المهمة نهائياً</span>
                <p className="text-sm text-gray-600 mt-1">
                  سيتم حذف المهمة من قاعدة البيانات نهائياً (غير مستحسن)
                </p>
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
          <Button variant="secondary" onClick={closeModal} className="px-6">
            إلغاء
          </Button>
          <Button 
            variant={taskAction === 'delete' ? 'danger' : 'primary'}
            onClick={handleCancel}
            disabled={cancelTask.isPending}
            className="px-6"
          >
            {cancelTask.isPending ? 'جاري المعالجة...' : 
             taskAction === 'delete' ? 'حذف المهمة نهائياً' : 'إلغاء المهمة'}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};

export default TaskCancellationModal;
