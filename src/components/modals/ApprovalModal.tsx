import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useModalStore } from '../../stores/modalStore';
import { useApproveTask, useRejectTask } from '../../queries/taskQueries';
import { useToast } from '../../hooks/useToast';
import { useState } from 'react';
import type { Task } from '../../api/types';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface ApprovalModalProps {
  task: Task;
}

interface ApprovalFormData {
  expense_amount: number;
  notes?: string;
}

const ApprovalModal = () => {
  const { t } = useTranslation();
  const closeModal = useModalStore((state) => state.closeModal);
  const props = useModalStore((state) => state.props as ApprovalModalProps);
  const { task } = props;
  const { success, error } = useToast();
  
  const [isRejecting, setIsRejecting] = useState(false);

  const approveTaskMutation = useApproveTask();
  const rejectTaskMutation = useRejectTask();

  const { register, handleSubmit, formState: { errors }, watch } = useForm<ApprovalFormData>({
    defaultValues: {
      expense_amount: 0,
      notes: ''
    }
  });

  const watchExpenseAmount = watch('expense_amount');
  const netEarning = task.amount - (Number(watchExpenseAmount) || 0);

  const onApprove = (data: ApprovalFormData) => {
    if (data.expense_amount < 0) {
      error(t('common.error'), 'Expense amount cannot be negative');
      return;
    }

    if (data.expense_amount > task.amount) {
      error(t('common.error'), 'Expense amount cannot exceed task amount');
      return;
    }

    approveTaskMutation.mutate(
      {
        id: Number(task.id),
        expense_amount: Number(data.expense_amount),
        notes: data.notes
      },
      {
        onSuccess: () => {
          success(
            t('tasks.approvalSuccess'),
            `Task "${task.task_name || `Task #${task.id}`}" has been approved and completed with net earning of ${netEarning.toFixed(2)}`
          );
          closeModal();
        },
        onError: (err: any) => {
          error(t('common.error'), err.message || 'Failed to approve task');
        }
      }
    );
  };

  const onReject = () => {
    rejectTaskMutation.mutate(
      {
        id: Number(task.id),
        rejection_reason: 'Task rejected by admin'
      },
      {
        onSuccess: () => {
          success(
            'Task Rejected',
            `Task "${task.task_name || `Task #${task.id}`}" has been rejected and reverted to New status`
          );
          closeModal();
        },
        onError: (err: any) => {
          error(t('common.error'), err.message || 'Failed to reject task');
        }
      }
    );
  };

  return (
    <BaseModal
      isOpen={true}
      onClose={closeModal}
      title="Task Approval"
    >
      <div className="space-y-6">
        {/* Task Summary */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-3">Task Details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Task Name:</span>
              <p className="font-medium">{task.task_name || `Task #${task.id}`}</p>
            </div>
            <div>
              <span className="text-gray-500">Client:</span>
              <p className="font-medium">{task.client ? task.client.name : 'Unknown Client'}</p>
            </div>
            <div>
              <span className="text-gray-500">Task Amount:</span>
              <p className="font-medium">{task.amount.toFixed(2)}</p>
            </div>
            <div>
              <span className="text-gray-500">Status:</span>
              <p className="font-medium text-orange-600">{task.status}</p>
            </div>
          </div>
        </div>

        {!isRejecting ? (
          <form onSubmit={handleSubmit(onApprove)} className="space-y-4">
            <div>
              <label htmlFor="expense_amount" className="block text-sm font-medium text-gray-700 mb-1">
                Expense Amount *
              </label>
              <Input
                id="expense_amount"
                type="number"
                step="0.01"
                min="0"
                max={task.amount}
                {...register('expense_amount', {
                  required: 'Expense amount is required',
                  valueAsNumber: true,
                  min: { value: 0, message: 'Expense amount cannot be negative' },
                  max: { value: task.amount, message: 'Expense amount cannot exceed task amount' }
                })}
                error={errors.expense_amount?.message}
                placeholder="Enter task expenses"
              />
            </div>

            {/* Calculated Net Earning */}
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Net Earning:</span>
                <span className={`font-semibold ${netEarning >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {netEarning.toFixed(2)}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Task Amount ({task.amount.toFixed(2)}) - Expense Amount ({(Number(watchExpenseAmount) || 0).toFixed(2)})
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                id="notes"
                rows={3}
                {...register('notes')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Add any additional notes about this task approval..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline-danger"
                onClick={() => setIsRejecting(true)}
                disabled={approveTaskMutation.isPending || rejectTaskMutation.isPending}
              >
                Reject
              </Button>
              <Button
                type="button"
                variant="outline-secondary"
                onClick={closeModal}
                disabled={approveTaskMutation.isPending || rejectTaskMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={approveTaskMutation.isPending}
                disabled={approveTaskMutation.isPending || rejectTaskMutation.isPending}
              >
                Approve & Complete
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <h3 className="font-medium text-red-800 mb-2">Reject Task</h3>
              <p className="text-red-700 text-sm">
                Are you sure you want to reject this task? This will revert the task status back to "New" 
                and the assigned employee will need to resubmit it for review.
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline-secondary"
                onClick={() => setIsRejecting(false)}
                disabled={rejectTaskMutation.isPending}
              >
                Back
              </Button>
              <Button
                type="button"
                variant="outline-secondary"
                onClick={closeModal}
                disabled={rejectTaskMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={onReject}
                isLoading={rejectTaskMutation.isPending}
                disabled={rejectTaskMutation.isPending}
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        )}
      </div>
    </BaseModal>
  );
};

export default ApprovalModal;
