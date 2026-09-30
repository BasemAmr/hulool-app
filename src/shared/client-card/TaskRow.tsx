// Task Row Component - Single task row in the table matching reference design
// Features equal-width sharp badges, single-line sharp black date, and RTL layout

import { Eye } from 'lucide-react';
import TaskActionDropdown from './TaskActionDropdown';
import { formatShortDate } from './dateUtils';
import type { TaskRowProps } from './types';
import { cn } from '@/shared/utils/cn';
import { useTranslation } from 'react-i18next';

interface TaskRowComponentProps extends TaskRowProps {
  rowRef?: React.Ref<HTMLTableRowElement>;
  isEmployeeTask?: boolean;
  isUrgent?: boolean;
}

const getStatusStyle = (status: string): React.CSSProperties => {
  switch (status) {
    case 'New':
      return {
        backgroundColor: 'var(--token-status-warning-bg)',
        color: 'var(--token-status-warning-text)',
        borderColor: 'var(--token-status-warning-border)',
      };
    case 'Pending Review':
      return {
        backgroundColor: 'var(--token-status-info-bg)',
        color: 'var(--token-status-info-text)',
        borderColor: 'var(--token-status-info-border)',
      };
    case 'Completed':
      return {
        backgroundColor: 'var(--token-status-success-bg)',
        color: 'var(--token-status-success-text)',
        borderColor: 'var(--token-status-success-border)',
      };
    case 'Deferred':
    default:
      return {
        backgroundColor: 'var(--token-status-neutral-bg)',
        color: 'var(--token-status-neutral-text)',
        borderColor: 'var(--token-status-neutral-border)',
      };
  }
};

const TaskRow = ({
  task,
  index: rowIndex,
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

  // Extract non-urgent tags for the secondary sub-line (e.g. بلدي • رخصة محلية)
  const nonUrgentTags = (task.tags || [])
    .filter((tg: any) => (typeof tg === 'object' ? tg.name : tg) !== 'قصوى')
    .map((tg: any) => typeof tg === 'object' ? tg.name : tg)
    .filter(Boolean);

  const subDetails = nonUrgentTags.length > 0
    ? nonUrgentTags.join(' • ')
    : '';

  // Calculate days elapsed for duration badge
  const startDate = task.start_date ? new Date(task.start_date) : new Date();
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const durationLabel = `${diffDays} يوم`;
  const isDurationHigh = diffDays > 30 || isUrgent;

  const rawDate = task.start_date ? task.start_date.split(' ')[0] : '';
  const displayDate = rawDate || formatShortDate(task.start_date);

  const amountNum = Number(task.amount || 0);
  const showStatus = context === 'admin-employee-filter' || context === 'admin-employee-profile';
  const isEvenRow = rowIndex % 2 === 0;

  return (
    <tr
      ref={rowRef}
      className={cn(
        "task-row transition-colors duration-150 border-b last:border-b-0 font-['Cairo']",
        "hover:bg-[var(--token-card-table-row-hover-bg)]"
      )}
      data-task-id={task.id}
      style={{
        backgroundColor: isEvenRow ? 'var(--token-card-table-row-even-bg)' : 'transparent',
        borderBottomColor: 'var(--token-card-table-row-border)',
        ...(isEmployeeTask ? { outline: '1px solid var(--token-border-strong)' } : {}),
      }}
    >
      {/* 1. Task Name & Sub-details (Rightmost in RTL) */}
      <td className="px-3.5 py-2.5 text-right border-0 align-middle">
        <div className="flex flex-col text-right">
          <span 
            className="font-bold text-sm leading-tight truncate block" 
            style={{ color: 'var(--token-text-primary)' }}
            title={taskDisplayName}
          >
            {taskDisplayName}
          </span>
          {subDetails && (
            <span 
              className="text-[11px] font-normal leading-normal truncate block mt-0.5" 
              style={{ color: 'var(--token-text-muted)' }}
              title={subDetails}
            >
              {subDetails}
            </span>
          )}
        </div>
      </td>

      {/* 2. Date: Single line with clear black text and sharp badge */}
      <td className="px-1.5 py-2.5 text-center border-0 align-middle">
        <span 
          className="inline-flex items-center justify-center w-full h-6 text-[11px] font-semibold rounded-none whitespace-nowrap tabular-nums font-['Cairo'] shadow-2xs border"
          style={{
            backgroundColor: 'var(--token-card-badge-date-bg)',
            color: 'var(--token-card-badge-date-text)',
            borderColor: 'var(--token-card-badge-date-border)',
          }}
        >
          {displayDate}
        </span>
      </td>

      {/* 3. Duration Badge: strictly rounded-none, fixed equal width, whitespace-nowrap */}
      <td className="px-1.5 py-2.5 text-center border-0 align-middle">
        <span
          className="inline-flex items-center justify-center w-full h-6 text-[11px] font-semibold rounded-none whitespace-nowrap tabular-nums border font-['Cairo'] shadow-2xs"
          style={
            isDurationHigh
              ? {
                  backgroundColor: 'var(--token-card-badge-duration-alert-bg)',
                  color: 'var(--token-card-badge-duration-alert-text)',
                  borderColor: 'var(--token-card-badge-duration-alert-border)',
                }
              : {
                  backgroundColor: 'var(--token-card-badge-duration-normal-bg)',
                  color: 'var(--token-card-badge-duration-normal-text)',
                  borderColor: 'var(--token-card-badge-duration-normal-border)',
                }
          }
        >
          {durationLabel}
        </span>
      </td>

      {/* 4. Amount Badge: strictly rounded-none, fixed equal width to duration badge, whitespace-nowrap */}
      {showAmount && (
        <td className="px-1.5 py-2.5 text-center border-0 align-middle">
          <span
            className="inline-flex items-center justify-center w-full h-6 text-[11px] font-semibold rounded-none whitespace-nowrap tabular-nums border font-['Cairo'] shadow-2xs"
            style={
              amountNum === 0
                ? {
                    backgroundColor: 'var(--token-card-badge-amount-zero-bg)',
                    color: 'var(--token-card-badge-amount-zero-text)',
                    borderColor: 'var(--token-card-badge-amount-zero-border)',
                  }
                : {
                    backgroundColor: 'var(--token-card-badge-amount-due-bg)',
                    color: 'var(--token-card-badge-amount-due-text)',
                    borderColor: 'var(--token-card-badge-amount-due-border)',
                  }
            }
          >
            {amountNum === 0 ? '0 ر.س' : `${amountNum.toLocaleString()} ر.س`}
          </span>
        </td>
      )}

      {/* 5. Status (if shown): strictly rounded-none */}
      {showStatus && (
        <td className="px-1.5 py-2.5 border-0 text-center align-middle">
          <span 
            className="inline-flex items-center justify-center w-full h-6 rounded-none text-[11px] font-semibold border whitespace-nowrap tabular-nums font-['Cairo'] shadow-2xs"
            style={getStatusStyle(task.status)}
          >
            {t(`status.${task.status}`)}
          </span>
        </td>
      )}

      {/* 6. Actions (Leftmost in RTL): Subtasks, Dropdown */}
      <td className="px-2 py-2.5 border-0 align-middle text-left whitespace-nowrap">
        <div className="flex gap-1 justify-start items-center">
          {/* Subtasks */}
          {actions.onViewSubtasks && (
            <button
              onClick={() => actions.onViewSubtasks?.(task)}
              className="w-6 h-6 rounded-none flex items-center justify-center transition-colors cursor-pointer shadow-2xs border"
              style={{
                backgroundColor: 'var(--token-card-action-btn-blue-bg)',
                color: 'var(--token-card-action-btn-blue-text)',
                borderColor: 'var(--token-card-action-btn-blue-border)',
              }}
              title="المهام الفرعية"
              type="button"
            >
              <Eye size={13} style={{ color: 'inherit' }} />
            </button>
          )}

          {/* 3-dots Menu (Leftmost at the card edge) */}
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
