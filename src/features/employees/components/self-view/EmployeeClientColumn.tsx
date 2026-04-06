// src/components/employee/EmployeeClientColumn.tsx
import type { ClientWithTasksAndStats } from '@/features/dashboard/api/dashboardQueries';
import { SortableBaseClientCard } from '@/shared/client-card';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

interface EmployeeClientColumnProps {
  clients: ClientWithTasksAndStats[];
  title?: string;
}

const EmployeeClientColumn = ({ clients }: EmployeeClientColumnProps) => {
  return (
    <div className="employee-client-column relative overflow-visible isolate">
      <div className="clients-list relative overflow-visible">
        {clients.length > 0 ? (
          <SortableContext
            items={clients.map(c => `employee-${c.client.id}`)}
            strategy={verticalListSortingStrategy}
          >
            {clients.map((clientData) => (
              <SortableBaseClientCard
                key={`employee-${clientData.client.id}`}
                data={clientData}
                role="employee"
                context="employee-dashboard"
                sortableId={`employee-${clientData.client.id}`}
                showAmount={true}
              />
            ))}
          </SortableContext>
        ) : (
          <div className="text-center py-4 text-text-muted">
            <small>لا توجد مهام نشطة</small>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeClientColumn;