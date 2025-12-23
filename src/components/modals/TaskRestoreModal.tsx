import React from 'react';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import { useRestoreTask } from '../../queries/taskQueries';
import { useToast } from '../../hooks/useToast';
import { TOAST_MESSAGES } from '../../constants/toastMessages';

interface TaskRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: any; // Replace with Task type
}

const TaskRestoreModal: React.FC<TaskRestoreModalProps> = ({
  isOpen,
  onClose,
  task
}) => {
  const { success, error } = useToast();
  const restoreTask = useRestoreTask();

  const handleRestore = async () => {
    try {
      await restoreTask.mutateAsync({ id: task.id });
      success(TOAST_MESSAGES.TASK_RESTORED);
      onClose();
    } catch (err: any) {
      error(TOAST_MESSAGES.OPERATION_FAILED, err.message);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Restore Task #${task?.id}`}
    >
      <div className="space-y-4">
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-blue-400 text-xl">ℹ️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Restore Confirmation</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>This will restore the task to its previous status (or 'New').</p>
                <p className="mt-1">If there was a related invoice, it will be set to 'pending'.</p>
                <p className="mt-1">Transactions will remain intact.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleRestore}
            isLoading={restoreTask.isPending}
          >
            Confirm Restore
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};

export default TaskRestoreModal;
