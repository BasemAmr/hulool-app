// AdminEmployeeClientCard - Wrapper using BaseClientCard for admin viewing employee tasks
// This is used in admin dashboard's employee filter view and employee profile page

import { BaseClientCard, useClientCardActions } from '../index';
import type { ClientWithTasks } from '../types';
import type { Task } from '../../../../api/types';

interface AdminEmployeeClientCardProps {
  data: ClientWithTasks;
  index?: number;
  alternatingColors?: string[];
  /** Context: 'admin-employee-filter' for dashboard, 'admin-employee-profile' for profile page */
  context?: 'admin-employee-filter' | 'admin-employee-profile';
  onAssign?: (task: Task) => void;
  onWidthCalculated?: (width: string) => void;
}

/**
 * AdminEmployeeClientCard - Used when admin views employee's tasks
 * 
 * Features:
 * - Submit for review (then opens approval modal)
 * - Defer/Resume task
 * - Cancel task
 * - Toggle urgent
 * - View requirements
 * - View subtasks
 * - Open follow-up
 * - Add task for client
 * - Shows task status
 */
const AdminEmployeeClientCard = ({
  data,
  index = 0,
  alternatingColors,
  context = 'admin-employee-filter',
  onAssign,
  onWidthCalculated,
}: AdminEmployeeClientCardProps) => {
  // Get actions from the hook
  const { taskActions, clientActions } = useClientCardActions({
    role: 'admin',
    context,
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
      context={context}
      index={index}
      alternatingColors={alternatingColors}
      taskActions={mergedTaskActions}
      clientActions={clientActions}
      onWidthCalculated={onWidthCalculated}
      showAmount={false} // Don't show amount in employee task view
      showEmployeePrefix={false}
    />
  );
};

export default AdminEmployeeClientCard;
