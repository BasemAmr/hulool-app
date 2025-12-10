// src/components/dashboard/SortableClientCard.tsx
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DashboardClientCard from './DashboardClientCard';
import { FloatingCardWrapper } from '../common/FloatingCardWrapper';
import type { ClientWithTasksAndStats } from '../../queries/dashboardQueries';
import type { Task } from '../../api/types';
import { useState } from 'react';

interface SortableClientCardProps {
    clientData: ClientWithTasksAndStats;
    containerType: string;
    alternatingColors: string[];
    onAssign?: (task: Task) => void;
}

const SortableClientCard = ({ clientData, containerType, alternatingColors, onAssign }: SortableClientCardProps) => {
    const [dynamicWidth, setDynamicWidth] = useState<string | undefined>(undefined);
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: `${containerType}-${clientData.client.id}` // Composite ID: containerType-clientId
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1000 : 'auto',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            className="mb-3"
        >
            {/* Add a drag handle area */}
            <div
                {...listeners}
                className="cursor-grab p-1.5 bg-gray-50 border-b border-gray-200 text-xs text-gray-600 text-center hover:bg-gray-100 active:cursor-grabbing"
            >
                ⋮⋮ اسحب لإعادة الترتيب
            </div>

            {/* Wrap the card with our floating wrapper */}
            <FloatingCardWrapper dynamicWidth={dynamicWidth}>
                <DashboardClientCard
                    data={clientData}
                    alternatingColors={alternatingColors}
                    onAssign={onAssign}
                    onWidthCalculated={setDynamicWidth}
                />
            </FloatingCardWrapper>
        </div>
    );
};

export default SortableClientCard;