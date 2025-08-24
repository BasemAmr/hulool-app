import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useGetDashboardStats, useGetClientsWithActiveTasks, type GroupedClientsResponse, type ClientWithTasksAndStats } from '../queries/dashboardQueries';
import { FileText, BookOpen, Home, Briefcase } from 'lucide-react';
import { applyPageBackground } from '../utils/backgroundUtils';

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

import TaskStatusCards from '../components/dashboard/TaskStatusCards';
import DashboardClientCard from '../components/dashboard/DashboardClientCard';
import SortableClientCard from '../components/dashboard/SortableClientCard';
import { useUpdateClientSortOrder } from '../queries/clientQueries';

const DashboardPage = () => {
    const { t } = useTranslation();
    const { data: stats, isLoading: isLoadingStats } = useGetDashboardStats();
    const [groupedClients, setGroupedClients] = useState<GroupedClientsResponse | null>(null);
    const [activeDragItem, setActiveDragItem] = useState<ClientWithTasksAndStats | null>(null);
    const [activeContainer, setActiveContainer] = useState<keyof GroupedClientsResponse | null>(null);

    const updateSortOrderMutation = useUpdateClientSortOrder();

    const { data: initialGroupedClients, isLoading: isLoadingClients } = useGetClientsWithActiveTasks();

    useEffect(() => {
        applyPageBackground('dashboard');
    }, []);

    useEffect(() => {
        if (initialGroupedClients) {
            setGroupedClients(initialGroupedClients);
        }
    }, [initialGroupedClients]);

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
            color: '#007bff',
            displayName: 'حكومية',
            alternatingColors: ['#e3f2fd', '#bbdefb']
        },
        Accounting: {
            icon: <BookOpen size={20} />,
            color: '#ffc107',
            displayName: 'محاسبية',
            alternatingColors: ['#fff8e1', '#ffecb3']
        },
        'Real Estate': {
            icon: <Home size={20} />,
            color: '#28a745',
            displayName: 'عقارية',
            alternatingColors: ['#e8f5e8', '#c8e6c9']
        },
        Other: {
            icon: <Briefcase size={20} />,
            color: '#6c757d',
            displayName: 'أخرى',
            alternatingColors: ['#f8f9fa', '#e9ecef']
        }
    };

    const columnTypes: (keyof typeof taskTypeConfig)[] = ['Government', 'Accounting', 'Real Estate', 'Other'];

    // const findClientDataById = (id: string | number): { clientData: ClientWithTasksAndStats, type: keyof GroupedClientsResponse } | null => {
    //     if (!groupedClients) return null;
    //     const clientId = id.toString();
        
    //     for (const type in groupedClients) {
    //         const key = type as keyof GroupedClientsResponse;
    //         const client = groupedClients[key].find(c => c.client.id.toString() === clientId);
    //         if (client) {
    //             return { clientData: client, type: key };
    //         }
    //     }
    //     return null;
    // };

    function handleDragStart(event: DragStartEvent) {
        const { active } = event;
        // console.log('Drag started for:', active.id);
        
        // Parse the composite ID (format: "containerType-clientId")
        const [containerType, clientId] = active.id.toString().split('-');
        const container = containerType as keyof GroupedClientsResponse;
        
        // console.log('Container:', container, 'ClientId:', clientId);
        
        if (groupedClients && container && clientId) {
            const clientData = groupedClients[container].find(c => c.client.id.toString() === clientId);
            if (clientData) {
                setActiveDragItem(clientData);
                setActiveContainer(container);
                // console.log('Found client data:', clientData.client.name, 'in container:', container);
            }
        }
    }

    function handleDragEnd(event: DragEndEvent) {
        // console.log('Drag ended');
        
        const { active, over } = event;

        if (!active || !over || active.id === over.id) {
            // console.log('No valid drop target or same position');
            setActiveDragItem(null);
            setActiveContainer(null);
            return;
        }

        // console.log('Active:', active.id, 'Over:', over.id);

        if (!groupedClients || !activeContainer) {
            // console.log('Missing groupedClients or activeContainer');
            setActiveDragItem(null);
            setActiveContainer(null);
            return;
        }

        // Parse the composite IDs
        const [activeContainerType, activeClientId] = active.id.toString().split('-');
        const [overContainerType, overClientId] = over.id.toString().split('-');
        
        // Only allow reordering within the same container
        if (activeContainerType !== overContainerType) {
            // console.log('Cross-container drag not supported');
            setActiveDragItem(null);
            setActiveContainer(null);
            return;
        }

        const containerItems = groupedClients[activeContainer];
        const oldIndex = containerItems.findIndex(c => c.client.id.toString() === activeClientId);
        const newIndex = containerItems.findIndex(c => c.client.id.toString() === overClientId);

        // console.log('Old index:', oldIndex, 'New index:', newIndex);

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
                return typeof id === 'string' ? parseInt(id) : id;
            });
            const typeForApi = activeContainer === 'Real Estate' ? 'RealEstate' : activeContainer;
            
            // console.log('Making API call with:', { taskType: typeForApi, clientIds });
            
            updateSortOrderMutation.mutate(
                { taskType: typeForApi, clientIds },
                {
                    onSuccess: () => {
                        // console.log('Sort order updated successfully');
                    },
                    onError: (error) => {
                        console.error('Failed to update sort order:', error);
                        // Revert optimistic update
                        if (initialGroupedClients) {
                            setGroupedClients(initialGroupedClients);
                        }
                    }
                }
            );
        }

        // Reset states at the end
        setActiveDragItem(null);
        setActiveContainer(null);
    }

    return (
        <div className="dashboard-page">
            <div className="task-status-cards mb-4">
                <TaskStatusCards
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
            </div>

            {isLoadingClients && (
                <div className="d-flex justify-content-center py-5">
                    <div className="loading-spinner size-lg"></div>
                </div>
            )}

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                {!isLoadingClients && groupedClients && (
                    <div className="recent-tasks-section">
                        <div className="row g-0">
                            {columnTypes.map((type) => {
                                const clients = groupedClients[type] || [];
                                const config = taskTypeConfig[type];

                                return (
                                    <div className="col-lg-3" key={type}>
                                        <div
                                            className="card"
                                            style={{
                                                borderRadius: '0',
                                                border: '1px solid #dee2e6',
                                                borderRight: type === 'Other' ? '1px solid #dee2e6' : 'none',
                                                height: 'calc(100vh - 250px)',
                                                display: 'flex',
                                                flexDirection: 'column'
                                            }}
                                        >
                                            {/* Fixed Header */}
                                            <div
                                                className="card-header text-white d-flex justify-content-center align-items-center py-2 border-bottom"
                                                style={{
                                                    background: config.color,
                                                    color: type === 'Accounting' ? '#333' : '#fff',
                                                    borderBottom: '1px solid #dee2e6',
                                                    flexShrink: 0
                                                }}
                                            >
                                                <div className="d-flex justify-content-center align-items-center font-weight-bold">
                                                    <span style={{ color: '#000' }}>
                                                        {config.icon}
                                                    </span>
                                                    <Link
                                                        to={`/tasks?type=${type}`}
                                                        className="text-decoration-none ms-2 text-center"
                                                        style={{ color: '#000' }}
                                                    >
                                                        <h6 className="mb-0 fw-medium text-center">
                                                            خدمات {config.displayName}
                                                        </h6>
                                                    </Link>
                                                </div>
                                                <span className="badge bg-white text-primary rounded-pill px-2 py-1 text-black">
                                                    {clients.length}
                                                </span>
                                            </div>

                                            {/* Scrollable Card Body */}
                                            <div
                                                className="card-body p-0"
                                                style={{
                                                    minHeight: clients.length === 0 ? '200px' : 'auto',
                                                    maxHeight: 'calc(100vh - 350px)',
                                                    overflowY: 'auto',
                                                    overflowX: 'hidden',
                                                    flex: 1
                                                }}
                                            >
                                                {clients.length > 0 ? (
                                                    <SortableContext 
                                                        items={clients.map(c => `${type}-${c.client.id}`)}
                                                        strategy={verticalListSortingStrategy}
                                                    >
                                                        {clients.map((clientData, index) => (
                                                            <div key={`${type}-${clientData.client.id}`}>
                                                                <SortableClientCard
                                                                    clientData={clientData}
                                                                    containerType={type}
                                                                    alternatingColors={config.alternatingColors}
                                                                />
                                                                {index < clients.length - 1 && (
                                                                    <hr className="m-0" style={{ borderColor: '#dee2e6', pointerEvents: 'none' }} />
                                                                )}
                                                            </div>
                                                        ))}
                                                    </SortableContext>
                                                ) : (
                                                    <div className="empty-state py-5 text-center">
                                                        <div className="empty-icon mb-3">
                                                            <i className="fas fa-clipboard-list fa-3x text-gray-400"></i>
                                                        </div>
                                                        <p className="empty-description text-muted mb-0">
                                                            {t('common.noResults')}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Fixed Footer */}
                                            <div
                                                className="card-footer py-2 border-top"
                                                style={{
                                                    flexShrink: 0,
                                                    backgroundColor: config.color
                                                }}
                                            >
                                                <Link
                                                    to={`/tasks?type=${type}`}
                                                    className="btn btn-sm w-100 fw-medium text-white"
                                                    style={{
                                                        backgroundColor: 'transparent',
                                                        border: '1px solid rgba(255,255,255,0.3)',
                                                        color: type === 'Accounting' ? '#333' : '#fff'
                                                    }}
                                                >
                                                    عرض المزيد
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <DragOverlay
                    style={{
                        transformOrigin: 'top left',
                        width: 'auto'
                    }}
                >
                    {activeDragItem ? (
                        <div style={{ 
                            width: '300px', // Fixed width for drag overlay
                            opacity: 0.9,
                            transform: 'rotate(5deg)' // Slight rotation for visual feedback
                        }}>
                            <DashboardClientCard
                                data={activeDragItem}
                                alternatingColors={['#fff', '#f1f1f1']}
                            />
                        </div>
                    ) : null}
                </DragOverlay>

            </DndContext>
        </div>
    );
};

export default DashboardPage;