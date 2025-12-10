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
import DashboardTaskTypeFilter from '../components/dashboard/DashboardTaskTypeFilter';
import EmployeeTasksColumn from '../components/dashboard/EmployeeTasksColumn';
import { useUpdateClientSortOrder } from '../queries/clientQueries';

// New unified components
import { 
  SortableBaseClientCard, 
  AdminDashboardClientCard,
  CardColumnContainer 
} from '../components/common/BaseClientCard';

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
        <div className="relative pb-[200px]">
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
                {!isLoadingClients && taskTypeFilter === 'admin' && groupedClients && (
                    // *** ADMIN VIEW - Task Type Columns ***
                    <div className="min-h-[calc(100vh-200px)] overflow-visible relative z-[1]">
                        <div className="overflow-visible relative z-[1]">
                            <div className="grid grid-cols-1 lg:grid-cols-4 gap-0 overflow-visible relative z-[1]">
                                {columnTypes.map((type, columnIndex) => {
                                const clients = groupedClients[type] || [];
                                const config = taskTypeConfig[type];

                                return (
                                    <div 
                                        className="p-2 overflow-visible relative" 
                                        key={type} 
                                        style={{ zIndex: 10 - columnIndex }}
                                    >
                                        <CardColumnContainer
                                            title={`خدمات ${config.displayName}`}
                                            icon={config.icon}
                                            primaryColor={config.color}
                                            itemCount={clients.length}
                                            moreLink={`/tasks?type=${type}`}
                                            darkText={type === 'Accounting'}
                                            isEmpty={clients.length === 0}
                                            emptyMessage={t('common.noResults')}
                                            className={type === 'Other' ? '' : 'border-r-0'}
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
                                                            alternatingColors={config.alternatingColors}
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

                {!isLoadingClients && taskTypeFilter === 'employee' && employeeTasksGrouped && (
                    // *** EMPLOYEE VIEW - Employee Task Columns ***
                    <div className="overflow-visible relative z-[1] flex flex-col">
                        <div className="overflow-visible relative z-[1] flex">
                            <div 
                                className="flex gap-3 overflow-visible relative z-[1] justify-start w-full m-0 p-0 flex-1 items-start"
                                style={{ perspective: '1000px' }}
                            >
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
                                            key={`employee-${employeeGroup.employee_id}`} 
                                            className="overflow-visible relative flex"
                                            style={{
                                                zIndex: 10 - index,
                                                flex: `0 0 ${getColumnWidth()}`,
                                                minWidth: 0,
                                                perspective: '1000px'
                                            }}
                                        >
                                            <div
                                                className="h-full shadow-sm rounded-none overflow-visible relative flex flex-col transition-all duration-300 w-full"
                                                style={{
                                                    border: `3px solid ${currentConfig.color}`,
                                                }}
                                            >
                                                {/* Header */}
                                                <div
                                                    className="flex justify-between items-center py-3 border-0 rounded-none flex-shrink-0"
                                                    style={{ backgroundColor: currentConfig.color }}
                                                >
                                                    <div className="flex items-center gap-2 w-full justify-center">
                                                        <Link
                                                            to={`/employees/${employeeGroup.employee_id}`}
                                                            className="no-underline"
                                                            style={{ color: 'inherit' }}
                                                            title="عرض ملف الموظف"
                                                        >
                                                            <h6 className="mb-0 font-bold text-white">
                                                                المهام - {employeeGroup.employee_name}
                                                            </h6>
                                                        </Link>
                                                        <span 
                                                            className="bg-white rounded-full px-2 py-1 font-bold text-[0.85em]"
                                                            style={{ color: currentConfig.color }}
                                                        >
                                                            {totalClients}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Body - Scrollable */}
                                                <div
                                                    className="p-0 overflow-visible bg-transparent z-0 min-h-0 flex flex-col"
                                                    style={{ isolation: 'auto' }}
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
                    <div className="py-12 text-center">
                        <div className="mb-3">
                            <i className="fas fa-clipboard-list fa-3x text-gray-400"></i>
                        </div>
                        <p className="text-muted-foreground mb-0">
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
