// EmployeeDashboardClientCard - Wrapper using BaseClientCard for employee dashboard
// This demonstrates how to use BaseClientCard with the employee role

import { BaseClientCard, useClientCardActions } from '../index';
import type { ClientWithTasks } from '../types';

interface EmployeeDashboardClientCardProps {
  data: ClientWithTasks;
  onWidthCalculated?: (width: string) => void;
}

const EmployeeDashboardClientCard = ({
  data,
  onWidthCalculated,
}: EmployeeDashboardClientCardProps) => {
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
      taskActions={taskActions}
      clientActions={clientActions}
      onWidthCalculated={onWidthCalculated}
      showAmount={true}
      showEmployeePrefix={false}
    />
  );
};

export default EmployeeDashboardClientCard;
