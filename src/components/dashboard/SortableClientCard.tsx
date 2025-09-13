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
            className="sortable-client-card"
        >
            {/* Add a drag handle area */}
            <div
                {...listeners}
                style={{
                    cursor: 'grab',
                    padding: '2px 8px',
                    backgroundColor: 'rgba(0,0,0,0.05)',
                    borderBottom: '1px solid rgba(0,0,0,0.1)',
                    fontSize: '10px',
                    color: '#666',
                    textAlign: 'center'
                }}
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