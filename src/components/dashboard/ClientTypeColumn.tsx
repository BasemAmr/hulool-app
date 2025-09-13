// src/components/dashboard/ClientTypeColumn.tsx
import { useState, useCallback } from 'react';
import type { ClientWithTasksAndStats } from '../../queries/dashboardQueries';

import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableClientCard from './SortableClientCard'; // <-- Import the new wrapper

interface ClientTypeColumnProps {
  type: 'Government' | 'Accounting' | 'Real Estate' | 'Other';
  clients: ClientWithTasksAndStats[];
}

const ClientTypeColumn = ({ type, clients }: ClientTypeColumnProps) => {
  // State for managing hovered card to allow advanced effects
  const [hoveredCardId, setHoveredCardId] = useState<number | null>(null);

  const handleCardHover = useCallback((cardId: number | null) => {
    setHoveredCardId(cardId);
  }, []);

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
    <div 
      className="client-type-column"
      style={{
        position: 'relative',
        overflow: 'visible', // Allow cards to expand beyond boundaries
        isolation: 'isolate', // Create new stacking context
      }}
    >
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
        <div 
          className="clients-list"
          style={{
            position: 'relative',
            overflow: 'visible', // Allow expansion
          }}
        >
          {clients.length > 0 ? (
            clients.map((clientData) => (
              // Enhanced wrapper with smart positioning for pop-out effects
              <div 
                key={clientData.client.id} 
                className="mb-3"
                style={{
                  position: 'relative',
                  zIndex: hoveredCardId === clientData.client.id ? 1000 : 1,
                  transition: 'z-index 0.2s ease',
                }}
                onMouseEnter={() => handleCardHover(clientData.client.id)}
                onMouseLeave={() => handleCardHover(null)}
              >
                <div
                  style={{
                    transform: hoveredCardId === clientData.client.id 
                      ? 'scale(1.08) translateX(-8%)' // Scale + slight left shift for dramatic effect
                      : 'scale(1) translateX(0)',
                    transformOrigin: 'center center',
                    transition: 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                    width: hoveredCardId === clientData.client.id ? '115%' : '100%',
                    filter: hoveredCardId === clientData.client.id 
                      ? 'drop-shadow(0 15px 35px rgba(0,0,0,0.2))' 
                      : 'none',
                    position: 'relative',
                    backfaceVisibility: 'hidden', // Performance optimization
                    willChange: 'transform, filter, width', // GPU acceleration hint
                  }}
                >
                  <SortableClientCard
                    clientData={clientData}
                    containerType={type}
                    alternatingColors={alternatingColors}
                  />
                </div>
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
