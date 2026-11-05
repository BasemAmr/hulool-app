import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useModalStore } from '@/shared/stores/modalStore';
import { useApproveTask, useRejectTask, useGetTask } from '@/features/tasks/api/taskQueries';
import { useToast } from '@/shared/hooks/useToast';
import { useState, useEffect } from 'react';
import type { Task } from '@/api/types';
import { TOAST_MESSAGES } from '@/shared/constants/toastMessages';
import BaseModal from '@/shared/ui/layout/BaseModal';
import Button from '@/shared/ui/primitives/Button';
import Input from '@/shared/ui/primitives/Input';

interface ApprovalModalProps {
  task?: Task;
}

interface ApprovalFormData {
  expense_amount: number;
  notes?: string;
}

// Convert Eastern Arabic numerals (٠-٩) and Persian numerals (۰-۹) to standard English numerals (0-9)
const toEnglishDigits = (str: string): string => {
  return str
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
    .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString());
};

const englishNumberInputStyle: React.CSSProperties = {
  direction: 'ltr',
  textAlign: 'right',
  fontFamily: 'Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif'
};

const ApprovalModal: React.FC<ApprovalModalProps> = (componentProps) => {
  const { t } = useTranslation();
  const closeModal = useModalStore((state) => state.closeModal);
  const storeProps = useModalStore((state) => state.props as any) || {};

  // Support task passed via React component props, storeProps.task, or storeProps directly
  const initialTask: Task | null = componentProps?.task || storeProps?.task || (storeProps?.id ? storeProps : null);

  // Fetch full fresh task data to ensure expense_amount and details are fully populated even if partial props passed
  const { data: fetchedTask } = useGetTask(initialTask?.id || 0);
  const task = fetchedTask || initialTask;
  const { success, error } = useToast();

  const [isRejecting, setIsRejecting] = useState(false);

  const approveTaskMutation = useApproveTask();
  const rejectTaskMutation = useRejectTask();

  const taskAmount = Number(task?.amount) || 0;
  const initialExpenseAmount = task?.expense_amount !== undefined ? Number(task.expense_amount) : 0;

  const { register, handleSubmit, formState: { errors, isDirty }, watch, setValue } = useForm<ApprovalFormData>({
    defaultValues: {
      expense_amount: initialExpenseAmount,
      notes: ''
    }
  });

  // Sync expense amount whenever task data arrives with a defined expense_amount (if not dirty)
  useEffect(() => {
    if (task && task.expense_amount !== undefined && !isDirty) {
      setValue('expense_amount', Number(task.expense_amount) || 0);
    }
  }, [task?.id, task?.expense_amount, setValue, isDirty]);

  const watchExpenseAmount = watch('expense_amount');
  const currentExpenseNum = Number(watchExpenseAmount) || 0;
  const netEarning = taskAmount - currentExpenseNum;

  if (!task || !task.id) {
    return null;
  }

  const onApprove = (data: ApprovalFormData) => {
    const expense = Number(data.expense_amount) || 0;
    if (expense < 0) {
      error(TOAST_MESSAGES.VALIDATION_ERROR, 'لا يمكن أن يكون مبلغ المصروف سلبياً');
      return;
    }

    if (expense > taskAmount) {
      error(TOAST_MESSAGES.VALIDATION_ERROR, 'لا يمكن أن يتجاوز مبلغ المصروف مبلغ المهمة');
      return;
    }

    approveTaskMutation.mutate(
      {
        id: Number(task.id),
        expense_amount: expense,
        notes: data.notes
      },
      {
        onSuccess: () => {
          success(TOAST_MESSAGES.TASK_APPROVED);
          closeModal();
        },
        onError: (err: any) => {
          error(TOAST_MESSAGES.OPERATION_FAILED, err.message);
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
          success(TOAST_MESSAGES.TASK_REJECTED);
          closeModal();
        },
        onError: (err: any) => {
          error(TOAST_MESSAGES.OPERATION_FAILED, err.message);
        }
      }
    );
  };

  return (
    <BaseModal
      isOpen={true}
      onClose={closeModal}
      title="الموافقة على المهمة"
    >
      <div className="space-y-6">
        {/* Task Summary */}
        <div className="bg-bg-surface-muted p-4 rounded-lg">
          <h3 className="font-medium text-text-primary mb-3">تفاصيل المهمة</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-text-muted">اسم المهمة:</span>
              <p className="font-medium">{task.task_name || `المهمة #${task.id}`}</p>
            </div>
            <div>
              <span className="text-text-muted">العميل:</span>
              <p className="font-medium">{task.client ? task.client.name : 'عميل غير معروف'}</p>
            </div>
            <div>
              <span className="text-text-muted">مبلغ المهمة:</span>
              <p className="font-medium" style={englishNumberInputStyle}>{taskAmount.toFixed(2)}</p>
            </div>
            <div>
              <span className="text-text-muted">الحالة:</span>
              <p className="font-medium text-orange-600">
                {task.status === 'Pending Review' ? 'قيد المراجعة' : (t(`status.${task.status}`) || task.status)}
              </p>
            </div>
          </div>
        </div>

        {!isRejecting ? (
          <form onSubmit={handleSubmit(onApprove)} className="space-y-4">
            {/* Flexbox row with 3 fields taking 1/3 of row width each */}
            <div className="flex flex-row gap-4 items-start w-full">
              {/* 1. Task Amount field (مبلغ المهمة) - Read-only with black label */}
              <div className="flex-1 w-1/3 min-w-0">
                <label htmlFor="task_amount" className="mb-1 block text-sm font-semibold text-black dark:text-neutral-200">
                  مبلغ المهمة
                </label>
                <Input
                  id="task_amount"
                  type="text"
                  readOnly
                  value={taskAmount.toFixed(2)}
                  className="bg-bg-surface-muted text-text-primary cursor-not-allowed"
                  style={englishNumberInputStyle}
                />
              </div>

              {/* 2. Expense Amount field (مبلغ المصروف) - Editable with red label */}
              <div className="flex-1 w-1/3 min-w-0">
                <label htmlFor="expense_amount" className="mb-1 block text-sm font-semibold text-red-600 dark:text-red-400">
                  مبلغ المصروف *
                </label>
                <Input
                  id="expense_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  max={taskAmount}
                  error={errors.expense_amount?.message}
                  placeholder="أدخل مصروفات المهمة"
                  style={englishNumberInputStyle}
                  {...register('expense_amount', {
                    required: 'مبلغ المصروف مطلوب',
                    valueAsNumber: true,
                    min: { value: 0, message: 'لا يمكن أن يكون مبلغ المصروف سلبياً' },
                    max: { value: taskAmount, message: 'لا يمكن أن يتجاوز مبلغ المصروف مبلغ المهمة' },
                    onChange: (e) => {
                      const converted = toEnglishDigits(e.target.value);
                      if (converted !== e.target.value) {
                        e.target.value = converted;
                      }
                    }
                  })}
                />
              </div>

              {/* 3. Net Amount field (صافي المبلغ) - Read-only with green label */}
              <div className="flex-1 w-1/3 min-w-0">
                <label htmlFor="net_amount" className="mb-1 block text-sm font-semibold text-green-600 dark:text-green-400">
                  صافي المبلغ
                </label>
                <Input
                  id="net_amount"
                  type="text"
                  readOnly
                  value={netEarning.toFixed(2)}
                  className="bg-bg-surface-muted text-text-primary cursor-not-allowed"
                  style={englishNumberInputStyle}
                />
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="mb-1 block text-sm font-medium text-text-secondary">
                ملاحظات (اختياري)
              </label>
              <textarea
                id="notes"
                rows={3}
                {...register('notes')}
                className="w-full px-3 py-2 border border-border-strong rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="أضف أي ملاحظات إضافية حول موافقة هذه المهمة..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline-danger"
                onClick={() => setIsRejecting(true)}
                disabled={approveTaskMutation.isPending || rejectTaskMutation.isPending}
              >
                رفض
              </Button>
              <Button
                type="button"
                variant="outline-secondary"
                onClick={closeModal}
                disabled={approveTaskMutation.isPending || rejectTaskMutation.isPending}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={approveTaskMutation.isPending}
                disabled={approveTaskMutation.isPending || rejectTaskMutation.isPending}
              >
                الموافقة وإكمال
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-status-danger-bg p-4 rounded-lg border border-status-danger-border">
              <h3 className="font-medium text-status-danger-text mb-2">رفض المهمة</h3>
              <p className="text-status-danger-text text-sm">
                هل أنت متأكد أنك تريد رفض هذه المهمة؟ سيؤدي ذلك إلى إعادة حالة المهمة إلى "جديدة" وسيتعين على الموظف المعَيَّن إعادة تقديمها للمراجعة.
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline-secondary"
                onClick={() => setIsRejecting(false)}
                disabled={rejectTaskMutation.isPending}
              >
                عودة
              </Button>
              <Button
                type="button"
                variant="outline-secondary"
                onClick={closeModal}
                disabled={rejectTaskMutation.isPending}
              >
                إلغاء
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={onReject}
                isLoading={rejectTaskMutation.isPending}
                disabled={rejectTaskMutation.isPending}
              >
                تأكيد الرفض
              </Button>
            </div>
          </div>
        )}
      </div>
    </BaseModal>
  );
};

export default ApprovalModal;
