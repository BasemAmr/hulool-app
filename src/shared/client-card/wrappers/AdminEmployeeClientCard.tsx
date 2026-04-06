// AdminEmployeeClientCard - Wrapper using BaseClientCard for admin viewing employee tasks
// This is used in admin dashboard's employee filter view and employee profile page

import { BaseClientCard, useClientCardActions } from '../index';
import type { ClientWithTasks } from '../types';
import type { Task } from '@/api/types';

interface AdminEmployeeClientCardProps {
  data: ClientWithTasks;
  context?: 'admin-employee-filter' | 'admin-employee-profile';
  onAssign?: (task: Task) => void;
  onWidthCalculated?: (width: string) => void;
}

const AdminEmployeeClientCard = ({
  data,
  context = 'admin-employee-filter',
  onAssign,
  onWidthCalculated,
}: AdminEmployeeClientCardProps) => {
  const { taskActions, clientActions } = useClientCardActions({
    role: 'admin',
    context,
    client: data.client,
  });

  const mergedTaskActions = onAssign
    ? { ...taskActions, onAssign }
    : taskActions;

  return (
    <BaseClientCard
      data={data}
      role="admin"
      context={context}
      taskActions={mergedTaskActions}
      clientActions={clientActions}
      onWidthCalculated={onWidthCalculated}
      showAmount={true}
      showEmployeePrefix={false}
    />
  );
};

export default AdminEmployeeClientCard;
