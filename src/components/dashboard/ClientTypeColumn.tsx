// src/components/dashboard/ClientTypeColumn.tsx
import DashboardClientCard from './DashboardClientCard';
import type { ClientWithTasksAndStats } from '../../queries/dashboardQueries';

interface ClientTypeColumnProps {
  type: 'Government' | 'Accounting' | 'Real Estate' | 'Other';
  clients: ClientWithTasksAndStats[];
}

const ClientTypeColumn = ({ type, clients }: ClientTypeColumnProps) => {
  const getTypeTitle = (type: string) => {
    const typeMap = {
      'Government': 'Government',
      'Accounting': 'Accounting', 
      'Real Estate': 'Real Estate',
      'Other': 'Other'
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

  if (clients.length === 0) {
    return null;
  }

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
      
      <div className="clients-list">
        {clients.map(clientData => (
          <div key={clientData.client.id} className="mb-3">
            <DashboardClientCard data={clientData} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClientTypeColumn;
