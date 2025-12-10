// src/components/employee/EmployeeClientColumn.tsx
import type { ClientWithTasksAndStats } from '../../queries/dashboardQueries';
import { SortableBaseClientCard } from '../common/BaseClientCard';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

interface EmployeeClientColumnProps {
  clients: ClientWithTasksAndStats[];
  title?: string;
}

const EmployeeClientColumn = ({ clients }: EmployeeClientColumnProps) => {

  // Define alternating colors for cards - Blue theme
  const alternatingColors = ['#e3f2fd', '#bbdefb'];

  return (
    <div 
      className="employee-client-column"
      style={{
        position: 'relative',
        overflow: 'visible',
        isolation: 'isolate',
      }}
    >

      <div 
        className="clients-list"
        style={{
          position: 'relative',
          overflow: 'visible',
        }}
      >
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
                alternatingColors={alternatingColors}
                showAmount={true}
              />
            ))}
          </SortableContext>
        ) : (
          <div className="text-center py-4 text-black">
            <small>لا توجد مهام نشطة</small>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeClientColumn;