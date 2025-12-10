// Task Row Component - Single task row in the table

import { AlertTriangle, MessageSquare, Eye } from 'lucide-react';
import { Badge } from '../../ui/badge';
import TaskActionDropdown from './TaskActionDropdown';
import { formatDaysElapsed, formatShortDate } from './dateUtils';
import type { TaskRowProps } from './types';
import { cn } from '@/lib/utils';
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
      fill="#f00"
    />
    <path
      d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z"
      fill="#f00"
    />
  </svg>
);

interface TaskRowComponentProps extends TaskRowProps {
  rowRef?: React.Ref<HTMLTableRowElement>;
  isEmployeeTask?: boolean;
}

const TaskRow = ({
  task,
  index: _index,
  role,
  context,
  backgroundColor,
  actions,
  showAmount = true,
  showEmployeePrefix = false,
  employeeName,
  rowRef,
  isEmployeeTask = false,
}: TaskRowComponentProps) => {
  const { t } = useTranslation();
  const isTaskUrgent = task.tags?.some(tag => tag.name === 'قصوى');
  const isDeferred = task.status === 'Deferred';
  
  // Build display name with optional employee prefix
  const taskDisplayName = showEmployeePrefix && employeeName
    ? `${employeeName}: ${task.task_name || t(`type.${task.type}`)}`
    : (task.task_name || t(`type.${task.type}`));

  // Show status badge for admin-employee contexts
  const showStatus = context === 'admin-employee-filter' || context === 'admin-employee-profile';

  return (
    <tr
      ref={rowRef}
      className={cn(
        "task-row transition-all duration-200 relative",
        isDeferred && "opacity-60"
      )}
      data-task-id={task.id}
      style={{
        backgroundColor,
        border: isEmployeeTask ? '3px solid #000' : 'none',
      }}
    >
      {/* Task Name */}
      <td 
        className="text-[0.82em] px-2 py-2 text-black border-0" 
        style={{ backgroundColor }}
      >
        <div className="flex items-center gap-1">
          <span className="truncate max-w-[180px] inline-block">
            {taskDisplayName}
          </span>
          {isTaskUrgent && (
            <AlertTriangle size={10} className="text-danger flex-shrink-0" />
          )}
        </div>
      </td>

      {/* Date */}
      <td 
        className="text-[0.77em] px-2 py-2 text-black border-0" 
        style={{ backgroundColor }}
      >
        {formatShortDate(task.start_date)}
      </td>

      {/* Days Elapsed */}
      <td 
        className="text-[0.77em] px-2 py-2 text-black border-0" 
        style={{ backgroundColor }}
      >
        {formatDaysElapsed(task.start_date)}
      </td>

      {/* Amount - optional based on context */}
      {showAmount && (
        <td 
          className="text-[0.77em] px-2 py-2 text-black border-0 font-bold" 
          style={{ backgroundColor }}
        >
          <div className="flex items-center text-danger">
            <SARIcon />
            {Number(task.amount).toLocaleString()}
          </div>
        </td>
      )}

      {/* Status - for admin-employee contexts */}
      {showStatus && (
        <td 
          className="text-[0.77em] px-2 py-2 text-black border-0 text-center" 
          style={{ backgroundColor }}
        >
          <Badge
            variant={
              task.status === 'New' ? 'default' :
              task.status === 'Deferred' ? 'destructive' :
              task.status === 'Pending Review' ? 'secondary' :
              task.status === 'Completed' ? 'default' :
              'outline'
            }
            className={cn(
              "text-[0.7em]",
              task.status === 'New' && "bg-yellow-500 text-black hover:bg-yellow-500",
              task.status === 'Pending Review' && "bg-blue-400 text-black hover:bg-blue-400",
              task.status === 'Completed' && "bg-green-500 text-white hover:bg-green-500"
            )}
          >
            {t(`status.${task.status}`)}
          </Badge>
        </td>
      )}

      {/* Actions */}
      <td
        className="px-2 py-2 static text-black border-0 min-w-[80px] whitespace-nowrap"
        style={{ backgroundColor }}
      >
        <div className="flex gap-1.5 justify-start items-center min-w-fit">
          {/* Quick action: Comments */}
          {actions.onOpenFollowUp && (
            <button
              className="p-1.5 rounded border border-gray-300 bg-white hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 cursor-pointer"
              onClick={() => actions.onOpenFollowUp?.(task)}
              title="التعليقات"
            >
              <MessageSquare size={12} />
            </button>
          )}

          {/* Quick action: View Subtasks */}
          {actions.onViewSubtasks && (
            <button
              onClick={() => actions.onViewSubtasks?.(task)}
              className="p-1.5 rounded border border-blue-300 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:border-blue-400 transition-all duration-200 cursor-pointer"
              title="المهام الفرعية"
            >
              <Eye size={12} />
            </button>
          )}

          {/* More Actions Dropdown */}
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
