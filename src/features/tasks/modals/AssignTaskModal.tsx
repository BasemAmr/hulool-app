import  { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import type { Task } from '@/api/types';
import { useGetEmployeesForSelection, useAssignTask } from '@/features/employees/api/employeeQueries';
import { useModalStore } from '@/shared/stores/modalStore';
import { useToast } from '@/shared/hooks/useToast';
import { TOAST_MESSAGES } from '@/shared/constants/toastMessages';

import BaseModal from '@/shared/ui/layout/BaseModal';
import Button from '@/shared/ui/primitives/Button';
import { UserPlus, X } from 'lucide-react';

interface AssignTaskModalProps {
  task: Task;
}

interface AssignTaskForm {
  assigned_to_id: number | null;
}

const AssignTaskModal = () => {
  const { t } = useTranslation();
  const { success, error } = useToast();
  
  const closeModal = useModalStore((state) => state.closeModal);
  const props = useModalStore((state) => state.props as AssignTaskModalProps);
  const { task } = props;

  const { data: employees = [], isLoading: isLoadingEmployees } = useGetEmployeesForSelection();
  const assignTaskMutation = useAssignTask();

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
    reset
  } = useForm<AssignTaskForm>({
    defaultValues: {
      assigned_to_id: task?.assigned_to_id || null,
    },
  });

  // Update form when task changes
  useEffect(() => {
    if (task) {
      reset({
        assigned_to_id: task.assigned_to_id || null,
      });
    }
  }, [task, reset]);

  // Get current employee name
  const getCurrentAssignedEmployeeName = () => {
    if (!task?.assigned_to_id) return 'غير مكلف';
    const employee = employees.find(emp => emp.user_id === task.assigned_to_id);
    return employee ? employee.display_name : 'Unknown Employee';
  };

  const onSubmit = (data: AssignTaskForm) => {
    if (!task) return;

    // Prepare payload
    assignTaskMutation.mutate(
      {
        taskId: task.id,
        assignedToId: data.assigned_to_id,
      },
      {
        onSuccess: () => {
          success(TOAST_MESSAGES.TASK_ASSIGNED);
          closeModal();
        },
        onError: (err: any) => {
          error(TOAST_MESSAGES.OPERATION_FAILED, err.message);
        },
      }
    );
  };

  if (!task) {
    return null;
  }

  return (
    <BaseModal
      isOpen={true}
      onClose={closeModal}
      title="تكليف المهمة"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Task Information */}
        <div className="p-4 rounded-lg bg-muted border border-border space-y-3">
          <h6 className="font-semibold text-text-primary">معلومات المهمة</h6>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <span className="text-muted-foreground text-xs block">العميل:</span>
              <div className="font-medium text-text-primary">{task.client?.name || 'لا يوجد عميل'}</div>
            </div>
            <div className="space-y-2">
              <span className="text-muted-foreground text-xs block">نوع المهمة:</span>
              <div className="font-medium text-text-primary">{t(`type.${task.type}`)}</div>
            </div>
            <div className="space-y-2">
              <span className="text-muted-foreground text-xs block">الخدمة المقدمة:</span>
              <div className="font-medium text-text-primary">{task.task_name || t(`type.${task.type}`)}</div>
            </div>
            <div className="space-y-2">
              <span className="text-muted-foreground text-xs block">المكلف الحالي:</span>
              <div className="font-medium text-primary">{getCurrentAssignedEmployeeName()}</div>
            </div>
          </div>
        </div>

        {/* Assignment Selection */}
        <div className="space-y-2">
          <label className="font-semibold text-text-primary text-sm flex items-center gap-2">
            <UserPlus size={16} />
            تكليف الموظف
          </label>
          <Controller
            name="assigned_to_id"
            control={control}
            render={({ field }) => (
              <select
                {...field}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted text-text-primary"
                value={field.value || ''}
                onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                disabled={isLoadingEmployees || isSubmitting}
              >
                <option value="">غير مكلف</option>
                {employees.map((employee) => (
                  <option key={employee.user_id} value={employee.user_id}>
                    {employee.display_name}
                  </option>
                ))}
              </select>
            )}
          />
          {isLoadingEmployees && (
            <small className="text-muted-foreground text-xs">جاري تحميل قائمة الموظفين...</small>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button
            type="button"
            variant="secondary"
            onClick={closeModal}
            disabled={isSubmitting}
          >
            <X size={16} className="mr-1" />
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || isLoadingEmployees}
            isLoading={isSubmitting}
          >
            <UserPlus size={16} className="mr-1" />
            {isSubmitting ? 'جاري الحفظ...' : 'حفظ التكليف'}
          </Button>
        </div>
      </form>
    </BaseModal>
  );
};

export default AssignTaskModal;
