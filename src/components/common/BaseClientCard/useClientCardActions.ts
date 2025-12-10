// useClientCardActions - Hook to provide actions for BaseClientCard

import { useQueryClient } from '@tanstack/react-query';
import { useModalStore } from '../../../stores/modalStore';
import { useDrawerStore } from '../../../stores/drawerStore';
import { useToast } from '../../../hooks/useToast';
import { useTranslation } from 'react-i18next';
import { 
  useDeferTask, 
  useResumeTask, 
  useUpdateTask, 
  useCancelTask, 
  useRestoreTask,
  useCompleteTask 
} from '../../../queries/taskQueries';
import { useSubmitTaskForReview } from '../../../queries/employeeTasksQueries';
import { useAdminSubmitTaskForReview } from '../../../employee_management_temp_page/employeeManagementQueries';
import type { Task, Client } from '../../../api/types';
import type { UserRole, CardContext, TaskActions, ClientActions } from './types';

interface UseClientCardActionsOptions {
  role: UserRole;
  context: CardContext;
  client: Client;
}

interface UseClientCardActionsReturn {
  taskActions: TaskActions;
  clientActions: ClientActions;
}

export const useClientCardActions = ({
  role,
  context,
  client,
}: UseClientCardActionsOptions): UseClientCardActionsReturn => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { openModal } = useModalStore();
  const { openDrawer } = useDrawerStore();
  const { success, error } = useToast();

  // Mutations
  const deferTaskMutation = useDeferTask();
  const resumeTaskMutation = useResumeTask();
  const updateTaskMutation = useUpdateTask();
  const cancelTaskMutation = useCancelTask();
  const restoreTaskMutation = useRestoreTask();
  const completeTaskMutation = useCompleteTask();
  const submitForReviewMutation = useSubmitTaskForReview();
  const adminSubmitForReviewMutation = useAdminSubmitTaskForReview();

  // Determine query key to invalidate based on context
  const getQueryKey = () => {
    if (context === 'employee-dashboard') {
      return ['dashboard', 'employee', 'clientsWithActiveTasks'];
    }
    return ['dashboard', 'clientsWithActiveTasks'];
  };

  // Generic action handler
  const handleAction = (
    mutation: any, 
    task: Task, 
    successKey: string, 
    successMessageKey: string, 
    errorKey: string
  ) => {
    mutation.mutate({ id: task.id }, {
      onSuccess: () => {
        success(t(successKey), t(successMessageKey, { taskName: task.task_name || t(`type.${task.type}`) }));
        queryClient.invalidateQueries({ queryKey: getQueryKey() });
      },
      onError: (err: any) => {
        error(t('common.error'), err.message || t(errorKey));
      }
    });
  };

  // Task Actions
  const taskActions: TaskActions = {
    onDefer: (task) => handleAction(
      deferTaskMutation, 
      task, 
      'tasks.deferSuccess', 
      'tasks.deferSuccessMessage', 
      'tasks.deferError'
    ),

    onResume: (task) => handleAction(
      resumeTaskMutation, 
      task, 
      'tasks.resumeSuccess', 
      'tasks.resumeSuccessMessage', 
      'tasks.resumeError'
    ),

    onRestore: (task) => {
      restoreTaskMutation.mutate({ id: task.id }, {
        onSuccess: () => {
          success('تمت الاستعادة', `تم استعادة المهمة "${task.task_name || t(`type.${task.type}`)}" إلى حالة جديدة`);
          queryClient.invalidateQueries({ queryKey: getQueryKey() });
        },
        onError: (err: any) => {
          error('خطأ', err.message || 'حدث خطأ أثناء استعادة المهمة');
        }
      });
    },

    onComplete: (task) => {
      // If task amount is 0, complete immediately without payment modal
      if (task.amount === 0 || !task.amount) {
        // Complete task with is_paid: false (no payment needed for zero amount)
        completeTaskMutation.mutate({
          id: task.id,
          payload: { is_paid: false }
        }, {
          onSuccess: () => {
            success('تم الإكمال', `تم إكمال المهمة "${task.task_name || t(`type.${task.type}`)}" بنجاح`);
            queryClient.invalidateQueries({ queryKey: getQueryKey() });
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
          },
          onError: (err: any) => {
            error('خطأ', err.message || 'حدث خطأ أثناء إكمال المهمة');
          }
        });
      } else {
        // Open completion modal for tasks with amounts
        openModal('taskCompletion', { task });
      }
    },

    onCancel: (task) => {
      cancelTaskMutation.mutate({
        id: task.id,
        decisions: { task_action: 'cancel' }
      }, {
        onSuccess: () => {
          success('تم الإلغاء', 'تم إلغاء المهمة بنجاح');
          queryClient.invalidateQueries({ queryKey: getQueryKey() });
        },
        onError: (err: any) => {
          error('خطأ', err.message || 'حدث خطأ أثناء إلغاء المهمة');
        }
      });
    },

    onSubmitForReview: (task) => {
      const mutation = role === 'admin' ? adminSubmitForReviewMutation : submitForReviewMutation;
      
      mutation.mutate(task.id, {
        onSuccess: async (response: any) => {
          success('تم الإرسال', `تم إرسال المهمة "${task.task_name || 'مهمة'}" للمراجعة بنجاح`);
          await queryClient.invalidateQueries({ queryKey: getQueryKey() });
          await queryClient.invalidateQueries({ queryKey: ['tasks'] });
          
          // For admin, open approval modal
          if (role === 'admin') {
            const updatedTask = {
              ...task,
              status: 'Pending Review' as const,
              id: response?.data?.id || task.id
            };
            openModal('approval', { task: updatedTask });
          }
        },
        onError: (err: any) => {
          error('خطأ', err.message || 'حدث خطأ أثناء إرسال المهمة للمراجعة');
        }
      });
    },

    onShowRequirements: (task) => {
      openModal('requirements', { task });
    },

    onViewSubtasks: (task) => {
      openModal('taskForm', { taskToEdit: task, client: task.client || client });
    },

    onOpenFollowUp: (task) => {
      openDrawer('taskFollowUp', {
        taskId: task.id,
        taskName: task.task_name || undefined,
        clientName: client.name
      });
    },

    onToggleUrgent: (task) => {
      const isUrgent = task.tags?.some(tag => tag.name === 'قصوى');
      const urgentTagId = 1;

      const currentTags = Array.isArray(task.tags)
        ? task.tags.map((tag: any) => typeof tag === 'object' ? tag.id.toString() : tag.toString())
        : [];

      const updatedTags = isUrgent
        ? currentTags.filter(id => id !== urgentTagId.toString())
        : [...currentTags, urgentTagId.toString()];

      updateTaskMutation.mutate({
        id: task.id,
        taskData: {
          task_name: task.task_name || '',
          type: task.type,
          amount: task.amount,
          start_date: task.start_date,
          end_date: task.end_date || undefined,
          prepaid_amount: task.prepaid_amount,
          notes: task.notes || '',
          tags: updatedTags,
          requirements: task.requirements?.map((req: any) => ({
            id: req.id,
            requirement_text: req.requirement_text,
            is_provided: req.is_provided
          })) || []
        }
      }, {
        onSuccess: () => {
          success(
            isUrgent ? 'تم إزالة العلامة' : 'تمت الإضافة',
            isUrgent ? 'تم إزالة علامة العاجل من المهمة' : 'تم إضافة علامة العاجل للمهمة'
          );
          queryClient.invalidateQueries({ queryKey: getQueryKey() });
        },
        onError: (err: any) => {
          error('خطأ', err.message || 'حدث خطأ أثناء تحديث علامة العاجل');
        }
      });
    },

    onAssign: role === 'admin' ? (task) => {
      openModal('assignTask', { task });
    } : undefined,
  };

  // Client Actions
  const clientActions: ClientActions = {
    onAddTask: () => {
      openModal('taskForm', { client });
    },
    onAddInvoice: role === 'admin' ? () => {
      openModal('invoiceForm', { client_id: client.id, client });
    } : undefined,
    onRecordCredit: role === 'admin' ? () => {
      openModal('recordCreditModal', { client });
    } : undefined,
  };

  return { taskActions, clientActions };
};

export default useClientCardActions;
