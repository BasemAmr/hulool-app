// BaseClientCard - Unified client card component for all contexts

import { useRef, useEffect, useState } from 'react';
import CardHeader from './CardHeader';
import TaskRow from './TaskRow';
import { calculateColorScheme, getRowBackground, DEFAULT_ALTERNATING_COLORS } from './colorUtils';
import type { BaseClientCardProps } from './types';
import { cn } from '@/lib/utils';

const BaseClientCard = ({
  data,
  role,
  context,
  index = 0,
  alternatingColors = DEFAULT_ALTERNATING_COLORS,
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

  // Check if client has urgent tasks
  const isClientUrgent = tasks.some(task => task.tags?.some(tag => tag.name === 'قصوى'));

  // Calculate color scheme
  const colorScheme = calculateColorScheme(index, alternatingColors, isClientUrgent);
  const { headerColor, borderColor, row1Color, row2Color } = colorScheme;

  // Calculate dynamic width on hover for content overflow
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

  // Determine which columns to show based on context
  const showStatus = context === 'admin-employee-filter' || context === 'admin-employee-profile';
  const showAmountColumn = showAmount;

  return (
    <div
      ref={cardRef}
      className={cn(
        "h-full shadow-md rounded-none overflow-visible relative transition-all duration-300",
        compactMode ? "border-2" : "border-4"
      )}
      style={{ borderColor }}
      onMouseEnter={(e) => {
        setIsHovered(true);
        e.currentTarget.style.transform = 'scale(1.02)';
        e.currentTarget.style.zIndex = '10';
        e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
      }}
      onMouseLeave={(e) => {
        setIsHovered(false);
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.zIndex = '1';
        e.currentTarget.style.boxShadow = '';
      }}
    >
      {/* Header */}
      <CardHeader
        client={client}
        isUrgent={isClientUrgent}
        headerColor={headerColor}
        role={role}
        context={context}
        actions={clientActions}
      />

      {/* Body - Tasks Table */}
      <div
        className="p-0 relative overflow-visible"
        style={{ backgroundColor: row1Color }}
      >
        <div className="overflow-hidden relative">
          <table className="w-full text-sm">
            {/* Table Header */}
            <thead className="sticky top-0 z-[2]">
              <tr>
                <th 
                  className="text-[0.8em] px-2 py-1.5 border-0" 
                  style={{ backgroundColor: headerColor }}
                >
                  المهمة
                </th>
                <th 
                  className="text-[0.8em] px-2 py-1.5 border-0" 
                  style={{ backgroundColor: headerColor }}
                >
                  تاريخ
                </th>
                <th 
                  className="text-[0.8em] px-2 py-1.5 border-0" 
                  style={{ backgroundColor: headerColor }}
                >
                  اليوم
                </th>
                {showAmountColumn && (
                  <th 
                    className="text-[0.8em] px-2 py-1.5 border-0" 
                    style={{ backgroundColor: headerColor }}
                  >
                    المبلغ
                  </th>
                )}
                {showStatus && (
                  <th 
                    className="text-[0.8em] px-2 py-1.5 border-0" 
                    style={{ backgroundColor: headerColor }}
                  >
                    الحالة
                  </th>
                )}
                <th 
                  className="text-[0.8em] px-2 py-1.5 border-0 w-20 min-w-[80px]" 
                  style={{ backgroundColor: headerColor }}
                >
                  إجراءات
                </th>
              </tr>
            </thead>
            
            {/* Table Body */}
            <tbody className="overflow-hidden">
              {tasks.map((task, taskIndex) => {
                const isTaskUrgent = task.tags?.some(tag => tag.name === 'قصوى');
                const rowBackground = getRowBackground(taskIndex, isTaskUrgent, row1Color, row2Color);

                return (
                  <TaskRow
                    key={task.id}
                    task={task}
                    index={taskIndex}
                    role={role}
                    context={context}
                    backgroundColor={rowBackground}
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
