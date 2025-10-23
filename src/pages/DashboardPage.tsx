import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { 
  useGetDashboardStats, 
  useGetClientsWithActiveTasks, 
  type GroupedClientsResponse, 
  type ClientWithTasksAndStats, 
  type EmployeeTasksGrouped 
} from '../queries/dashboardQueries';
import { useModalStore } from '../stores/modalStore';
import type { Task } from '../api/types';
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

import CollapsibleTaskStatusCards from '../components/dashboard/CollapsibleTaskStatusCards';
import DashboardClientCard from '../components/dashboard/DashboardClientCard';
import SortableClientCard from '../components/dashboard/SortableClientCard';
import DashboardTaskTypeFilter from '../components/dashboard/DashboardTaskTypeFilter';
import EmployeeTasksColumn from '../components/dashboard/EmployeeTasksColumn';
import { useUpdateClientSortOrder } from '../queries/clientQueries';

const DashboardPage = () => {
    const { t } = useTranslation();
    const openModal = useModalStore(state => state.openModal);
    const { data: stats, isLoading: isLoadingStats } = useGetDashboardStats();
    const [groupedClients, setGroupedClients] = useState<GroupedClientsResponse | null>(null);
    const [employeeTasksGrouped, setEmployeeTasksGrouped] = useState<EmployeeTasksGrouped[] | null>(null);
    const [activeDragItem, setActiveDragItem] = useState<ClientWithTasksAndStats | null>(null);
    const [activeContainer, setActiveContainer] = useState<keyof GroupedClientsResponse | null>(null);
    const [taskTypeFilter, setTaskTypeFilter] = useState<'employee' | 'admin'>('admin');

    const updateSortOrderMutation = useUpdateClientSortOrder();

    const handleAssignTask = (task: Task): void => {
        openModal('assignTask', { task });
    };

    const { data: initialData, isLoading: isLoadingClients } = useGetClientsWithActiveTasks(taskTypeFilter);

    useEffect(() => {
        applyPageBackground('dashboard');
    }, []);

    useEffect((): void => {
        if (initialData) {
            // Check if it's employee data (array) or admin data (object with keys)
            if (Array.isArray(initialData)) {
                setEmployeeTasksGrouped(initialData as EmployeeTasksGrouped[]);
                setGroupedClients(null);
            } else {
                setGroupedClients(initialData as GroupedClientsResponse);
                setEmployeeTasksGrouped(null);
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

    function handleDragStart(event: DragStartEvent): void {
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

    function handleDragEnd(event: DragEndEvent): void {
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
                return typeof id === 'string' ? parseInt(id, 10) : id;
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
                        // Revert optimistic update - refresh data from server
                        // Handled by React Query's automatic refetch
                    }
                }
            );
        }

        // Reset states at the end
        setActiveDragItem(null);
        setActiveContainer(null);
    }

    return (
        <div className="dashboard-page" style={{ position: 'relative', paddingBottom: '200px' }}>
            {/* Task Type Filter - Floating Component */}
            <DashboardTaskTypeFilter 
                value={taskTypeFilter}
                onChange={setTaskTypeFilter}
            />

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
                {!isLoadingClients && taskTypeFilter === 'admin' && groupedClients && (
                    // *** ADMIN VIEW - Task Type Columns ***
                    <div className="dashboard-columns-container" style={{ minHeight: 'calc(100vh - 200px)', overflow: 'visible', position: 'relative', zIndex: 1 }}>
                        <div className="recent-tasks-section" style={{ overflow: 'visible', position: 'relative', zIndex: 1 }}>
                            <div className="row g-0" style={{ overflow: 'visible', position: 'relative', zIndex: 1 }}>
                                {columnTypes.map((type, columnIndex) => {
                                const clients = groupedClients[type] || [];
                                const config = taskTypeConfig[type];

                                return (
                                    <div className="col-lg-3 p-2" key={type} style={{
                                        overflow: 'visible',
                                        position: 'relative',
                                        zIndex: 10 - columnIndex, // Higher z-index for leftmost columns
                                        isolation: 'auto' // Don't create new stacking context
                                    }}>
                                        <div
                                            className="card"
                                            style={{
                                                borderRadius: '0',
                                                border: '1px solid #dee2e6',
                                                borderRight: type === 'Other' ? '1px solid #dee2e6' : 'none',
                                                minHeight: '400px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                overflow: 'visible',
                                                position: 'relative'
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
                                                    overflowY: 'visible',
                                                    overflowX: 'visible',
                                                    flex: 1,
                                                    zIndex: 0
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
                                                                    onAssign={handleAssignTask}
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
                    </div>
                )}

                {!isLoadingClients && taskTypeFilter === 'employee' && employeeTasksGrouped && (
                    // *** EMPLOYEE VIEW - Employee Task Columns ***
                    <div className="employee-dashboard-container" style={{ 
                        overflow: 'visible', 
                        position: 'relative', 
                        zIndex: 1,
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <div className="employee-tasks-section" style={{ 
                            overflow: 'visible', 
                            position: 'relative', 
                            zIndex: 1,
                            display: 'flex'
                        }}>
                            <div className="row g-3" style={{ 
                                overflow: 'visible', 
                                position: 'relative', 
                                zIndex: 1,
                                justifyContent: 'flex-start',
                                width: '100%',
                                margin: 0,
                                padding: 0,
                                flex: 1,
                                display: 'flex',
                                alignItems: 'flex-start',
                                perspective: '1000px'
                            }}>
                                {employeeTasksGrouped.map((employeeGroup, index) => {
                                    // Color rotation for different employees
                                    const colorIndex = index % Object.values(taskTypeConfig).length;
                                    const configArray = Object.values(taskTypeConfig);
                                    const currentConfig = configArray[colorIndex];

                                    // Count total clients for this employee
                                    const totalClients = Object.values(employeeGroup.grouped_clients).reduce(
                                        (sum, clients) => sum + clients.length, 
                                        0
                                    );

                                    // Calculate responsive width based on number of employees
                                    const getColumnWidth = () => {
                                        const count = employeeTasksGrouped.length;
                                        if (count === 1) return 'calc(60% - 0.72rem)';
                                        if (count === 2) return 'calc(45% - 0.72rem)';
                                        if (count === 3) return 'calc(30% - 0.72rem)';
                                        if (count === 4) return 'calc(23% - 0.72rem)';
                                        return 'calc(20% - 0.72rem)';
                                    };

                                    return (
                                        <div 
                                            className="col-lg-2-4" 
                                            key={`employee-${employeeGroup.employee_id}`} 
                                            style={{
                                                overflow: 'visible',
                                                position: 'relative',
                                                zIndex: 10 - index,
                                                isolation: 'auto',
                                                // Responsive columns layout
                                                flex: `0 0 ${getColumnWidth()}`,
                                                minWidth: 0,
                                                display: 'flex',
                                                perspective: '1000px'
                                            }}
                                        >
                                            <div
                                                className="card h-100 shadow-sm"
                                                style={{
                                                    borderRadius: '0px',
                                                    border: `3px solid ${currentConfig.color}`,
                                                    overflow: 'visible',
                                                    position: 'relative',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    transition: 'all 0.3s ease-in-out',
                                                    width: '100%'
                                                }}
                                            >
                                                {/* Header */}
                                                <div
                                                    className="card-header text-white d-flex justify-content-between align-items-center py-3 border-0"
                                                    style={{
                                                        backgroundColor: currentConfig.color,
                                                        borderRadius: 0,
                                                        flexShrink: 0
                                                    }}
                                                >
                                                    <div className="d-flex align-items-center gap-2" style={{ width: '100%', justifyContent: 'center' }}>
                                                        <Link
                                                            to={`/employees/${employeeGroup.employee_id}`}
                                                            className="text-decoration-none"
                                                            style={{ color: 'inherit' }}
                                                            title="عرض ملف الموظف"
                                                        >
                                                            <h6 className="mb-0 fw-bold text-white">
                                                                المهام - {employeeGroup.employee_name}
                                                            </h6>
                                                        </Link>
                                                        <span className="badge bg-white rounded-pill px-2 py-1" style={{ 
                                                            color: currentConfig.color,
                                                            fontWeight: 'bold',
                                                            fontSize: '0.85em'
                                                        }}>
                                                            {totalClients}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Body - Scrollable */}
                                                <div
                                                    className="card-body p-0"
                                                    style={{
                                                        overflow: 'visible',
                                                        backgroundColor: 'transparent',
                                                        zIndex: 0,
                                                        minHeight: 0,
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        isolation: 'auto'
                                                    }}
                                                >
                                                    <EmployeeTasksColumn
                                                        groupedByEmployee={[employeeGroup]}
                                                        onAssign={handleAssignTask}
                                                        alternatingColors={currentConfig.alternatingColors}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {!isLoadingClients && !groupedClients && !employeeTasksGrouped && (
                    <div className="empty-state py-5 text-center">
                        <div className="empty-icon mb-3">
                            <i className="fas fa-clipboard-list fa-3x text-gray-400"></i>
                        </div>
                        <p className="empty-description text-muted mb-0">
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