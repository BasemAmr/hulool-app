// Admin view: Groups tasks by employee, then by client within each employee
import { useState, useRef, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Task, Client } from '@/api/types';
import { useModalStore } from '@/shared/stores/modalStore';
import { useQueryClient } from '@tanstack/react-query';
import { MoreVertical, Pause, Play, X, ListChecks, MessageSquare, AlertTriangle, Eye, Upload, Receipt } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/shared/hooks/useToast';
import { useDeferTask, useResumeTask, useCancelTask, useUpdateTask } from '@/features/tasks/api/taskQueries';
import { useDrawerStore } from '@/shared/stores/drawerStore';
import { useAdminSubmitTaskForReview } from '@/features/employees/api/employeeManagementQueries';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/shared/ui/shadcn/dropdown-menu';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FloatingCardWrapper } from '@/shared/ui/layout/FloatingCardWrapper';
import { Badge } from '@/shared/ui/shadcn/badge';
import { cn } from '@/shared/utils/cn';
import { translateTaskType } from '@/shared/constants/taskTypes';

export interface GroupedClientsByType {
  [key: string]: Array<{
    client_id: number;
    task_name: string;
    type: string;
    status: string;
    amount: number;
    expense_amount: number;
    net_earning: number;
    start_date: string;
    end_date: string;
    client: {
      id: string | number;
      name: string;
      phone: string;
    };
    id: number;
    subtasks: Array<{
      id: number;
      description: string;
      amount: number;
      is_completed: boolean;
    }>;
    tags?: Array<{ name: string }>;
  }>;
}

export interface EmployeeTasksGrouped {
  employee_id: number | string;
  employee_name: string;
  grouped_clients: GroupedClientsByType;
}

export interface ClientWithTasksAndStats {
  client: Client;
  tasks: Task[];
}


const formatDaysElapsed = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'اليوم';
  if (diffDays === 1) return 'يوم';
  if (diffDays === 2) return 'يومين';
  if (diffDays > 2 && diffDays <= 10) return `${diffDays} أيام`;
  return `${diffDays} يوم`;
};

// Sortable Client Card for drag-and-drop
interface SortableAdminEmployeeClientCardProps {
  clientData: ClientWithTasksAndStats;
  containerType: string;
  onAssign?: (task: Task) => void;
}

const SortableAdminEmployeeClientCard = ({
  clientData,
  containerType,
  onAssign
}: SortableAdminEmployeeClientCardProps) => {
  const [dynamicWidth, setDynamicWidth] = useState<string | undefined>(undefined);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `${containerType}-${clientData.client.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {/* Drag Handle */}
      <div
        {...listeners}
        className="cursor-grab px-2 py-1 bg-gray-200 border-b border-black/10 text-[10px] text-text-secondary text-center select-none"
      >
        ⋮⋮ اسحب لإعادة الترتيب
      </div>

      {/* WRAP with FloatingCardWrapper */}
      <FloatingCardWrapper dynamicWidth={dynamicWidth}>
        <AdminEmployeeClientCard
          data={clientData}
          onAssign={onAssign}
          onWidthCalculated={setDynamicWidth}
        />
      </FloatingCardWrapper>
    </div>
  );
};

// Admin Employee Client Card
interface AdminEmployeeClientCardProps {
  data: ClientWithTasksAndStats;
  onAssign?: (task: Task) => void;
  onWidthCalculated?: (width: string) => void;
}

const AdminEmployeeClientCard = ({
  data,
  onWidthCalculated
}: AdminEmployeeClientCardProps) => {
  const { client, tasks } = data;
  const { t } = useTranslation();
  const openModal = useModalStore(state => state.openModal);
  const { openDrawer } = useDrawerStore();
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  const deferTaskMutation = useDeferTask();
  const resumeTaskMutation = useResumeTask();
  const cancelTaskMutation = useCancelTask();
  const updateTaskMutation = useUpdateTask();
  const submitForReviewMutation = useAdminSubmitTaskForReview();
  const cardRef = useRef<HTMLDivElement>(null);
  const taskRowRefs = useRef<(HTMLTableRowElement | null)[]>([]);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isHovered && cardRef.current && taskRowRefs.current.length > 0 && onWidthCalculated) {
      const cardWidth = cardRef.current.offsetWidth;
      let maxTaskRowWidth = 0;

      taskRowRefs.current.forEach(ref => {
        if (ref) {
          maxTaskRowWidth = Math.max(maxTaskRowWidth, ref.offsetWidth);
        }
      });

      if (maxTaskRowWidth > cardWidth) {
        const excessPercentage = ((maxTaskRowWidth - cardWidth) / cardWidth) * 100;
        const newWidth = `${100 + excessPercentage}%`;
        onWidthCalculated(newWidth);
      } else {
        onWidthCalculated('100%');
      }
    }
  }, [isHovered, onWidthCalculated]);

  const handleAction = (mutation: any, task: Task, successKey: string, successMessageKey: string, errorKey: string) => {
    mutation.mutate({ id: task.id }, {
      onSuccess: () => {
        success(t(successKey), t(successMessageKey, { taskName: task.task_name || translateTaskType(task.type) }));
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'clientsWithActiveTasks'] });
      },
      onError: (err: any) => {
        error(t('common.error'), err.message || t(errorKey));
      }
    });
  };

  const handleDefer = (task: Task) => handleAction(deferTaskMutation, task, 'tasks.deferSuccess', 'tasks.deferSuccessMessage', 'tasks.deferError');
  const handleResume = (task: Task) => handleAction(resumeTaskMutation, task, 'tasks.resumeSuccess', 'tasks.resumeSuccessMessage', 'tasks.resumeError');

  const handleSubmitForReview = (task: Task) => {
    submitForReviewMutation.mutate(task.id, {
      onSuccess: async (response) => {
        success('تم الإرسال', `تم إرسال المهمة "${task.task_name || 'مهمة'}" للمراجعة بنجاح`);
        await queryClient.invalidateQueries({ queryKey: ['dashboard', 'clientsWithActiveTasks'] });
        await queryClient.invalidateQueries({ queryKey: ['tasks'] });
        await new Promise(resolve => setTimeout(resolve, 100));

        const updatedTask = {
          ...task,
          status: 'Pending Review' as const,
          id: response?.data?.id || task.id
        };

        openModal('approval', { task: updatedTask });
      },
      onError: (err: any) => {
        error('خطأ', err.message || 'حدث خطأ أثناء إرسال المهمة للمراجعة');
      }
    });
  };

  const handleCancelTask = (task: Task) => {
    cancelTaskMutation.mutate({
      id: task.id,
      decisions: {
        task_action: 'cancel'
      }
    }, {
      onSuccess: () => {
        success('تم الإلغاء', 'تم إلغاء المهمة بنجاح');
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'clientsWithActiveTasks'] });
      },
      onError: (err: any) => {
        error('خطأ', err.message || 'حدث خطأ أثناء إلغاء المهمة');
      }
    });
  };

  const handleShowRequirements = (task: Task) => openModal('requirements', { task });
  const handleViewSubtasks = (task: Task) => openModal('taskForm', { taskToEdit: task, client: task.client });

  const handleToggleUrgentTag = (task: Task) => {
    const isUrgent = task.tags?.some(tag => tag.name === 'قصوى');
    const urgentTagId = 1;

    const currentTags = Array.isArray(task.tags)
      ? task.tags.map((tag: any) => typeof tag === 'object' ? tag.id.toString() : tag.toString())
      : [];

    let updatedTags: string[];

    if (isUrgent) {
      updatedTags = currentTags.filter(id => id !== urgentTagId.toString());
    } else {
      updatedTags = [...currentTags, urgentTagId.toString()];
    }

    updateTaskMutation.mutate({
      id: task.id,
      taskData: {
        task_name: task.task_name || '',
        type: task.type,
        amount: task.amount,
        start_date: task.start_date,
        end_date: task.end_date || undefined,
        prepaid_amount: task.prepaid_amount,
        notes: task.notes || '',
        tags: updatedTags,
        requirements: task.requirements?.map((req: any) => ({
          id: req.id,
          requirement_text: req.requirement_text,
          is_provided: req.is_provided
        })) || []
      }
    }, {
      onSuccess: () => {
        success(
          isUrgent ? 'تم إزالة العلامة' : 'تمت الإضافة',
          isUrgent ? 'تم إزالة علامة العاجل من المهمة' : 'تم إضافة علامة العاجل للمهمة'
        );
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'clientsWithActiveTasks'] });
      },
      onError: (err: any) => {
        error('خطأ', err.message || 'حدث خطأ أثناء تحديث علامة العاجل');
      }
    });
  };

  const isClientUrgent = tasks.some(task => task.tags?.some(tag => tag.name === 'قصوى'));

  return (
    <div
      ref={cardRef}
      className={`h-full shadow-sm rounded-none overflow-visible relative transition-all duration-300 flex flex-col bg-bg-surface border border-border-default ${isClientUrgent ? 'border-l-4 border-l-status-danger-border' : 'border-l-4 border-l-border-default'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className={`border-0 py-2 rounded-none border-b ${isClientUrgent ? 'bg-status-danger-bg border-status-danger-border' : 'bg-bg-surface-muted border-border-default'}`}>
        <div className="flex justify-between items-center px-2">
          <div className="flex items-center gap-2">
            <span className="text-sm">
              {client.phone}
            </span>
          </div>

          <div className="flex items-center justify-center gap-2">
            <Link
              to={`/clients/${client.id}`}
              className="no-underline font-bold text-text-primary text-[0.95em] hover:text-text-brand transition-colors"
            >
              {client.name}
            </Link>
            {isClientUrgent && (
              <AlertTriangle size={12} className="text-status-danger-text" />
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 rounded border-0 bg-transparent text-text-primary transition-all duration-200 cursor-pointer hover:bg-background/40">
                <MoreVertical size={14} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-right min-w-[150px]" style={{ direction: 'rtl' }}>
              <DropdownMenuItem onClick={() => openModal('taskForm', { client })} className="text-right cursor-pointer">
                <Receipt size={14} className="ml-2" />
                إضافة مهمة
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Body - Tasks Table */}
      <div className="p-0 relative overflow-visible flex flex-col bg-bg-surface">
        <div className="overflow-auto relative">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-[2]">
              <tr className="bg-bg-surface-muted">
                <th className="text-[0.8em] px-2 py-1.5 border-0 text-text-secondary font-semibold">الخدمة</th>
                <th className="text-[0.8em] px-2 py-1.5 border-0 text-text-secondary font-semibold">النوع</th>
                <th className="text-[0.8em] px-2 py-1.5 border-0 text-text-secondary font-semibold">الحالة</th>
                <th className="text-[0.8em] px-2 py-1.5 border-0 text-text-secondary font-semibold">الوقت</th>
                <th className="text-[0.8em] px-2 py-1.5 w-20 min-w-[80px] border-0 text-text-secondary font-semibold">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="overflow-visible">
              {tasks.map((task, idx) => {
                const isUrgent = task.tags?.some(tag => tag.name === 'قصوى');
                const isDeferred = task.status === 'Deferred';

                const getStatusClass = (status: string) => {
                  switch (status) {
                    case 'New': return 'bg-status-warning-bg text-status-warning-text border border-status-warning-border';
                    case 'Pending Review': return 'bg-status-info-bg text-status-info-text border border-status-info-border';
                    case 'Completed': return 'bg-status-success-bg text-status-success-text border border-status-success-border';
                    case 'Deferred': return 'bg-status-neutral-bg text-status-neutral-text border border-status-neutral-border';
                    default: return 'bg-status-neutral-bg text-status-neutral-text border border-status-neutral-border';
                  }
                };

                return (
                  <tr
                    key={task.id}
                    ref={(el) => { taskRowRefs.current[idx] = el; }}
                    className={cn(
                      "border-b border-border-default relative transition-colors duration-150",
                      isDeferred && "opacity-60",
                      isUrgent ? "bg-status-danger-bg/40" : idx % 2 === 0 ? "bg-bg-surface" : "bg-bg-surface-hover"
                    )}
                  >
                    {/* Service */}
                    <td className="text-[0.82em] px-2 py-2 text-text-primary border-0">
                      <div className="flex items-center gap-1">
                        <span className="truncate max-w-[180px] inline-block">
                          {task.task_name || translateTaskType(task.type)}
                        </span>
                        {isUrgent && (
                          <AlertTriangle size={10} className="text-status-danger-text" />
                        )}
                      </div>
                    </td>

                    {/* Type */}
                    <td className="text-[0.77em] px-2 py-2 text-text-secondary border-0">
                      <span>{translateTaskType(task.type)}</span>
                    </td>

                    {/* Status */}
                    <td className="text-[0.77em] px-2 py-2 border-0 text-center">
                      <span className={cn("inline-block px-2 py-0.5 rounded-full text-[0.7em] font-semibold", getStatusClass(task.status))}>
                        {t(`status.${task.status}`)}
                      </span>
                    </td>

                    {/* Time Elapsed */}
                    <td className="text-[0.77em] px-2 py-2 text-text-secondary border-0 text-center">
                      <span>{formatDaysElapsed(task.start_date)}</span>
                    </td>

                    {/* Actions */}
                    <td className="px-2 py-2 static border-0 min-w-[50px] whitespace-nowrap">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1 rounded border border-border-strong bg-card text-[10px] leading-none transition-all duration-200 cursor-pointer hover:bg-background">
                            <MoreVertical size={12} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="text-right min-w-[200px] text-[0.85em]" style={{ direction: 'rtl' }}>
                          {/* Follow-up */}
                          <DropdownMenuItem
                            onClick={() => {
                              openDrawer('taskFollowUp', {
                                taskId: task.id,
                                taskName: task.task_name || undefined,
                                clientName: task.client?.name || client.name
                              });
                            }}
                            className="text-right cursor-pointer"
                          >
                            <MessageSquare size={14} className="ml-2" />
                            المراسلات والمتابعة
                          </DropdownMenuItem>

                          {/* Requirements */}
                          {task.requirements && task.requirements.length > 0 && (
                            <DropdownMenuItem
                              onClick={() => handleShowRequirements(task)}
                              className="text-right cursor-pointer"
                            >
                              <ListChecks size={14} className="ml-2" />
                              عرض المتطلبات
                            </DropdownMenuItem>
                          )}

                          {/* Submit for Review */}
                          {task.status === 'New' && (
                            <DropdownMenuItem
                              onClick={() => handleSubmitForReview(task)}
                              className="text-right cursor-pointer"
                            >
                              <Upload size={14} className="ml-2" />
                              إرسال للمراجعة
                            </DropdownMenuItem>
                          )}

                          {/* View Subtasks */}
                          <DropdownMenuItem
                            onClick={() => handleViewSubtasks(task)}
                            className="text-right cursor-pointer"
                          >
                            <Eye size={14} className="ml-2" />
                            المهام الفرعية
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          {/* Defer/Resume */}
                          {task.status !== 'Deferred' ? (
                            <DropdownMenuItem
                              onClick={() => handleDefer(task)}
                              className="text-right cursor-pointer"
                            >
                              <Pause size={14} className="ml-2" />
                              تأجيل المهمة
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => handleResume(task)}
                              className="text-right cursor-pointer"
                            >
                              <Play size={14} className="ml-2" />
                              استئناف المهمة
                            </DropdownMenuItem>
                          )}

                          {/* Toggle Urgent */}
                          <DropdownMenuItem
                            onClick={() => handleToggleUrgentTag(task)}
                            className="text-right cursor-pointer"
                          >
                            <AlertTriangle size={14} className="ml-2" />
                            {task.tags?.some(tag => tag.name === 'قصوى') ? 'إزالة علامة العاجل' : 'وضع علامة عاجل'}
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          {/* Cancel Task */}
                          <DropdownMenuItem
                            onClick={() => handleCancelTask(task)}
                            className="text-right text-destructive cursor-pointer"
                          >
                            <X size={14} className="ml-2" />
                            إلغاء المهمة
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

interface EmployeeTasksColumnProps {
  groupedByEmployee: EmployeeTasksGrouped[];
  onAssign?: (task: Task) => void;
}

const EmployeeTasksColumn: React.FC<EmployeeTasksColumnProps> = ({
  groupedByEmployee,
  onAssign,
}) => {
  const [clientTasksMap, setClientTasksMap] = useState<Map<number | string, ClientWithTasksAndStats[]>>(new Map());

  // Group employees and their clients
  useMemo(() => {
    const newMap = new Map<number | string, ClientWithTasksAndStats[]>();

    groupedByEmployee.forEach((employeeGroup) => {
      const clientsData: ClientWithTasksAndStats[] = [];
      const seenTaskIds = new Set<number>();

      Object.entries(employeeGroup.grouped_clients).forEach(([_type, clients]) => {
        clients.forEach((clientRaw: any) => {
          if (seenTaskIds.has(clientRaw.id)) {
            return;
          }
          seenTaskIds.add(clientRaw.id);

          const clientId = clientRaw.client.id;
          const existingClient = clientsData.find(c => c.client.id === clientId);

          if (existingClient) {
            existingClient.tasks.push(clientRaw as unknown as Task);
          } else {
            clientsData.push({
              client: clientRaw.client,
              tasks: [clientRaw as unknown as Task]
            });
          }
        });
      });

      if (clientsData.length > 0) {
        newMap.set(employeeGroup.employee_id, clientsData);
      }
    });

    setClientTasksMap(newMap);
  }, [groupedByEmployee]);

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

  const handleDragEnd = (event: DragEndEvent, employeeId: number | string) => {
    const { active, over } = event;

    if (!active || !over || active.id === over.id) {
      return;
    }

    const clients = clientTasksMap.get(employeeId);
    if (!clients) return;

    const [activePrefix, activeClientId] = active.id.toString().split('-');
    const [overPrefix, overClientId] = over.id.toString().split('-');

    if (activePrefix !== 'employee' || overPrefix !== 'employee') {
      return;
    }

    const oldIndex = clients.findIndex(c => c.client.id.toString() === activeClientId);
    const newIndex = clients.findIndex(c => c.client.id.toString() === overClientId);

    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      const reorderedItems = arrayMove(clients, oldIndex, newIndex);
      setClientTasksMap(new Map(clientTasksMap.set(employeeId, reorderedItems)));
    }
  };

  if (!groupedByEmployee || groupedByEmployee.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="mb-3">
          <i className="fas fa-clipboard-list fa-3x text-text-muted"></i>
        </div>
        <p className="text-muted-foreground mb-0">
          لا توجد مهام موظفين
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full overflow-visible relative z-[1]">
      {Array.from(clientTasksMap.entries()).map(([employeeId, clients]) => {
        const employeeGroup = groupedByEmployee.find(eg => eg.employee_id === employeeId);
        if (!employeeGroup) return null;

        return (
          <div key={employeeId} className="flex flex-col gap-3 overflow-visible">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event) => handleDragEnd(event, employeeId)}
            >
              <div className="flex flex-col gap-3 overflow-visible relative z-[1]">
                {clients.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="mb-3">
                      <i className="fas fa-clipboard-list fa-3x text-text-muted"></i>
                    </div>
                    <p className="text-muted-foreground mb-0">
                      لا توجد مهام نشطة
                    </p>
                  </div>
                ) : (
                  <SortableContext
                    items={clients.map(c => `employee-${c.client.id}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    {clients.map((clientData, index) => (
                      <div
                        key={`${employeeId}-client-${clientData.client.id}`}
                        className="overflow-visible relative flex-shrink-0"
                        style={{ zIndex: 50 - index }}
                      >
                        <SortableAdminEmployeeClientCard
                          clientData={clientData}
                          containerType="employee"
                          onAssign={onAssign}
                        />
                      </div>
                    ))}
                  </SortableContext>
                )}
              </div>
            </DndContext>
          </div>
        );
      })}
    </div>
  );
};

export default EmployeeTasksColumn;
