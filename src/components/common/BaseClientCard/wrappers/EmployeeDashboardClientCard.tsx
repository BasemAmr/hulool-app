// EmployeeDashboardClientCard - Wrapper using BaseClientCard for employee dashboard
// This demonstrates how to use BaseClientCard with the employee role

import { BaseClientCard, useClientCardActions } from '../index';
import type { ClientWithTasks } from '../types';

interface EmployeeDashboardClientCardProps {
  data: ClientWithTasks;
  index?: number;
  alternatingColors?: string[];
  onWidthCalculated?: (width: string) => void;
}

/**
 * EmployeeDashboardClientCard - Used in the employee's own dashboard
 * 
 * Features:
 * - Submit for review (instead of complete)
 * - Defer/Resume task
 * - Cancel task
 * - Toggle urgent
 * - View requirements
 * - View subtasks
 * - Open follow-up
 * - Add task for client
 */
const EmployeeDashboardClientCard = ({
  data,
  index = 0,
  alternatingColors,
  onWidthCalculated,
}: EmployeeDashboardClientCardProps) => {
  // Get actions from the hook
  const { taskActions, clientActions } = useClientCardActions({
    role: 'employee',
    context: 'employee-dashboard',
    client: data.client,
  });

  return (
    <BaseClientCard
      data={data}
      role="employee"
      context="employee-dashboard"
      index={index}
      alternatingColors={alternatingColors}
      taskActions={taskActions}
      clientActions={clientActions}
      onWidthCalculated={onWidthCalculated}
      showAmount={false} // Employees don't see amounts by default
      showEmployeePrefix={false}
    />
  );
};

export default EmployeeDashboardClientCard;
