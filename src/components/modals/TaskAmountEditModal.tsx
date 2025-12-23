import React, { useState, useEffect } from 'react';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import { useValidateTaskEdit, useUpdateTaskAmount, useUpdateTaskPrepaid } from '../../queries/taskQueries';
import { useToast } from '../../hooks/useToast';
import { TOAST_MESSAGES } from '../../constants/toastMessages';
import ValidationPreviewModal from './ValidationPreviewModal';
import type { TaskValidationResult } from '../../api/types';

interface TaskAmountEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: any;
}

const TaskAmountEditModal: React.FC<TaskAmountEditModalProps> = ({
  isOpen,
  onClose,
  task
}) => {
  const { success, error } = useToast();
  const updateAmount = useUpdateTaskAmount();
  const updatePrepaid = useUpdateTaskPrepaid();
  const validateTask = useValidateTaskEdit();

  const [newAmount, setNewAmount] = useState<number>(0);
  const [newPrepaid, setNewPrepaid] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [validationResult, setValidationResult] = useState<TaskValidationResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (task && isOpen) {
      setNewAmount(task.amount || 0);
      setNewPrepaid(task.prepaid_amount || 0);
      setReason('');
      setValidationResult(null);
      setShowPreview(false);
    }
  }, [task, isOpen]);

  const handlePreview = async () => {
    try {
      const result = await validateTask.mutateAsync({
        taskId: task.id,
        proposed: {
          amount: newAmount,
          prepaid_amount: newPrepaid
        }
      });
      setValidationResult(result);
      setShowPreview(true);
    } catch (err: any) {
      error(TOAST_MESSAGES.OPERATION_FAILED, err.message);
    }
  };

  const handleConfirm = async () => {
    try {
      // Determine what changed
      const amountChanged = newAmount !== task.amount;
      const prepaidChanged = newPrepaid !== task.prepaid_amount;

      if (amountChanged) {
        await updateAmount.mutateAsync({
          taskId: task.id,
          amount: newAmount,
          reason: reason || `Amount changed from ${task.amount} to ${newAmount}`
        });
      }

      if (prepaidChanged) {
        await updatePrepaid.mutateAsync({
          taskId: task.id,
          prepaidAmount: newPrepaid,
          reason: reason || `Prepaid amount changed from ${task.prepaid_amount || 0} to ${newPrepaid}`
        });
      }

      success(TOAST_MESSAGES.TASK_UPDATED);
      onClose();
    } catch (err: any) {
      error(TOAST_MESSAGES.OPERATION_FAILED, err.message);
    }
  };

  if (showPreview && validationResult) {
    return (
      <ValidationPreviewModal
        isOpen={isOpen}
        onClose={() => setShowPreview(false)}
        onConfirm={handleConfirm}
        validationResult={validationResult}
        entityType="task"
        entityName={`#${task.id}`}
        actionType="edit"
        isPending={updateAmount.isPending || updatePrepaid.isPending}
      />
    );
  }

  const finalAmount = newAmount - newPrepaid;
  const netEarning = newAmount - (task?.expense_amount || 0);

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`تعديل مبالغ المهمة #${task?.id}`}
    >
      <div className="space-y-4 dir-rtl" dir="rtl">
        {/* Total Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            المبلغ الإجمالي
          </label>
          <input
            type="number"
            value={newAmount}
            onChange={(e) => setNewAmount(parseFloat(e.target.value) || 0)}
            className="mt-1 block w-full border rounded-md shadow-sm p-2"
            step="0.01"
            min="0"
          />
          <p className="text-xs text-gray-500 mt-1">
            الحالي: {task?.amount} ر.س
          </p>
        </div>

        {/* Prepaid Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            المبلغ المدفوع مسبقاً
          </label>
          <input
            type="number"
            value={newPrepaid}
            onChange={(e) => setNewPrepaid(parseFloat(e.target.value) || 0)}
            className="mt-1 block w-full border rounded-md shadow-sm p-2"
            step="0.01"
            min="0"
            max={newAmount}
          />
          <p className="text-xs text-gray-500 mt-1">
            الحالي: {task?.prepaid_amount || 0} ر.س
          </p>
        </div>

        {/* Calculated Summary */}
        <div className="bg-blue-50 p-3 rounded-md text-sm space-y-1">
          <div className="flex justify-between">
            <span>المبلغ الإجمالي:</span>
            <span className="font-medium">{newAmount} ر.س</span>
          </div>
          <div className="flex justify-between">
            <span>مدفوع مقدم:</span>
            <span className="font-medium">-{newPrepaid} ر.س</span>
          </div>
          <div className="flex justify-between border-t border-blue-200 pt-1">
            <span className="font-medium">الفاتورة النهائية:</span>
            <span className="font-bold">{finalAmount} ر.س</span>
          </div>
          {task?.expense_amount > 0 && (
            <>
              <div className="flex justify-between text-gray-600 mt-2">
                <span>المصفوفات:</span>
                <span>-{task.expense_amount} ر.س</span>
              </div>
              <div className="flex justify-between border-t border-blue-200 pt-1">
                <span className="font-medium">صافي الربح:</span>
                <span className="font-bold">{netEarning} ر.س</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>العمولة (20%):</span>
                <span>{(netEarning * 0.2).toFixed(2)} ر.س</span>
              </div>
            </>
          )}
        </div>

        {/* Validation */}
        {newPrepaid > newAmount && (
          <div className="bg-red-50 border border-red-200 p-3 rounded-md text-sm text-red-700">
            ⚠️ المبلغ المقدم لا يمكن أن يتجاوز المبلغ الإجمالي
          </div>
        )}

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            سبب التعديل (اختياري)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 block w-full border rounded-md shadow-sm p-2"
            rows={2}
            placeholder="مثال: طلب العميل تعديل، تصحيح خطأ في التسعير"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            onClick={handlePreview}
            isLoading={validateTask.isPending}
            disabled={newPrepaid > newAmount || (newAmount === task?.amount && newPrepaid === task?.prepaid_amount)}
          >
            معاينة التأثيرات
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};

export default TaskAmountEditModal;
