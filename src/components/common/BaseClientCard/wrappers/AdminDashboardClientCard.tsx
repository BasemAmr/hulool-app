// AdminDashboardClientCard - Wrapper using BaseClientCard for admin dashboard
// This demonstrates how to use BaseClientCard with the admin role and dashboard context

import { BaseClientCard, useClientCardActions } from '../index';
import type { ClientWithTasks } from '../types';
import type { Task } from '../../../../api/types';

interface AdminDashboardClientCardProps {
  data: ClientWithTasks;
  index?: number;
  alternatingColors?: string[];
  onAssign?: (task: Task) => void;
  onWidthCalculated?: (width: string) => void;
}

/**
 * AdminDashboardClientCard - Used in the main admin dashboard
 * 
 * Features:
 * - Complete task
 * - Defer/Resume task
 * - Cancel/Restore task
 * - Toggle urgent
 * - View requirements
 * - View subtasks
 * - Open follow-up
 * - Assign task to employee
 * - Add task/receivable/credit for client
 */
const AdminDashboardClientCard = ({
  data,
  index = 0,
  alternatingColors,
  onAssign,
  onWidthCalculated,
}: AdminDashboardClientCardProps) => {
  // Get actions from the hook
  const { taskActions, clientActions } = useClientCardActions({
    role: 'admin',
    context: 'admin-dashboard',
    client: data.client,
  });

  // Override onAssign if provided
  const mergedTaskActions = onAssign 
    ? { ...taskActions, onAssign }
    : taskActions;

  return (
    <BaseClientCard
      data={data}
      role="admin"
      context="admin-dashboard"
      index={index}
      alternatingColors={alternatingColors}
      taskActions={mergedTaskActions}
      clientActions={clientActions}
      onWidthCalculated={onWidthCalculated}
      showAmount={true}
      showEmployeePrefix={true}
    />
  );
};

export default AdminDashboardClientCard;
