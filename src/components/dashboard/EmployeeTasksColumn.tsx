// Admin view: Groups tasks by employee, then by client within each employee
import { useState, useRef, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { Task, Client } from '../../api/types';
import { useModalStore } from '../../stores/modalStore';
import { useQueryClient } from '@tanstack/react-query';
import { MoreVertical, Pause, Play, X, ListChecks, MessageSquare, AlertTriangle, Eye, Upload, Receipt } from 'lucide-react';
import { Dropdown } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';
import { useDeferTask, useResumeTask, useCancelTask, useUpdateTask } from '../../queries/taskQueries';
import { useDrawerStore } from '../../stores/drawerStore';
import { useAdminSubmitTaskForReview } from '../../employee_management_temp_page/employeeManagementQueries';
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
import { FloatingCardWrapper } from '../common/FloatingCardWrapper';

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

const hexToRgba = (hex: string, opacity: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

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
  alternatingColors: string[];
  index: number;
  onAssign?: (task: Task) => void;
}

const SortableAdminEmployeeClientCard = ({
  clientData,
  containerType,
  alternatingColors,
  index,
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
        style={{
          cursor: 'grab',
          padding: '6px 8px',
          backgroundColor: '#6c757d',
          borderBottom: '1px solid rgba(0,0,0,0.1)',
          fontSize: '10px',
          color: '#fff',
          textAlign: 'center',
          userSelect: 'none'
        }}
      >
        ⋮⋮ اسحب لإعادة الترتيب
      </div>
      
      {/* WRAP with FloatingCardWrapper */}
      <FloatingCardWrapper dynamicWidth={dynamicWidth}>
        <AdminEmployeeClientCard
          data={clientData}
          alternatingColors={alternatingColors}
          index={index}
          onAssign={onAssign}
          onWidthCalculated={setDynamicWidth} // Pass callback
        />
      </FloatingCardWrapper>
    </div>
  );
};

// Admin Employee Client Card
interface AdminEmployeeClientCardProps {
  data: ClientWithTasksAndStats;
  alternatingColors: string[];
  index: number;
  onAssign?: (task: Task) => void;
  onWidthCalculated?: (width: string) => void;
}

const AdminEmployeeClientCard = ({
  data,
  alternatingColors,
  index,
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
  const cardBodyRef = useRef<HTMLDivElement>(null);
  const dropdownMenuRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [activeDropdownTaskId, setActiveDropdownTaskId] = useState<number | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);

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
  }, [isHovered]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeDropdownTaskId && dropdownPosition) {
        const dropdownToggle = document.querySelector(`[data-task-id="${activeDropdownTaskId}"] .dropdown-toggle`);
        if (dropdownMenuRef.current && dropdownToggle &&
            !dropdownMenuRef.current.contains(event.target as Node) &&
            !dropdownToggle.contains(event.target as Node)) {
          setActiveDropdownTaskId(null);
          setDropdownPosition(null);
        }
      }
    };

    if (activeDropdownTaskId) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeDropdownTaskId, dropdownPosition]);

  const handleAction = (mutation: any, task: Task, successKey: string, successMessageKey: string, errorKey: string) => {
    mutation.mutate({ id: task.id }, {
      onSuccess: () => {
        success(t(successKey), t(successMessageKey, { taskName: task.task_name || t(`type.${task.type}`) }));
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

  let headerColor, borderColor, row1Color, row2Color;

  if (isClientUrgent) {
    headerColor = hexToRgba('#dc3545', 0.8);
    borderColor = hexToRgba('#c82333', 0.6);
    row1Color = hexToRgba('#ffebeb', 0.5);
    row2Color = hexToRgba('#ffe6e6', 0.5);
  } else {
    const colorIndex = index % 2;
    const baseColor = alternatingColors[colorIndex] || alternatingColors[0];

    headerColor = baseColor === '#e3f2fd' ? '#1976d2' :
      baseColor === '#bbdefb' ? '#0d47a1' :
        baseColor === '#fff8e1' ? '#f57f17' :
          baseColor === '#ffecb3' ? '#ff8f00' :
            baseColor === '#e8f5e8' ? '#2e7d32' :
              baseColor === '#c8e6c9' ? '#1b5e20' :
                baseColor === '#f8f9fa' ? '#495057' :
                  '#343a40';
    headerColor = hexToRgba(headerColor, 0.5);
    borderColor = headerColor;
    row1Color = hexToRgba(alternatingColors[1], 0.3);
    row2Color = hexToRgba(alternatingColors[1], 1);
  }

  return (
    <div
      ref={cardRef}
      className="card h-100 shadow-sm admin-employee-client-card"
      style={{
        borderRadius: '0px',
        border: `3px solid ${borderColor}`,
        overflow: 'visible',
        position: 'relative',
        transition: 'all 0.3s ease-in-out',
        display: 'flex',
        flexDirection: 'column'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div
        className="card-header border-0 py-2"
        style={{
          backgroundColor: headerColor,
          borderRadius: 0
        }}
      >
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <span style={{ fontSize: '0.85em' }}>
              {client.phone}
            </span>
          </div>

          <div className="d-flex align-items-center justify-content-center gap-2">
            <Link
              to={`/clients/${client.id}`}
              className="text-decoration-none fw-bold text-black"
              style={{ fontSize: '0.95em' }}
            >
              {client.name}
            </Link>
            {isClientUrgent && (
              <AlertTriangle size={12} className="text-warning" />
            )}
          </div>

          <Dropdown align="end">
            <Dropdown.Toggle
              as="button"
              className="btn btn-outline-light btn-sm p-1 border-0 text-black"
              style={{ background: 'none' }}
            >
              <MoreVertical size={14} />
            </Dropdown.Toggle>

            <Dropdown.Menu
              style={{
                fontSize: '0.85em',
                direction: 'rtl',
                textAlign: 'right',
                zIndex: 1060,
                position: 'absolute'
              }}
            >
              <Dropdown.Item onClick={() => openModal('taskForm', { client })} className="text-end">
                <Receipt size={14} className="ms-2" />
                إضافة مهمة
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>
      </div>

      {/* Body - Tasks Table */}
      <div
        ref={cardBodyRef}
        className="card-body p-0"
        style={{
          position: 'relative',
          backgroundColor: row1Color,
          overflow: 'visible',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div
          className="table-responsive"
          style={{
            overflow: 'auto',
            position: 'relative'
          }}
        >
          <table className="table table-sm mb-0">
            <thead
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 2,
                border: 'none'
              }}
            >
              <tr>
                <th style={{
                  fontSize: '0.8em',
                  padding: '6px 8px',
                  backgroundColor: headerColor,
                  border: 'none'
                }}>الخدمة</th>
                <th style={{
                  fontSize: '0.8em',
                  padding: '6px 8px',
                  backgroundColor: headerColor,
                  border: 'none'
                }}>النوع</th>
                <th style={{
                  fontSize: '0.8em',
                  padding: '6px 8px',
                  backgroundColor: headerColor,
                  border: 'none'
                }}>الحالة</th>
                <th style={{
                  fontSize: '0.8em',
                  padding: '6px 8px',
                  backgroundColor: headerColor,
                  border: 'none'
                }}>الوقت</th>
                <th style={{
                  fontSize: '0.8em',
                  padding: '6px 8px',
                  width: '80px',
                  minWidth: '80px',
                  backgroundColor: headerColor,
                  border: 'none'
                }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody
              style={{
                overflow: 'visible'
              }}
            >
              {tasks.map((task, idx) => {
                const isUrgent = task.tags?.some(tag => tag.name === 'قصوى');
                const rowColor = idx % 2 === 0 ? row1Color : row2Color;
                const isDeferred = task.status === 'Deferred';

                return (
                  <tr
                    key={task.id}
                    ref={(el) => { taskRowRefs.current[idx] = el; }}
                    style={{
                      backgroundColor: rowColor,
                      borderBottom: '1px solid rgba(0,0,0,0.05)',
                      opacity: isDeferred ? 0.6 : 1,
                      position: 'relative',
                      border: 'none',
                      transition: 'all 0.2s ease-in-out'
                    }}
                    className="task-row"
                  >
                    {/* Service */}
                    <td style={{
                      fontSize: '0.82em',
                      padding: '8px',
                      color: 'black',
                      backgroundColor: rowColor,
                      border: 'none'
                    }}>
                      <div className="d-flex align-items-center gap-1">
                        <span className="text-truncate" style={{ maxWidth: 180, display: 'inline-block' }}>
                          {task.task_name || t(`type.${task.type}`)}
                        </span>
                        {isUrgent && (
                          <AlertTriangle size={10} className="text-danger" />
                        )}
                      </div>
                    </td>

                    {/* Type */}
                    <td style={{
                      fontSize: '0.77em',
                      padding: '8px',
                      color: 'black',
                      backgroundColor: rowColor,
                      border: 'none'
                    }}>
                      <span>
                        {t(`type.${task.type}`)}
                      </span>
                    </td>

                    {/* Status */}
                    <td style={{
                      fontSize: '0.77em',
                      padding: '8px',
                      color: 'black',
                      backgroundColor: rowColor,
                      border: 'none'
                    }} className="text-center">
                      <span
                        className={`badge ${
                          task.status === 'New' ? 'bg-warning text-dark' :
                          task.status === 'Deferred' ? 'bg-danger' :
                          task.status === 'Pending Review' ? 'bg-info text-dark' :
                          task.status === 'Completed' ? 'bg-success' :
                          'bg-secondary'
                        }`}
                        style={{ fontSize: '0.7em' }}
                      >
                        {t(`status.${task.status}`)}
                      </span>
                    </td>

                    {/* Time Elapsed */}
                    <td style={{
                      fontSize: '0.77em',
                      padding: '8px',
                      color: 'black',
                      backgroundColor: rowColor,
                      border: 'none'
                    }} className="text-center">
                      <span className="text-muted">
                        {formatDaysElapsed(task.start_date)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td
                      className="task-actions"
                      style={{
                        padding: '8px',
                        position: 'static',
                        color: 'black',
                        backgroundColor: rowColor,
                        border: 'none',
                        minWidth: '50px',
                        whiteSpace: 'nowrap'
                      }}
                      data-task-id={task.id}
                    >
                      <Dropdown show={activeDropdownTaskId === task.id} onToggle={(isOpen) => {
                        if (isOpen) {
                          setActiveDropdownTaskId(task.id);
                          // Calculate position relative to trigger button
                          const triggerElement = document.querySelector(`[data-task-id="${task.id}"] .dropdown-toggle`) as HTMLElement;
                          if (triggerElement && cardBodyRef.current) {
                            const triggerRect = triggerElement.getBoundingClientRect();
                            const cardBodyRect = cardBodyRef.current.getBoundingClientRect();
                            setDropdownPosition({
                              top: triggerRect.bottom - cardBodyRect.top + 2,
                              left: triggerRect.right - cardBodyRect.left - 120
                            });
                          }
                        } else {
                          setActiveDropdownTaskId(null);
                          setDropdownPosition(null);
                        }
                      }}>
                        <Dropdown.Toggle
                          as="button"
                          className="btn btn-sm btn-outline-secondary p-1"
                          style={{ fontSize: '10px', lineHeight: 1 }}
                        //   data-task-id={task.id}
                        >
                          <MoreVertical size={12} />
                        </Dropdown.Toggle>
                      </Dropdown>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Render active dropdown menu via createPortal */}
        {(() => {
          const task = tasks.find(t => t.id === activeDropdownTaskId);
          if (!task || !dropdownPosition || !cardBodyRef.current) return null;

          return createPortal(
            <div ref={dropdownMenuRef}>
              <Dropdown.Menu
                show
                align="end"
                className="text-end"
                style={{
                  zIndex: 9999,
                  minWidth: '200px',
                  fontSize: '0.85em',
                  position: 'absolute',
                  top: dropdownPosition.top,
                  left: `calc(${dropdownPosition.left}px + 50px)`,
                  marginTop: '2px',
                  direction: 'rtl'
                }}
              >
                {/* Follow-up */}
                <Dropdown.Item
                  onClick={() => {
                    openDrawer('taskFollowUp', { 
                      taskId: task.id,
                      taskName: task.task_name || undefined,
                      clientName: task.client?.name || client.name
                    });
                    setActiveDropdownTaskId(null);
                  }}
                  className="text-end"
                >
                  <MessageSquare size={14} className="ms-2" />
                  المراسلات والمتابعة
                </Dropdown.Item>

                {/* Requirements */}
                {task.requirements && task.requirements.length > 0 && (
                  <Dropdown.Item
                    onClick={() => {
                      handleShowRequirements(task);
                      setActiveDropdownTaskId(null);
                    }}
                    className="text-end"
                  >
                    <ListChecks size={14} className="ms-2" />
                    عرض المتطلبات
                  </Dropdown.Item>
                )}

                {/* Submit for Review */}
                {task.status === 'New' && (
                  <Dropdown.Item
                    onClick={() => {
                      handleSubmitForReview(task);
                      setActiveDropdownTaskId(null);
                    }}
                    className="text-end"
                  >
                    <Upload size={14} className="ms-2" />
                    إرسال للمراجعة
                  </Dropdown.Item>
                )}

                {/* View Subtasks */}
                <Dropdown.Item
                  onClick={() => {
                    handleViewSubtasks(task);
                    setActiveDropdownTaskId(null);
                  }}
                  className="text-end"
                >
                  <Eye size={14} className="ms-2" />
                  المهام الفرعية
                </Dropdown.Item>

                <Dropdown.Divider />

                {/* Defer/Resume */}
                {task.status !== 'Deferred' ? (
                  <Dropdown.Item
                    onClick={() => {
                      handleDefer(task);
                      setActiveDropdownTaskId(null);
                    }}
                    className="text-end"
                  >
                    <Pause size={14} className="ms-2" />
                    تأجيل المهمة
                  </Dropdown.Item>
                ) : (
                  <Dropdown.Item
                    onClick={() => {
                      handleResume(task);
                      setActiveDropdownTaskId(null);
                    }}
                    className="text-end"
                  >
                    <Play size={14} className="ms-2" />
                    استئناف المهمة
                  </Dropdown.Item>
                )}

                {/* Toggle Urgent */}
                <Dropdown.Item
                  onClick={() => {
                    handleToggleUrgentTag(task);
                    setActiveDropdownTaskId(null);
                  }}
                  className="text-end"
                >
                  <AlertTriangle size={14} className="ms-2" />
                  {task.tags?.some(tag => tag.name === 'قصوى') ? 'إزالة علامة العاجل' : 'وضع علامة عاجل'}
                </Dropdown.Item>

                <Dropdown.Divider />

                {/* Cancel Task */}
                <Dropdown.Item
                  onClick={() => {
                    handleCancelTask(task);
                    setActiveDropdownTaskId(null);
                  }}
                  className="text-end text-danger"
                >
                  <X size={14} className="ms-2" />
                  إلغاء المهمة
                </Dropdown.Item>
              </Dropdown.Menu>
            </div>,
            cardBodyRef.current
          );
        })()}
      </div>
    </div>
  );
};

interface EmployeeTasksColumnProps {
  groupedByEmployee: EmployeeTasksGrouped[];
  onAssign?: (task: Task) => void;
  alternatingColors?: string[];
}

const EmployeeTasksColumn: React.FC<EmployeeTasksColumnProps> = ({
  groupedByEmployee,
  onAssign,
  alternatingColors: propAlternatingColors
}) => {
  const [clientTasksMap, setClientTasksMap] = useState<Map<number | string, ClientWithTasksAndStats[]>>(new Map());

  // Group employees and their clients
  useMemo(() => {
    const newMap = new Map<number | string, ClientWithTasksAndStats[]>();

    groupedByEmployee.forEach((employeeGroup) => {
      const clientsData: ClientWithTasksAndStats[] = [];

      Object.entries(employeeGroup.grouped_clients).forEach(([_type, clients]) => {
        clients.forEach((clientRaw: any) => {
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
      <div className="empty-state py-5 text-center">
        <div className="empty-icon mb-3">
          <i className="fas fa-clipboard-list fa-3x text-gray-400"></i>
        </div>
        <p className="empty-description text-muted mb-0">
          لا توجد مهام موظفين
        </p>
      </div>
    );
  }

  return (
    <div className="employee-tasks-column-container" style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '0.75rem', 
        width: '100%',
        overflow: 'visible',
        position: 'relative',
        zIndex: 1
    }}>
      {Array.from(clientTasksMap.entries()).map(([employeeId, clients]) => {
        const employeeGroup = groupedByEmployee.find(eg => eg.employee_id === employeeId);
        if (!employeeGroup) return null;

        const alternatingColors = propAlternatingColors || ['#e3f2fd', '#bbdefb'];

        return (
          <div key={employeeId} className="employee-section" style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '0.75rem',
              overflow: 'visible'
          }}>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event) => handleDragEnd(event, employeeId)}
            >
              <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.75rem', 
                  overflow: 'visible', 
                  position: 'relative', 
                  zIndex: 1
              }}>
                {clients.length === 0 ? (
                  <div className="empty-state py-5 text-center">
                    <div className="empty-icon mb-3">
                      <i className="fas fa-clipboard-list fa-3x text-gray-400"></i>
                    </div>
                    <p className="empty-description text-muted mb-0">
                      لا توجد مهام نشطة
                    </p>
                  </div>
                ) : (
                  <>
                    <SortableContext
                      items={clients.map(c => `employee-${c.client.id}`)}
                      strategy={verticalListSortingStrategy}
                    >
                      {clients.map((clientData, index) => (
                        <div key={`${employeeId}-client-${clientData.client.id}`} style={{
                          overflow: 'visible',
                          position: 'relative',
                          zIndex: 50 - index,
                          isolation: 'auto',
                          flexShrink: 0
                        }}>
                          <SortableAdminEmployeeClientCard
                            clientData={clientData}
                            containerType="employee"
                            alternatingColors={alternatingColors}
                            index={index}
                            onAssign={onAssign}
                          />
                        </div>
                      ))}
                    </SortableContext>
                  </>
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
