// BaseClientCard - Unified client card component for all contexts

import { useRef, useEffect, useState } from 'react';
import CardHeader from './CardHeader';
import TaskRow from './TaskRow';
import type { BaseClientCardProps } from './types';
import { cn } from '@/shared/utils/cn';

const BaseClientCard = ({
  data,
  role,
  context,
  taskActions = {},
  clientActions = {},
  onWidthCalculated,
  showAmount = true,
  showEmployeePrefix = false,
  compactMode = false,
}: BaseClientCardProps) => {
  const { client, tasks } = data;
  const cardRef = useRef<HTMLDivElement>(null);
  const taskRowRefs = useRef<(HTMLTableRowElement | null)[]>([]);
  const [isHovered, setIsHovered] = useState(false);

  const isClientUrgent = tasks.some(task => task.tags?.some(tag => tag.name === 'قصوى'));

  useEffect(() => {
    if (isHovered && cardRef.current && taskRowRefs.current.length > 0 && onWidthCalculated) {
      const cardWidth = cardRef.current.offsetWidth;
      let maxTaskRowWidth = 0;

      taskRowRefs.current.forEach(ref => {
        if (ref) {
          maxTaskRowWidth = Math.max(maxTaskRowWidth, ref.offsetWidth);
        }
      });

      if (maxTaskRowWidth > cardWidth) {
        const excessPercentage = ((maxTaskRowWidth - cardWidth) / cardWidth) * 100;
        const newWidth = `${100 + excessPercentage}%`;
        onWidthCalculated(newWidth);
      } else {
        onWidthCalculated('100%');
      }
    }
  }, [isHovered, onWidthCalculated]);

  const showStatus = context === 'admin-employee-filter' || context === 'admin-employee-profile';
  const showAmountColumn = showAmount;

  return (
    <div
      ref={cardRef}
      className={cn(
        "h-full shadow-sm rounded-none overflow-visible relative transition-all duration-300 bg-bg-surface",
        isClientUrgent
          ? "border-l-4 border-status-danger-border"
          : "border-l-4 border-border-default",
        compactMode ? "border-2" : "border border-border-default"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <CardHeader
        client={client}
        isUrgent={isClientUrgent}
        role={role}
        context={context}
        actions={clientActions}
      />

      {/* Body - Tasks Table */}
      <div className="p-0 relative overflow-visible bg-bg-surface">
        <div className="overflow-hidden relative">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-[2]">
              <tr className="bg-bg-surface-muted">
                <th className="text-[0.8em] px-2 py-1.5 border-0 text-text-secondary font-semibold">
                  المهمة
                </th>
                <th className="text-[0.8em] px-2 py-1.5 border-0 text-text-secondary font-semibold">
                  تاريخ
                </th>
                <th className="text-[0.8em] px-2 py-1.5 border-0 text-text-secondary font-semibold">
                  اليوم
                </th>
                {showAmountColumn && (
                  <th className="text-[0.8em] px-2 py-1.5 border-0 text-text-secondary font-semibold">
                    المبلغ
                  </th>
                )}
                {showStatus && (
                  <th className="text-[0.8em] px-2 py-1.5 border-0 text-text-secondary font-semibold">
                    الحالة
                  </th>
                )}
                <th className="text-[0.8em] px-2 py-1.5 border-0 w-20 min-w-[80px] text-text-secondary font-semibold">
                  إجراءات
                </th>
              </tr>
            </thead>

            <tbody className="overflow-hidden">
              {tasks.map((task, taskIndex) => {
                const isTaskUrgent = task.tags?.some(tag => tag.name === 'قصوى');

                return (
                  <TaskRow
                    key={task.id}
                    task={task}
                    index={taskIndex}
                    role={role}
                    context={context}
                    isUrgent={isTaskUrgent}
                    actions={taskActions}
                    showAmount={showAmountColumn}
                    showEmployeePrefix={showEmployeePrefix}
                    rowRef={(el) => { taskRowRefs.current[taskIndex] = el; }}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BaseClientCard;
