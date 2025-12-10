// SortableBaseClientCard - Unified sortable wrapper for BaseClientCard

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BaseClientCard, useClientCardActions } from './index';
import { FloatingCardWrapper } from '../FloatingCardWrapper';
import type { BaseClientCardProps } from './types';
import type { Task } from '../../../api/types';
import { cn } from '@/lib/utils';

interface SortableBaseClientCardProps extends Omit<BaseClientCardProps, 'taskActions' | 'clientActions'> {
  /** Unique ID for sortable - format: "containerType-clientId" */
  sortableId: string;
  /** Custom onAssign handler for task assignment */
  onAssign?: (task: Task) => void;
  /** Show drag handle */
  showDragHandle?: boolean;
}

const SortableBaseClientCard = ({
  data,
  role,
  context,
  sortableId,
  onAssign,
  showDragHandle = true,
  ...cardProps
}: SortableBaseClientCardProps) => {
  const [dynamicWidth, setDynamicWidth] = useState<string | undefined>(undefined);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortableId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  // Get actions from hook
  const { taskActions, clientActions } = useClientCardActions({
    role,
    context,
    client: data.client,
  });

  // Merge custom onAssign if provided
  const mergedTaskActions = onAssign 
    ? { ...taskActions, onAssign }
    : taskActions;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="mb-3"
    >
      {/* Drag Handle */}
      {showDragHandle && (
        <div
          {...listeners}
          className={cn(
            "cursor-grab p-1.5 border-b text-xs text-center",
            "bg-gray-50 border-gray-200 text-gray-600",
            "hover:bg-gray-100 active:cursor-grabbing",
            "select-none"
          )}
        >
          ⋮⋮ اسحب لإعادة الترتيب
        </div>
      )}

      {/* Floating Wrapper with Card */}
      <FloatingCardWrapper dynamicWidth={dynamicWidth}>
        <BaseClientCard
          data={data}
          role={role}
          context={context}
          taskActions={mergedTaskActions}
          clientActions={clientActions}
          onWidthCalculated={setDynamicWidth}
          {...cardProps}
        />
      </FloatingCardWrapper>
    </div>
  );
};

export default SortableBaseClientCard;
