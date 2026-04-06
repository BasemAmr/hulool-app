// Task Row Component - Single task row in the table

import { AlertTriangle, MessageSquare, Eye } from 'lucide-react';
import { Badge } from '@/shared/ui/shadcn/badge';
import TaskActionDropdown from './TaskActionDropdown';
import { formatDaysElapsed, formatShortDate } from './dateUtils';
import type { TaskRowProps } from './types';
import { cn } from '@/shared/utils/cn';
import { useTranslation } from 'react-i18next';

// SAR currency icon component
const SARIcon = () => (
  <svg
    width={10}
    height={10}
    viewBox="0 0 1124.14 1256.39"
    className="mr-0.5 align-middle flex-shrink-0"
  >
    <path
      d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z"
      fill="currentColor"
    />
    <path
      d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z"
      fill="currentColor"
    />
  </svg>
);

interface TaskRowComponentProps extends TaskRowProps {
  rowRef?: React.Ref<HTMLTableRowElement>;
  isEmployeeTask?: boolean;
  isUrgent?: boolean;
}

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'New': return 'bg-status-warning-bg text-status-warning-text border-status-warning-border';
    case 'Pending Review': return 'bg-status-info-bg text-status-info-text border-status-info-border';
    case 'Completed': return 'bg-status-success-bg text-status-success-text border-status-success-border';
    case 'Deferred': return 'bg-status-neutral-bg text-status-neutral-text border-status-neutral-border';
    default: return 'bg-status-neutral-bg text-status-neutral-text border-status-neutral-border';
  }
};

const TaskRow = ({
  task,
  index: _index,
  role,
  context,
  actions,
  showAmount = true,
  showEmployeePrefix = false,
  employeeName,
  rowRef,
  isEmployeeTask = false,
  isUrgent = false,
}: TaskRowComponentProps) => {
  const { t } = useTranslation();

  const taskDisplayName = showEmployeePrefix && employeeName
    ? `${employeeName}: ${task.task_name || t(`type.${task.type}`)}`
    : (task.task_name || t(`type.${task.type}`));

  const showStatus = context === 'admin-employee-filter' || context === 'admin-employee-profile';

  return (
    <tr
      ref={rowRef}
      className={cn(
        "task-row transition-colors duration-150 border-b border-border-default last:border-b-0",
        isUrgent ? "bg-status-danger-bg/40" : "bg-bg-surface even:bg-bg-surface-hover"
      )}
      data-task-id={task.id}
      style={isEmployeeTask ? { border: '2px solid var(--token-border-strong)' } : undefined}
    >
      {/* Task Name */}
      <td className="text-[0.82em] px-2 py-2 text-text-primary border-0 font-bold">
        <div className="flex items-center gap-1">
          <span className="truncate max-w-[180px] inline-block">
            {taskDisplayName}
          </span>
          {isUrgent && (
            <AlertTriangle size={10} className="text-status-danger-text flex-shrink-0" />
          )}
        </div>
      </td>

      {/* Date */}
      <td className="text-[0.77em] px-2 py-2 text-text-secondary border-0 font-medium">
        {formatShortDate(task.start_date)}
      </td>

      {/* Days Elapsed */}
      <td className="text-[0.77em] px-2 py-2 text-text-secondary border-0 font-medium">
        {formatDaysElapsed(task.start_date)}
      </td>

      {/* Amount */}
      {showAmount && (
        <td className="text-[0.77em] px-2 py-2 border-0 font-medium">
          <div className="flex items-center text-status-danger-text">
            <SARIcon />
            {Number(task.amount).toLocaleString()}
          </div>
        </td>
      )}

      {/* Status */}
      {showStatus && (
        <td className="text-[0.77em] px-2 py-2 border-0 text-center font-medium">
          <span className={cn(
            "inline-block px-2 py-0.5 rounded-full text-[0.7em] font-semibold border",
            getStatusVariant(task.status)
          )}>
            {t(`status.${task.status}`)}
          </span>
        </td>
      )}

      {/* Actions */}
      <td className="px-2 py-2 static border-0 min-w-[80px] whitespace-nowrap">
        <div className="flex gap-1.5 justify-start items-center min-w-fit">
          {actions.onOpenFollowUp && (
            <button
              className="p-1.5 rounded border border-border-default bg-bg-surface hover:bg-bg-surface-hover transition-colors duration-150 cursor-pointer"
              onClick={() => actions.onOpenFollowUp?.(task)}
              title="التعليقات"
            >
              <MessageSquare size={12} className="text-text-secondary" />
            </button>
          )}

          {actions.onViewSubtasks && (
            <button
              onClick={() => actions.onViewSubtasks?.(task)}
              className="p-1.5 rounded border border-status-info-border bg-status-info-bg text-status-info-text hover:bg-status-info-border transition-colors duration-150 cursor-pointer"
              title="المهام الفرعية"
            >
              <Eye size={12} />
            </button>
          )}

          <TaskActionDropdown
            task={task}
            role={role}
            context={context}
            actions={actions}
            isEmployeeTask={isEmployeeTask}
          />
        </div>
      </td>
    </tr>
  );
};

export default TaskRow;
