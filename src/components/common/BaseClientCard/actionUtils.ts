// Action configurations based on role and context

import type { Task } from '../../../api/types';
import type { UserRole, CardContext } from './types';

/**
 * Determine which actions are available for a task based on role, context, and task status
 */
export const getAvailableActions = (
  task: Task,
  role: UserRole,
  context: CardContext,
  isEmployeeTask: boolean = false
): {
  canComplete: boolean;
  canDefer: boolean;
  canResume: boolean;
  canCancel: boolean;
  canRestore: boolean;
  canSubmitForReview: boolean;
  canAssign: boolean;
  canToggleUrgent: boolean;
  showRequirements: boolean;
  showFollowUp: boolean;
  showSubtasks: boolean;
} => {
  const isNew = task.status === 'New';
  const isDeferred = task.status === 'Deferred';
  const isCompleted = task.status === 'Completed';
  const isCancelled = task.status === 'Cancelled';
  const isPendingReview = task.status === 'Pending Review';
  
  // Base availability - always show these
  const showRequirements = true;
  const showFollowUp = true;
  const showSubtasks = true;

  if (role === 'employee') {
    return {
      canComplete: false, // Employees submit for review instead
      canDefer: isNew,
      canResume: isDeferred,
      canCancel: !isCompleted && !isCancelled,
      canRestore: false,
      canSubmitForReview: !isCompleted && !isPendingReview,
      canAssign: false,
      canToggleUrgent: true,
      showRequirements,
      showFollowUp,
      showSubtasks,
    };
  }

  // Admin role
  const isAdminEmployeeContext = context === 'admin-employee-filter' || context === 'admin-employee-profile';
  
  return {
    // In employee contexts, admin can't complete directly if task is assigned to employee
    canComplete: isAdminEmployeeContext 
      ? !isEmployeeTask && !isCompleted 
      : !isCompleted,
    canDefer: isNew,
    canResume: isDeferred,
    canCancel: !isCompleted && !isCancelled,
    canRestore: isCompleted,
    // Admin can submit for review in employee contexts
    canSubmitForReview: isAdminEmployeeContext && isNew,
    // Only allow assign in dashboard contexts
    canAssign: (context === 'admin-dashboard' || context === 'admin-employee-filter') && (isNew || isDeferred),
    canToggleUrgent: true,
    showRequirements,
    showFollowUp,
    showSubtasks,
  };
};

/**
 * Get the label for complete button based on context
 */
export const getCompleteButtonLabel = (
  isEmployeeTask: boolean,
  role: UserRole,
  context: CardContext
): string => {
  if (role === 'employee') {
    return 'إرسال للمراجعة';
  }
  
  if (isEmployeeTask && (context === 'admin-employee-filter' || context === 'admin-dashboard')) {
    return 'موظف مكلف';
  }
  
  return 'إكمال';
};

/**
 * Get assign button label based on task assignment status
 */
export const getAssignButtonLabel = (task: Task): string => {
  return task.assigned_to_id ? 'الغاء/تغيير الموظف' : 'تعيين موظف';
};

/**
 * Check if task is assigned to an employee
 */
export const isTaskAssignedToEmployee = (
  task: Task,
  employees: Array<{ user_id: number | string }>
): boolean => {
  if (!task.assigned_to_id) return false;
  return employees.some(emp => emp.user_id == task.assigned_to_id);
};
