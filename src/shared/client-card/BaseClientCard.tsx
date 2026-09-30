// BaseClientCard - Unified client card component matching reference design
// Features Mostaql Blue Header Theme, RTL hierarchy, and sharp standardized badges

import { useRef, useEffect, useState } from 'react';
import { GripVertical } from 'lucide-react';
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
  dragHandleProps,
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
        "h-full rounded-2xl overflow-hidden relative transition-all duration-200 font-['Cairo'] flex flex-col",
        compactMode ? "p-0.5" : ""
      )}
      style={{
        backgroundImage: 'var(--token-card-shell-bg)',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: isHovered ? 'var(--token-card-shell-border-hover)' : 'var(--token-card-shell-border)',
        boxShadow: isHovered ? 'var(--token-card-shell-shadow-hover)' : 'var(--token-card-shell-shadow)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      dir="rtl"
    >
      {/* 1. Upper Zone: Solid Header Band (Drag handle, ID, Name, Phone, Actions) */}
      <div 
        style={{
          backgroundColor: 'var(--token-card-header-solid-bg)',
          color: 'var(--token-card-header-text)',
        }}
      >
        {/* Top Sub-bar: Drag Handle on Right, Client ID on Left */}
        <div 
          className="px-4 pt-2.5 pb-1 flex justify-between items-center text-xs border-b select-none"
          style={{
            borderBottomColor: 'var(--token-card-header-border)',
            color: 'var(--token-card-header-subtext)',
          }}
        >
          {/* Right (in RTL): Drag Handle */}
          {dragHandleProps ? (
            <div
              {...dragHandleProps.attributes}
              {...dragHandleProps.listeners}
              className="flex items-center gap-1.5 cursor-grab active:cursor-grabbing hover:opacity-100 transition-opacity"
              style={{ color: 'var(--token-card-header-subtext)' }}
              title="اسحب لإعادة الترتيب"
            >
              <GripVertical size={13} style={{ color: 'inherit' }} />
              <span className="text-[11px] font-medium font-['Cairo']">اسحب لإعادة الترتيب</span>
            </div>
          ) : (
            <div 
              className="flex items-center gap-1.5 opacity-60"
              style={{ color: 'var(--token-card-header-subtext)' }}
            >
              <GripVertical size={13} />
              <span className="text-[11px] font-medium font-['Cairo']">اسحب لإعادة الترتيب</span>
            </div>
          )}

          {/* Left (in RTL): Client ID */}
          <span 
            className="text-[11px] font-mono font-medium tabular-nums"
            style={{ color: 'var(--token-card-header-subtext)' }}
          >
            ID #{client.id}
          </span>
        </div>

        {/* Card Header: Client Name, Phone, and Action Buttons */}
        <CardHeader
          client={client}
          isUrgent={isClientUrgent}
          role={role}
          context={context}
          actions={clientActions}
        />
      </div>

      {/* 2. Card Body: Tasks Table directly filling the card body, edge-to-edge, fully blended */}
      <div 
        className="flex-1 overflow-hidden"
        style={{
          backgroundImage: 'var(--token-card-body-bg)'
        }}
      >
        <table className="w-full table-fixed text-sm font-['Cairo'] border-collapse">
          <colgroup>
            <col />                                      {/* Task Name - fluid flex width */}
            <col className="w-[84px]" />                 {/* Date */}
            <col className="w-[72px]" />                 {/* Duration */}
            {showAmountColumn && <col className="w-[72px]" />}    {/* Amount */}
            {showStatus && <col className="w-[72px]" />}          {/* Status */}
            <col className="w-[60px]" />                 {/* Actions */}
          </colgroup>
          <thead>
            <tr 
              className="border-b font-bold text-xs"
              style={{
                backgroundColor: 'var(--token-card-table-head-bg)',
                color: 'var(--token-card-table-head-text)',
                borderBottomColor: 'var(--token-card-table-head-border)',
              }}
            >
              <th className="px-3.5 py-2 text-right font-bold" style={{ color: 'inherit' }}>
                المهمة
              </th>
              <th className="px-1.5 py-2 text-center font-bold" style={{ color: 'inherit' }}>
                التاريخ
              </th>
              <th className="px-1.5 py-2 text-center font-bold" style={{ color: 'inherit' }}>
                المدة
              </th>
              {showAmountColumn && (
                <th className="px-1.5 py-2 text-center font-bold" style={{ color: 'inherit' }}>
                  المبلغ
                </th>
              )}
              {showStatus && (
                <th className="px-1.5 py-2 text-center font-bold" style={{ color: 'inherit' }}>
                  الحالة
                </th>
              )}
              <th className="px-2 py-2 text-left font-bold" style={{ color: 'inherit' }}>
                إجراءات
              </th>
            </tr>
          </thead>

          <tbody 
            className="divide-y"
            style={{
              borderColor: 'var(--token-card-table-row-border)',
            }}
          >
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
    );
  };

export default BaseClientCard;
