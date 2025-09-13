// src/components/employee/EmployeeClientColumn.tsx
import type { ClientWithTasksAndStats } from '../../queries/dashboardQueries';
import SortableEmployeeClientCard from './SortableEmployeeClientCard';
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
        overflow: 'visible', // Allow cards to expand beyond boundaries
        isolation: 'isolate', // Create new stacking context
      }}
    >

      <div 
        className="clients-list"
        style={{
          position: 'relative',
          overflow: 'visible', // Allow expansion
        }}
      >
        {clients.length > 0 ? (
          <SortableContext 
            items={clients.map(c => `employee-${c.client.id}`)}
            strategy={verticalListSortingStrategy}
          >
            {clients.map((clientData) => (
              <SortableEmployeeClientCard
                key={`employee-${clientData.client.id}`}
                clientData={clientData}
                alternatingColors={alternatingColors}
              />
            ))}
          </SortableContext>
        ) : (
          <div className="text-center py-4 text-muted">
            <small>لا توجد مهام نشطة</small>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeClientColumn;