// AdminDashboardClientCard - Wrapper using BaseClientCard for admin dashboard
// This demonstrates how to use BaseClientCard with the admin role and dashboard context

import { BaseClientCard, useClientCardActions } from '../index';
import type { ClientWithTasks } from '../types';
import type { Task } from '@/api/types';

interface AdminDashboardClientCardProps {
  data: ClientWithTasks;
  onAssign?: (task: Task) => void;
  onWidthCalculated?: (width: string) => void;
}

const AdminDashboardClientCard = ({
  data,
  onAssign,
  onWidthCalculated,
}: AdminDashboardClientCardProps) => {
  const { taskActions, clientActions } = useClientCardActions({
    role: 'admin',
    context: 'admin-dashboard',
    client: data.client,
  });

  const mergedTaskActions = onAssign
    ? { ...taskActions, onAssign }
    : taskActions;

  return (
    <BaseClientCard
      data={data}
      role="admin"
      context="admin-dashboard"
      taskActions={mergedTaskActions}
      clientActions={clientActions}
      onWidthCalculated={onWidthCalculated}
      showAmount={true}
      showEmployeePrefix={true}
    />
  );
};

export default AdminDashboardClientCard;
