import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  useGetDashboardStats, 
  useGetClientsWithActiveTasks, 
  type GroupedClientsResponse, 
  type ClientWithTasksAndStats
} from '@/features/dashboard/api/dashboardQueries';
import { useModalStore } from '@/shared/stores/modalStore';
import type { Task } from '@/api/types';
import { FileText, BookOpen, Home } from 'lucide-react';
import { applyPageBackground } from '@/shared/utils/backgroundUtils';

import { 
  DndContext, 
  PointerSensor, 
  KeyboardSensor, 
  useSensor, 
  useSensors, 
  closestCenter, 
  type DragEndEvent, 
  DragOverlay,
  type DragStartEvent
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

import CollapsibleTaskStatusCards from '../components/CollapsibleTaskStatusCards';
import { useUpdateClientSortOrder } from '@/features/clients/api/clientQueries';

// New unified components
import { 
  SortableBaseClientCard, 
  AdminDashboardClientCard,
  CardColumnContainer 
} from '@/shared/client-card';

const DashboardPage = () => {
    const { t } = useTranslation();
    const openModal = useModalStore(state => state.openModal);
    const { data: stats, isLoading: isLoadingStats } = useGetDashboardStats();
    const [groupedClients, setGroupedClients] = useState<GroupedClientsResponse | null>(null);
    const [activeDragItem, setActiveDragItem] = useState<ClientWithTasksAndStats | null>(null);
    const [activeContainer, setActiveContainer] = useState<keyof GroupedClientsResponse | null>(null);

    const updateSortOrderMutation = useUpdateClientSortOrder();

    const handleAssignTask = (task: Task): void => {
        openModal('assignTask', { task });
    };

    const { data: initialData, isLoading: isLoadingClients } = useGetClientsWithActiveTasks('admin');

    useEffect(() => {
        applyPageBackground('dashboard');
    }, []);

    useEffect((): void => {
        if (initialData) {
            if (!Array.isArray(initialData)) {
                setGroupedClients(initialData as GroupedClientsResponse);
            }
        }
    }, [initialData]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const taskTypeConfig = {
        Government: {
            icon: <FileText size={20} />,
            displayName: 'حكومية',
            accentColor: 'var(--token-status-info-text)',
        },
        Accounting: {
            icon: <BookOpen size={20} />,
            displayName: 'محاسبية',
            accentColor: 'var(--token-status-warning-text)',
        },
        'Real Estate': {
            icon: <Home size={20} />,
            displayName: 'عقارية',
            accentColor: 'var(--token-status-success-text)',
        }
    };

    const columnTypes = ['Government', 'Accounting', 'Real Estate'] as const;

    function handleDragStart(event: DragStartEvent): void {
        const { active } = event;
        
        // Parse the composite ID (format: "containerType-clientId")
        const [containerType, clientId] = active.id.toString().split('-');
        const container = containerType as keyof GroupedClientsResponse;
        
        if (groupedClients && container && clientId) {
            const clientData = groupedClients[container].find(c => c.client.id.toString() === clientId);
            if (clientData) {
                setActiveDragItem(clientData);
                setActiveContainer(container);
            }
        }
    }

    function handleDragEnd(event: DragEndEvent): void {
        const { active, over } = event;

        if (!active || !over || active.id === over.id) {
            setActiveDragItem(null);
            setActiveContainer(null);
            return;
        }

        if (!groupedClients || !activeContainer) {
            setActiveDragItem(null);
            setActiveContainer(null);
            return;
        }

        // Parse the composite IDs
        const [activeContainerType, activeClientId] = active.id.toString().split('-');
        const [overContainerType, overClientId] = over.id.toString().split('-');
        
        // Only allow reordering within the same container
        if (activeContainerType !== overContainerType) {
            setActiveDragItem(null);
            setActiveContainer(null);
            return;
        }

        const containerItems = groupedClients[activeContainer];
        const oldIndex = containerItems.findIndex(c => c.client.id.toString() === activeClientId);
        const newIndex = containerItems.findIndex(c => c.client.id.toString() === overClientId);

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
            const reorderedItems = arrayMove(containerItems, oldIndex, newIndex);

            // Optimistic UI Update
            setGroupedClients(prev => {
                if (!prev) return null;
                return { 
                    ...prev, 
                    [activeContainer]: reorderedItems 
                };
            });

            // Persist to backend
            const clientIds = reorderedItems.map(c => {
                const id = c.client.id;
                return typeof id === 'string' ? parseInt(id, 10) : id;
            });
            const typeForApi = activeContainer === 'Real Estate' ? 'RealEstate' : activeContainer;
            
            updateSortOrderMutation.mutate(
                { taskType: typeForApi, clientIds },
                {
                    onSuccess: () => {
                        // Sort order updated successfully
                    },
                    onError: (error) => {
                        console.error('Failed to update sort order:', error);
                    }
                }
            );
        }

        // Reset states at the end
        setActiveDragItem(null);
        setActiveContainer(null);
    }

    return (
        <div className="relative pb-[20px]">
            {/* Collapsible Task Status Cards - Fixed at Bottom */}
            <CollapsibleTaskStatusCards
                stats={stats || {
                    new_tasks: 0,
                    deferred_tasks: 0,
                    completed_tasks: 0,
                    late_tasks: 0,
                    late_receivables: 0,
                    total_unpaid_amount: 0
                }}
                totalPaidAmount={stats?.total_paid_amount || 0}
                isLoading={isLoadingStats}
            />

            {isLoadingClients && (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            )}

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                {!isLoadingClients && groupedClients && (
                    // *** MANAGEMENT VIEW - 3 Task Type Columns ***
                    <div className="min-h-[calc(100vh-200px)] overflow-visible relative z-[1]">
                        <div className="overflow-visible relative z-[1]">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 overflow-visible relative z-[1]">
                                {columnTypes.map((type, columnIndex) => {
                                const clients = groupedClients[type] || [];
                                const config = taskTypeConfig[type];

                                return (
                                    <div 
                                        className="p-1 overflow-visible relative" 
                                        key={type} 
                                        style={{ zIndex: 10 - columnIndex }}
                                    >
                                        <CardColumnContainer
                                            title={`خدمات ${config.displayName}`}
                                            icon={config.icon}
                                            accentColor={config.accentColor}
                                            itemCount={clients.length}
                                            moreLink={`/tasks?type=${type}`}
                                            isEmpty={clients.length === 0}
                                            emptyMessage={t('common.noResults')}
                                        >
                                            {clients.length > 0 && (
                                                <SortableContext 
                                                    items={clients.map(c => `${type}-${c.client.id}`)}
                                                    strategy={verticalListSortingStrategy}
                                                >
                                                    {clients.map((clientData) => (
                                                        <SortableBaseClientCard
                                                            key={`${type}-${clientData.client.id}`}
                                                            data={clientData}
                                                            role="admin"
                                                            context="admin-dashboard"
                                                            sortableId={`${type}-${clientData.client.id}`}
                                                            onAssign={handleAssignTask}
                                                            showAmount={true}
                                                            showEmployeePrefix={true}
                                                        />
                                                    ))}
                                                </SortableContext>
                                            )}
                                        </CardColumnContainer>
                                    </div>
                                );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {!isLoadingClients && !groupedClients && (
                    <div className="py-12 text-center">
                        <div className="mb-3">
                            <i className="fas fa-clipboard-list fa-3x text-text-muted"></i>
                        </div>
                        <p className="text-text-secondary mb-0">
                            {t('common.noResults')}
                        </p>
                    </div>
                )}

                <DragOverlay
                    style={{
                        transformOrigin: 'top left',
                        width: 'auto'
                    }}
                >
                    {activeDragItem ? (
                        <div 
                            className="w-[300px] opacity-90"
                            style={{ transform: 'rotate(5deg)' }}
                        >
                            <AdminDashboardClientCard
                                data={activeDragItem}
                            />
                        </div>
                    ) : null}
                </DragOverlay>

            </DndContext>
        </div>
    );
};

export default DashboardPage;
