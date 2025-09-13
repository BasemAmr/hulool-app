import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import EmployeeDashboardClientCard from './EmployeeDashboardClientCard';
import { FloatingCardWrapper } from '../common/FloatingCardWrapper';
import type { ClientWithTasksAndStats } from '../../queries/dashboardQueries';
import { useState } from 'react';

interface SortableEmployeeClientCardProps {
    clientData: ClientWithTasksAndStats;
    alternatingColors: string[];
}

const SortableEmployeeClientCard = ({ clientData, alternatingColors }: SortableEmployeeClientCardProps) => {
    const [dynamicWidth, setDynamicWidth] = useState<string | undefined>(undefined);
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: `employee-${clientData.client.id}`
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            className="sortable-employee-client-card"
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

            <FloatingCardWrapper dynamicWidth={dynamicWidth}>
                <EmployeeDashboardClientCard
                    data={clientData}
                    alternatingColors={alternatingColors}
                    onWidthCalculated={setDynamicWidth}
                />
            </FloatingCardWrapper>
        </div>
    );
};

export default SortableEmployeeClientCard;
