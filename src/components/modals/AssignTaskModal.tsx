import  { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import type { Task } from '../../api/types';
import { useGetEmployeesForSelection, useAssignTask } from '../../queries/employeeQueries';
import { useModalStore } from '../../stores/modalStore';
import { useToast } from '../../hooks/useToast';

import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
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
    const payload: any = {
      assigned_to_id: data.assigned_to_id,
    };

    // If admin is changing the assignee, set created_by to the same value
    if (data.assigned_to_id !== task.assigned_to_id) {
      payload.created_by = data.assigned_to_id;
    }

    assignTaskMutation.mutate(
      {
        taskId: task.id,
        assignedToId: data.assigned_to_id,
        created_by: payload.created_by,
      },
      {
        onSuccess: () => {
          const employeeName = data.assigned_to_id 
            ? employees.find(emp => emp.user_id === data.assigned_to_id)?.display_name || 'Unknown'
            : 'غير مكلف';
          
          success(
            'تم تحديث التكليف',
            data.assigned_to_id 
              ? `تم تكليف ${employeeName} بالمهمة`
              : 'تم إلغاء تكليف المهمة'
          );
          closeModal();
        },
        onError: (err: any) => {
          error('خطأ في التكليف', err.message || 'حدث خطأ أثناء تحديث تكليف المهمة');
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
        <div className="mb-4 p-3 bg-light rounded">
          <h6 className="fw-bold mb-2">معلومات المهمة</h6>
          <div className="row">
            <div className="col-md-6">
              <div className="mb-2">
                <span className="text-muted small">العميل:</span>
                <div className="fw-medium">{task.client?.name || 'لا يوجد عميل'}</div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-2">
                <span className="text-muted small">نوع المهمة:</span>
                <div className="fw-medium">{t(`type.${task.type}`)}</div>
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-md-6">
              <div className="mb-2">
                <span className="text-muted small">الخدمة المقدمة:</span>
                <div className="fw-medium">{task.task_name || t(`type.${task.type}`)}</div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-2">
                <span className="text-muted small">المكلف الحالي:</span>
                <div className="fw-medium text-primary">{getCurrentAssignedEmployeeName()}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Assignment Selection */}
        <div className="form-group">
          <label className="form-label fw-medium mb-2">
            <UserPlus size={16} className="me-2" />
            تكليف الموظف
          </label>
          <Controller
            name="assigned_to_id"
            control={control}
            render={({ field }) => (
              <select
                {...field}
                className="form-select"
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
            <small className="text-muted">جاري تحميل قائمة الموظفين...</small>
          )}
        </div>

        {/* Action Buttons */}
        <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
          <Button
            type="button"
            variant="secondary"
            onClick={closeModal}
            disabled={isSubmitting}
          >
            <X size={16} className="me-1" />
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || isLoadingEmployees}
            isLoading={isSubmitting}
          >
            <UserPlus size={16} className="me-1" />
            {isSubmitting ? 'جاري الحفظ...' : 'حفظ التكليف'}
          </Button>
        </div>
      </form>
    </BaseModal>
  );
};

export default AssignTaskModal;
