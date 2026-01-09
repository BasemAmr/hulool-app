import React, { useState, useEffect } from 'react';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import { NumberInput } from '../ui/NumberInput';
import { useValidateTaskEdit } from '../../queries/taskQueries';
import { useCascadeTaskPrepaid } from '../../queries/transactionQueries';
import { useToast } from '../../hooks/useToast';
import ValidationPreviewModal from './ValidationPreviewModal';
import type { TaskValidationResult } from '../../api/types';

interface TaskPrepaidEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: any; // Replace with Task type
}

const TaskPrepaidEditModal: React.FC<TaskPrepaidEditModalProps> = ({
  isOpen,
  onClose,
  task
}) => {
  const { success, error } = useToast();
  const cascadePrepaid = useCascadeTaskPrepaid();
  const validateTask = useValidateTaskEdit();

  const [newPrepaid, setNewPrepaid] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [validationResult, setValidationResult] = useState<TaskValidationResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (task && isOpen) {
      setNewPrepaid(task.prepaid_amount || 0);
      setReason('');
      setValidationResult(null);
      setShowPreview(false);
    }
  }, [task, isOpen]);

  const handlePreview = async () => {
    if (newPrepaid > task.amount) {
      error('Prepaid amount cannot exceed task amount');
      return;
    }
    try {
      const result = await validateTask.mutateAsync({
        taskId: task.id,
        proposed: { prepaid_amount: newPrepaid }
      });
      setValidationResult(result);
      setShowPreview(true);
    } catch (err: any) {
      error(err.message || 'Validation failed');
    }
  };

  const handleConfirm = async () => {
    try {
      await cascadePrepaid.mutateAsync({
        id: task.id,
        payload: { new_prepaid: newPrepaid, reason }
      });
      success('Task prepaid amount updated and synced successfully');
      onClose();
    } catch (err: any) {
      error(err.message || 'Update failed');
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
        isPending={cascadePrepaid.isPending}
      />
    );
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Task Prepaid Amount #${task?.id}`}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Task Amount</label>
          <div className="mt-1 p-2 bg-gray-100 rounded-md">{task?.amount}</div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Current Prepaid</label>
          <div className="mt-1 p-2 bg-gray-100 rounded-md">{task?.prepaid_amount || 0}</div>
        </div>

        <div>
          <NumberInput
            label="New Prepaid Amount"
            name="new_prepaid"
            value={newPrepaid}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPrepaid(parseFloat(e.target.value) || 0)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Reason for Change (Optional)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 block w-full border rounded-md shadow-sm p-2"
            rows={2}
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handlePreview}
            isLoading={validateTask.isPending}
          >
            Preview Sync
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};

export default TaskPrepaidEditModal;
