import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  useGetDashboardStats, 
  useGetClientsWithActiveTasks, 
  type GroupedClientsResponse, 
  type ClientWithTasksAndStats
} from '@/features/dashboard/api/dashboardQueries';
import { useModalStore } from '@/shared/stores/modalStore';
import type { Task } from '@/api/types';
import { FileText, LayoutGrid, BarChart3 } from 'lucide-react';
import { applyPageBackground } from '@/shared/utils/backgroundUtils';
import AdminReportsPanel from '../components/AdminReportsPanel';

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
    const [activeContainer, setActiveContainer] = useState<'Government' | 'Other' | null>(null);

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

    // Column 2: Government tasks clients (renamed to خدمات قيد الإجراء)
    const governmentClients = useMemo(() => {
        return groupedClients?.Government || [];
    }, [groupedClients]);

    // Column 3: Non-government tasks clients (Accounting, Real Estate, Other)
    const otherClients = useMemo(() => {
        if (!groupedClients) return [];
        const map = new Map<number, ClientWithTasksAndStats>();

        const addList = (list: ClientWithTasksAndStats[]) => {
            list.forEach(c => {
                const id = Number(c.client.id);
                if (map.has(id)) {
                    const existing = map.get(id)!;
                    const existingTaskIds = new Set(existing.tasks.map(t => t.id));
                    const newTasks = c.tasks.filter(t => !existingTaskIds.has(t.id));
                    existing.tasks = [...existing.tasks, ...newTasks];
                } else {
                    map.set(id, { ...c, tasks: [...c.tasks] });
                }
            });
        };

        addList(groupedClients.Accounting || []);
        addList(groupedClients['Real Estate'] || []);
        addList(groupedClients.Other || []);

        return Array.from(map.values());
    }, [groupedClients]);

    function handleDragStart(event: DragStartEvent): void {
        const { active } = event;
        const [containerType, clientId] = active.id.toString().split('-');
        const container = containerType as 'Government' | 'Other';

        if (container === 'Government') {
            const clientData = governmentClients.find(c => c.client.id.toString() === clientId);
            if (clientData) {
                setActiveDragItem(clientData);
                setActiveContainer('Government');
            }
        } else if (container === 'Other') {
            const clientData = otherClients.find(c => c.client.id.toString() === clientId);
            if (clientData) {
                setActiveDragItem(clientData);
                setActiveContainer('Other');
            }
        }
    }

    function handleDragEnd(event: DragEndEvent): void {
        const { active, over } = event;

        if (!active || !over || active.id === over.id || !activeContainer) {
            setActiveDragItem(null);
            setActiveContainer(null);
            return;
        }

        const [activeContainerType, activeClientId] = active.id.toString().split('-');
        const [overContainerType, overClientId] = over.id.toString().split('-');

        if (activeContainerType !== overContainerType) {
            setActiveDragItem(null);
            setActiveContainer(null);
            return;
        }

        if (activeContainer === 'Government') {
            const oldIndex = governmentClients.findIndex(c => c.client.id.toString() === activeClientId);
            const newIndex = governmentClients.findIndex(c => c.client.id.toString() === overClientId);

            if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
                const reorderedItems = arrayMove(governmentClients, oldIndex, newIndex);
                setGroupedClients(prev => prev ? { ...prev, Government: reorderedItems } : null);

                const clientIds = reorderedItems.map(c => Number(c.client.id));
                updateSortOrderMutation.mutate({ taskType: 'Government', clientIds });
            }
        } else if (activeContainer === 'Other') {
            const oldIndex = otherClients.findIndex(c => c.client.id.toString() === activeClientId);
            const newIndex = otherClients.findIndex(c => c.client.id.toString() === overClientId);

            if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
                const reorderedItems = arrayMove(otherClients, oldIndex, newIndex);
                const clientIds = reorderedItems.map(c => Number(c.client.id));
                updateSortOrderMutation.mutate({ taskType: 'Accounting', clientIds });
            }
        }

        setActiveDragItem(null);
        setActiveContainer(null);
    }

    return (
        <div className="relative pb-[20px] dir-rtl" dir="rtl">
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
                    // *** ADMIN DASHBOARD 3 COLUMNS: Reports | خدمات قيد الإجراء | خدمات أخرى ***
                    <div className="min-h-[calc(100vh-200px)] overflow-visible relative z-[1]">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 overflow-visible relative z-[1]">
                            {/* Column 1: التقارير */}
                            <div className="p-1 overflow-visible relative" style={{ zIndex: 10 }}>
                                <CardColumnContainer
                                    title="التقارير"
                                    icon={<BarChart3 size={18} className="text-primary" />}
                                    accentColor="var(--token-status-info-text)"
                                    isEmpty={false}
                                >
                                    <AdminReportsPanel />
                                </CardColumnContainer>
                            </div>

                            {/* Column 2: خدمات قيد الإجراء (Government tasks) */}
                            <div className="p-1 overflow-visible relative" style={{ zIndex: 9 }}>
                                <CardColumnContainer
                                    title="خدمات قيد الإجراء"
                                    icon={<FileText size={18} className="text-primary" />}
                                    accentColor="var(--token-status-info-text)"
                                    itemCount={governmentClients.length}
                                    moreLink="/tasks?type=Government"
                                    isEmpty={governmentClients.length === 0}
                                    emptyMessage={t('common.noResults')}
                                >
                                    {governmentClients.length > 0 && (
                                        <SortableContext 
                                            items={governmentClients.map(c => `Government-${c.client.id}`)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            {governmentClients.map((clientData) => (
                                                <SortableBaseClientCard
                                                    key={`Government-${clientData.client.id}`}
                                                    data={clientData}
                                                    role="admin"
                                                    context="admin-dashboard"
                                                    sortableId={`Government-${clientData.client.id}`}
                                                    onAssign={handleAssignTask}
                                                    showAmount={true}
                                                    showEmployeePrefix={true}
                                                />
                                            ))}
                                        </SortableContext>
                                    )}
                                </CardColumnContainer>
                            </div>

                            {/* Column 3: خدمات أخرى (All other task types) */}
                            <div className="p-1 overflow-visible relative" style={{ zIndex: 8 }}>
                                <CardColumnContainer
                                    title="خدمات أخرى"
                                    icon={<LayoutGrid size={18} className="text-amber-500" />}
                                    accentColor="var(--token-status-warning-text)"
                                    itemCount={otherClients.length}
                                    moreLink="/tasks"
                                    isEmpty={otherClients.length === 0}
                                    emptyMessage={t('common.noResults')}
                                >
                                    {otherClients.length > 0 && (
                                        <SortableContext 
                                            items={otherClients.map(c => `Other-${c.client.id}`)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            {otherClients.map((clientData) => (
                                                <SortableBaseClientCard
                                                    key={`Other-${clientData.client.id}`}
                                                    data={clientData}
                                                    role="admin"
                                                    context="admin-dashboard"
                                                    sortableId={`Other-${clientData.client.id}`}
                                                    onAssign={handleAssignTask}
                                                    showAmount={true}
                                                    showEmployeePrefix={true}
                                                    headerVariant="amber"
                                                />
                                            ))}
                                        </SortableContext>
                                    )}
                                </CardColumnContainer>
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