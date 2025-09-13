// src/components/employee/RecentTasksPanel.tsx
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';

import type { EmployeeDashboardTask } from '../../queries/employeeDashboardQueries';
import EmployeeClientColumn from './EmployeeClientColumn';

import { 
  DndContext, 
  PointerSensor, 
  KeyboardSensor, 
  useSensor, 
  useSensors, 
  closestCenter, 
  type DragEndEvent
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { ClientWithTasksAndStats } from '../../queries/dashboardQueries';
import { useUpdateEmployeeSortOrder } from '../../queries/employeeDashboardQueries';

interface RecentTasksPanelProps {
  tasks: EmployeeDashboardTask[];
}

const RecentTasksPanel = ({ tasks }: RecentTasksPanelProps) => {
  const navigate = useNavigate();
  const updateSortOrderMutation = useUpdateEmployeeSortOrder();

  // Group tasks by client for EmployeeClientColumn
  const [clientTasksMap, setClientTasksMap] = useState<ClientWithTasksAndStats[]>([]);

  useMemo(() => {
    const map = new Map();
    tasks.forEach(task => {
      const clientId = task.client.id;
      if (!map.has(clientId)) {
        map.set(clientId, {
          client: task.client,
          tasks: []
        });
      }
      map.get(clientId).tasks.push(task);
    });
    const newClientTasksMap = Array.from(map.values());
    setClientTasksMap(newClientTasksMap);
  }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!active || !over || active.id === over.id) {
      return;
    }

    // Parse the composite IDs (format: "employee-clientId")
    const [activePrefix, activeClientId] = active.id.toString().split('-');
    const [overPrefix, overClientId] = over.id.toString().split('-');

    if (activePrefix !== 'employee' || overPrefix !== 'employee') {
      return;
    }

    const oldIndex = clientTasksMap.findIndex(c => c.client.id.toString() === activeClientId);
    const newIndex = clientTasksMap.findIndex(c => c.client.id.toString() === overClientId);

    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      const reorderedItems = arrayMove(clientTasksMap, oldIndex, newIndex);

      // Optimistic UI Update
      setClientTasksMap(reorderedItems);

      // Persist to backend
      const clientIds = reorderedItems.map(c => {
        const id = c.client.id;
        return typeof id === 'string' ? parseInt(id) : id;
      });

      updateSortOrderMutation.mutate(
        { clientIds },
        {
          onSuccess: () => {
            console.log('Employee sort order updated successfully');
          },
          onError: (error) => {
            console.error('Failed to update employee sort order:', error);
            // Revert optimistic update
            const originalMap = new Map();
            tasks.forEach(task => {
              const clientId = task.client.id;
              if (!originalMap.has(clientId)) {
                originalMap.set(clientId, {
                  client: task.client,
                  tasks: []
                });
              }
              originalMap.get(clientId).tasks.push(task);
            });
            setClientTasksMap(Array.from(originalMap.values()));
          }
        }
      );
    }
  };

  return (
    <div
      className="card h-100 shadow-sm"
      style={{
        borderRadius: 'var(--border-radius)',
        border: '1px solid var(--color-gray-100)',
        overflow: 'visible',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1
      }}
    >
      {/* Header */}
      <div
        className="card-header border-0 py-2"
        style={{
          backgroundColor: '#007bff',
          color: '#fff',
          flexShrink: 0
        }}
      >
        <div className="d-flex justify-content-center align-items-center">
          <h6 className="mb-0 fw-bold text-white" style={{ fontSize: 'var(--font-size-base)' }}>
            المهام قيد التنفيذ
          </h6>
        </div>
      </div>

      {/* Body - Client Cards */}
      <div className="card-body p-0" style={{
        flex: 1,
        position: 'relative',
        overflow: 'visible'
      }}>
        <DndContext
          onDragEnd={handleDragEnd}
          sensors={sensors}
          collisionDetection={closestCenter}
        >
          <EmployeeClientColumn
            clients={clientTasksMap}
          />
        </DndContext>
      </div>

      {/* Footer - Show More Button */}
      <div
        className="card-footer bg-light border-0 py-2"
        style={{ flexShrink: 0, textAlign: 'center' }}
      >
        <button
          onClick={() => navigate('/employee/tasks')}
          className="btn btn-link text-primary p-0 d-flex align-items-center justify-content-center gap-1 w-100"
          style={{ fontSize: 'var(--font-size-sm)' }}
        >
          <MoreHorizontal size={16} />
          <span>عرض جميع المهام</span>
        </button>
      </div>
    </div>
  );
};

export default RecentTasksPanel;
