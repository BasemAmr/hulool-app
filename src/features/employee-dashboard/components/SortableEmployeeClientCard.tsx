import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import EmployeeDashboardClientCard from '@/shared/client-card/wrappers/EmployeeDashboardClientCard';
import { FloatingCardWrapper } from '@/shared/ui/layout/FloatingCardWrapper';
import type { ClientWithTasksAndStats } from '@/features/dashboard/api/dashboardQueries';
import { useState } from 'react';

interface SortableEmployeeClientCardProps {
    clientData: ClientWithTasksAndStats;
}

const SortableEmployeeClientCard = ({ clientData }: SortableEmployeeClientCardProps) => {
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
                className="cursor-grab px-2 py-0.5 bg-background border-b border-border-default text-[10px] text-text-primary text-center select-none"
            >
                ⋮⋮ اسحب لإعادة الترتيب
            </div>

            <FloatingCardWrapper dynamicWidth={dynamicWidth}>
                <EmployeeDashboardClientCard
                    data={clientData}
                    onWidthCalculated={setDynamicWidth}
                />
            </FloatingCardWrapper>
        </div>
    );
};

export default SortableEmployeeClientCard;
