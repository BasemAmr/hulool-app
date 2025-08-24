// src/components/dashboard/ClientTypeColumn.tsx
import type { ClientWithTasksAndStats } from '../../queries/dashboardQueries';

import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableClientCard from './SortableClientCard'; // <-- Import the new wrapper

interface ClientTypeColumnProps {
  type: 'Government' | 'Accounting' | 'Real Estate' | 'Other';
  clients: ClientWithTasksAndStats[];
}

const ClientTypeColumn = ({ type, clients }: ClientTypeColumnProps) => {
  const getTypeTitle = (type: string) => {
    const typeMap = {
      'Government': 'حكومي',
      'Accounting': 'محاسبي',
      'Real Estate': 'عقاري',
      'Other': 'أخرى'
    };
    return typeMap[type as keyof typeof typeMap] || type;
  };

  const getTypeColor = (type: string) => {
    const colorMap = {
      'Government': 'var(--color-primary)',
      'Accounting': 'var(--color-success)',
      'Real Estate': 'var(--color-warning)',
      'Other': 'var(--color-info)'
    };
    return colorMap[type as keyof typeof colorMap] || 'var(--color-gray-500)';
  };

  // Define alternating colors for cards
  const alternatingColors = ['#f8f9fa', '#e9ecef'];

  // CRITICAL: Create an array of just the client IDs.
  const clientIds = clients.map(c => c.client.id);

  return (
    <div className="client-type-column">
      <div
        className="type-header mb-3 p-3 rounded-3"
        style={{
          backgroundColor: `${getTypeColor(type)}20`,
          borderLeft: `4px solid ${getTypeColor(type)}`
        }}
      >
        <h5 className="mb-0 fw-bold" style={{ color: getTypeColor(type) }}>
          {getTypeTitle(type)} ({clients.length})
        </h5>
      </div>

      {/* CRITICAL: Wrap the list in SortableContext */}
      <SortableContext items={clientIds} strategy={verticalListSortingStrategy}>
        <div className="clients-list">
          {clients.length > 0 ? (
            clients.map((clientData) => (
              // Ensure a stable, unique key
              <div key={clientData.client.id} className="mb-3">
                <SortableClientCard
                  clientData={clientData}
                  containerType={type}
                  alternatingColors={alternatingColors}
                />
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-muted">
              <small>لا توجد مهام نشطة</small>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
};

export default ClientTypeColumn;
