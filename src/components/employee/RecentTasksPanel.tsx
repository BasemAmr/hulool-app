// src/components/employee/RecentTasksPanel.tsx
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Dropdown } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import {
  Pause,
  Play,
  ListChecks,
  MoreVertical,
  AlertTriangle,
  Eye,
  MessageSquare,
  Upload,
  MoreHorizontal,
} from 'lucide-react';

import { useModalStore } from '../../stores/modalStore';
import { useDrawerStore } from '../../stores/drawerStore';
import { useToast } from '../../hooks/useToast';
import { useDeferTask, useResumeTask, useUpdateTask, useSubmitTaskForReview } from '../../queries/taskQueries';
import { formatDate } from '../../utils/dateUtils';
import type { EmployeeDashboardTask } from '../../queries/employeeDashboardQueries';

interface RecentTasksPanelProps {
  tasks: EmployeeDashboardTask[];
}

// Updated formatTimeElapsed function for day-based display
const formatDaysElapsed = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'اليوم';
  } else if (diffDays === 1) {
    return 'يوم';
  } else if (diffDays === 2) {
    return 'يومين';
  } else if (diffDays > 2 && diffDays <= 10) {
    return `${diffDays} أيام`;
  } else {
    return `${diffDays} يوم`;
  }
};

const RecentTasksPanel = ({ tasks }: RecentTasksPanelProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const openModal = useModalStore(state => state.openModal);
  const { openDrawer } = useDrawerStore();
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  
  const deferTaskMutation = useDeferTask();
  const resumeTaskMutation = useResumeTask();
  const updateTaskMutation = useUpdateTask();
  const submitForReviewMutation = useSubmitTaskForReview();

  const [hoveredTaskId, setHoveredTaskId] = useState<number | null>(null);
  const [isMouseOverPortal, setIsMouseOverPortal] = useState(false);
  const [isMouseOverRow, setIsMouseOverRow] = useState(false);
  const [taskRowRect, setTaskRowRect] = useState<DOMRect | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Smart hover management
  const handleRowMouseEnter = (taskId: number, event: React.MouseEvent<HTMLTableRowElement>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsMouseOverRow(true);
    setHoveredTaskId(taskId);
    
    // Capture task row rectangle
    const rect = event.currentTarget.getBoundingClientRect();
    setTaskRowRect(rect);
  };

  const handleRowMouseLeave = () => {
    setIsMouseOverRow(false);
    // Delay hiding the portal to allow mouse to reach it
    timeoutRef.current = setTimeout(() => {
      if (!isMouseOverPortal) {
        setHoveredTaskId(null);
      }
    }, 200);
  };

  const handlePortalMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsMouseOverPortal(true);
  };

  const handlePortalMouseLeave = () => {
    setIsMouseOverPortal(false);
    timeoutRef.current = setTimeout(() => {
      if (!isMouseOverRow) {
        setHoveredTaskId(null);
      }
    }, 100);
  };

  // Calculate floating overlay position with screen boundary checks
  const calculateOverlayPosition = (taskRect: DOMRect, overlayWidth: number = 800, overlayHeight: number = 120) => {
    if (!taskRect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    // Calculate desired position (centered over the task row)
    let left = taskRect.left + scrollX + (taskRect.width / 2) - (overlayWidth / 2);
    let top = taskRect.top + scrollY + (taskRect.height / 2) - (overlayHeight / 2);

    // Check horizontal boundaries
    if (left < 20) {
      left = 20;
    } else if (left + overlayWidth > viewportWidth - 20) {
      left = viewportWidth - overlayWidth - 20;
    }

    // Check vertical boundaries
    if (top < 20) {
      top = taskRect.bottom + scrollY + 10;
    }

    // Final check if it goes beyond bottom
    if (top + overlayHeight > viewportHeight + scrollY - 20) {
      top = scrollY + (viewportHeight / 2) - (overlayHeight / 2);
    }

    return {
      position: 'absolute' as const,
      left: `${left}px`,
      top: `${top}px`,
      transform: 'none'
    };
  };

  // Global mouse tracking for better portal persistence
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!hoveredTaskId) return;
      
      const portalElement = document.querySelector('.task-portal');
      const hoveredRow = document.querySelector(`tr[data-task-id="${hoveredTaskId}"]`);
      
      if (portalElement && hoveredRow) {
        const portalRect = portalElement.getBoundingClientRect();
        const rowRect = hoveredRow.getBoundingClientRect();
        
        const isOverPortal = (
          e.clientX >= portalRect.left && 
          e.clientX <= portalRect.right && 
          e.clientY >= portalRect.top && 
          e.clientY <= portalRect.bottom
        );
        
        const isOverRow = (
          e.clientX >= rowRect.left && 
          e.clientX <= rowRect.right && 
          e.clientY >= rowRect.top && 
          e.clientY <= rowRect.bottom
        );
        
        setIsMouseOverPortal(isOverPortal);
        setIsMouseOverRow(isOverRow);
      }
    };

    if (hoveredTaskId) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
      };
    }
  }, [hoveredTaskId]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Auto-hide when both mouse states are false
  useEffect(() => {
    if (!isMouseOverRow && !isMouseOverPortal && hoveredTaskId) {
      const timeout = setTimeout(() => {
        setHoveredTaskId(null);
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [isMouseOverRow, isMouseOverPortal, hoveredTaskId]);

  const handleAction = (mutation: any, task: EmployeeDashboardTask, successKey: string, successMessageKey: string, errorKey: string) => {
    mutation.mutate({ id: task.id }, {
      onSuccess: () => {
        success(t(successKey), t(successMessageKey, { taskName: task.task_name || t(`type.${task.type}`) }));
        queryClient.invalidateQueries({ queryKey: ['employee', 'dashboard'] });
      },
      onError: (err: any) => {
        error(t('common.error'), err.message || t(errorKey));
      }
    });
  };

  const handleDefer = (task: EmployeeDashboardTask) => 
    handleAction(deferTaskMutation, task, 'tasks.deferSuccess', 'tasks.deferSuccessMessage', 'tasks.deferError');

  const handleResume = (task: EmployeeDashboardTask) => 
    handleAction(resumeTaskMutation, task, 'tasks.resumeSuccess', 'tasks.resumeSuccessMessage', 'tasks.resumeError');

  const handleSubmitForReview = (task: EmployeeDashboardTask) => 
    handleAction(submitForReviewMutation, task, 'tasks.submitSuccess', 'tasks.submitSuccessMessage', 'tasks.submitError');

  const handleShowRequirements = (task: EmployeeDashboardTask) => {
    // Convert EmployeeDashboardTask to regular Task format for modal
    const taskForModal = {
      ...task,
      client: {
        id: Number(task.client.id),
        name: task.client.name,
        phone: task.client.phone
      }
    } as any; // Type assertion to bypass strict typing for modal compatibility
    openModal('requirements', { task: taskForModal });
  };

  const handleEditTask = (task: EmployeeDashboardTask) => {
    // Convert EmployeeDashboardTask to regular Task format for modal
    const taskForEdit = {
      ...task,
      client: {
        id: Number(task.client.id),
        name: task.client.name,
        phone: task.client.phone
      }
    } as any; // Type assertion to bypass strict typing for modal compatibility
    openModal('taskForm', { taskToEdit: taskForEdit });
  };

  const handleToggleUrgentTag = (task: EmployeeDashboardTask) => {
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
        type: task.type as any, // Type assertion to handle TaskType compatibility
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
        queryClient.invalidateQueries({ queryKey: ['employee', 'dashboard'] });
      },
      onError: (err: any) => {
        error('خطأ', err.message || 'حدث خطأ أثناء تحديث علامة العاجل');
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New':
        return 'rgba(23, 162, 184, 0.1)';
      case 'Deferred':
        return 'rgba(255, 193, 7, 0.1)';
      case 'Pending Review':
        return 'rgba(108, 117, 125, 0.1)';
      case 'Completed':
        return 'rgba(40, 167, 69, 0.1)';
      default:
        return 'rgba(248, 249, 250, 1)';
    }
  };

  const getBorderColor = (status: string) => {
    switch (status) {
      case 'New':
        return '#17A2B8';
      case 'Deferred':
        return '#FFC107';
      case 'Pending Review':
        return '#6C757D';
      case 'Completed':
        return '#28A745';
      default:
        return '#E5E5E5';
    }
  };

  return (
    <div 
      className="card h-100 shadow-sm"
      style={{
        borderRadius: 'var(--border-radius)',
        border: '1px solid var(--color-gray-100)',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Header */}
      <div
        className="card-header border-0 py-2"
        style={{
          backgroundColor: 'var(--color-primary)',
          color: 'var(--color-white)',
          flexShrink: 0
        }}
      >
        <div className="d-flex justify-content-between align-items-center">
          <h6 className="mb-0 fw-bold" style={{ fontSize: 'var(--font-size-base)' }}>
            المهام الحديثة
          </h6>
          <div className="d-flex align-items-center gap-2">
            {/* Urgent Tasks Indicator */}
            {tasks.some(task => task.tags?.some(tag => tag.name === 'قصوى')) && (
              <span 
                className="badge bg-danger"
                style={{ fontSize: '10px' }}
                title="يوجد مهام عاجلة"
              >
                <AlertTriangle size={12} className="me-1" />
                عاجل
              </span>
            )}
            <span style={{ fontSize: 'var(--font-size-sm)' }}>
              {tasks.length} مهمة
            </span>
          </div>
        </div>
      </div>

      {/* Body - Tasks Table */}
      <div className="card-body p-0" style={{ flex: 1, overflow: 'hidden' }}>
        <div className="table-responsive h-100" style={{ overflow: 'hidden' }}>
          <table className="table table-sm mb-0">
            <thead
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 1,
                backgroundColor: 'var(--color-gray-50)'
              }}
            >
              <tr>
                <th style={{
                  fontSize: 'var(--font-size-xs)',
                  padding: '8px',
                  borderBottom: '2px solid var(--color-gray-100)',
                  textAlign: 'center'
                }}>المهمة</th>
                <th style={{
                  fontSize: 'var(--font-size-xs)',
                  padding: '8px',
                  borderBottom: '2px solid var(--color-gray-100)',
                  textAlign: 'center'
                }}>العميل</th>
                <th style={{
                  fontSize: 'var(--font-size-xs)',
                  padding: '8px',
                  borderBottom: '2px solid var(--color-gray-100)',
                  textAlign: 'center'
                }}>الحالة</th>
                <th style={{
                  fontSize: 'var(--font-size-xs)',
                  padding: '8px',
                  borderBottom: '2px solid var(--color-gray-100)',
                  textAlign: 'center'
                }}>التاريخ</th>
                <th style={{
                  fontSize: 'var(--font-size-xs)',
                  padding: '8px',
                  borderBottom: '2px solid var(--color-gray-100)',
                  textAlign: 'center'
                }}>المدة</th>
                <th style={{
                  fontSize: 'var(--font-size-xs)',
                  padding: '8px',
                  borderBottom: '2px solid var(--color-gray-100)',
                  textAlign: 'center',
                  minWidth: '80px'
                }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const isTaskUrgent = task.tags?.some(tag => tag.name === 'قصوى');
                const statusBgColor = getStatusColor(task.status);
                const statusBorderColor = getBorderColor(task.status);

                let rowBackground = isTaskUrgent ? '#ffcccc' : statusBgColor;

                return (
                  <tr
                    key={task.id}
                    className="task-row"
                    data-task-id={task.id}
                    style={{
                      backgroundColor: rowBackground,
                      transition: 'all 0.2s ease-in-out',
                      borderLeft: `3px solid ${statusBorderColor}`,
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => handleRowMouseEnter(task.id, e)}
                    onMouseLeave={handleRowMouseLeave}
                  >
                    <td style={{
                      fontSize: 'var(--font-size-xs)',
                      padding: '6px',
                      textAlign: 'center',
                      borderBottom: '1px solid var(--color-gray-100)'
                    }}>
                      <div className="d-flex align-items-center justify-content-center gap-1">
                        <span className="text-truncate" style={{ maxWidth: '120px' }}>
                          {task.task_name || t(`type.${task.type}`)}
                        </span>
                        {isTaskUrgent && (
                          <AlertTriangle size={10} className="text-danger" />
                        )}
                      </div>
                    </td>
                    <td style={{
                      fontSize: 'var(--font-size-xs)',
                      padding: '6px',
                      textAlign: 'center',
                      borderBottom: '1px solid var(--color-gray-100)'
                    }}>
                      <span className="text-truncate" style={{ maxWidth: '100px', display: 'inline-block' }}>
                        {task.client.name}
                      </span>
                    </td>
                    <td style={{
                      fontSize: 'var(--font-size-xs)',
                      padding: '6px',
                      textAlign: 'center',
                      borderBottom: '1px solid var(--color-gray-100)'
                    }}>
                      <span 
                        className="badge" 
                        style={{ 
                          backgroundColor: statusBorderColor,
                          color: 'white',
                          fontSize: '10px'
                        }}
                      >
                        {task.status === 'New' ? 'جديد' :
                         task.status === 'Deferred' ? 'مؤجل' :
                         task.status === 'Pending Review' ? 'انتظار مراجعة' :
                         task.status === 'Completed' ? 'مكتمل' : task.status}
                      </span>
                    </td>
                    <td style={{
                      fontSize: 'var(--font-size-xs)',
                      padding: '6px',
                      textAlign: 'center',
                      borderBottom: '1px solid var(--color-gray-100)'
                    }}>
                      {formatDate(task.start_date).replace(/\/20/, '/')}
                    </td>
                    <td style={{
                      fontSize: 'var(--font-size-xs)',
                      padding: '6px',
                      textAlign: 'center',
                      borderBottom: '1px solid var(--color-gray-100)'
                    }}>
                      {formatDaysElapsed(task.start_date)}
                    </td>
                    <td style={{
                      padding: '6px',
                      textAlign: 'center',
                      borderBottom: '1px solid var(--color-gray-100)',
                      minWidth: '80px'
                    }}>
                      <div className="d-flex justify-content-center gap-1">
                        <button
                          className="btn btn-outline-secondary btn-sm p-1"
                          onClick={() => openDrawer('taskFollowUp', { 
                            taskId: task.id,
                            taskName: task.task_name || undefined,
                            clientName: task.client.name
                          })}
                          title="التعليقات"
                          style={{ fontSize: '10px', lineHeight: 1 }}
                        >
                          <MessageSquare size={10} />
                        </button>

                        <button
                          onClick={() => handleEditTask(task)}
                          className="btn btn-outline-info btn-sm p-1"
                          title="تفاصيل"
                          style={{ fontSize: '10px', lineHeight: 1 }}
                        >
                          <Eye size={10} />
                        </button>

                        <Dropdown>
                          <Dropdown.Toggle
                            variant="outline-secondary"
                            size="sm"
                            className="p-1"
                            style={{ fontSize: '10px' }}
                          >
                            <MoreVertical size={10} />
                          </Dropdown.Toggle>
                          {createPortal(
                            <Dropdown.Menu
                              align="end"
                              className="text-end"
                              style={{
                                position: 'absolute',
                                zIndex: 1050,
                                minWidth: '140px',
                                fontSize: 'var(--font-size-xs)',
                                direction: 'rtl',
                                textAlign: 'right'
                              }}
                            >
                              {task.status !== 'Completed' && task.status !== 'Pending Review' && (
                                <Dropdown.Item onClick={() => handleSubmitForReview(task)} className="text-end">
                                  <Upload size={11} className="ms-2" />
                                  إرسال للمراجعة
                                </Dropdown.Item>
                              )}
                              {task.status === 'New' ? (
                                <Dropdown.Item onClick={() => handleDefer(task)} className="text-end">
                                  <Pause size={11} className="ms-2" />
                                  تأجيل
                                </Dropdown.Item>
                              ) : task.status === 'Deferred' ? (
                                <Dropdown.Item onClick={() => handleResume(task)} className="text-end">
                                  <Play size={11} className="ms-2" />
                                  استئناف
                                </Dropdown.Item>
                              ) : null}
                              <Dropdown.Item onClick={() => handleShowRequirements(task)} className="text-end">
                                <ListChecks size={11} className="ms-2" />
                                المتطلبات
                              </Dropdown.Item>
                              <Dropdown.Item 
                                onClick={() => openDrawer('taskFollowUp', { 
                                  taskId: task.id,
                                  taskName: task.task_name || undefined,
                                  clientName: task.client.name
                                })} 
                                className="text-end"
                              >
                                <MessageSquare size={11} className="ms-2" />
                                التعليقات
                              </Dropdown.Item>
                              <Dropdown.Item onClick={() => handleToggleUrgentTag(task)} className="text-end">
                                <AlertTriangle size={11} className="ms-2" />
                                {isTaskUrgent ? 'إلغاء العاجل' : 'تعليم عاجل'}
                              </Dropdown.Item>
                            </Dropdown.Menu>,
                            document.body
                          )}
                        </Dropdown>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-4" style={{ fontSize: 'var(--font-size-sm)' }}>
                    لا توجد مهام حديثة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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

      {/* Compact floating row overlay for hovered task */}
      {hoveredTaskId && createPortal(
        (() => {
          const task = tasks.find(t => t.id === hoveredTaskId);
          if (!task) return null;
          
          const isTaskUrgent = task.tags?.some(tag => tag.name === 'قصوى');
          // Use faint, readable colors for portal
          let taskRowBackground;
          if (isTaskUrgent) {
            taskRowBackground = '#ffe6e6'; // Light red for urgent but readable
          } else {
            // Convert to faint but solid backgrounds
            switch (task.status) {
              case 'New':
                taskRowBackground = '#e6f3f7'; // Faint blue
                break;
              case 'Deferred':
                taskRowBackground = '#fff4e6'; // Faint yellow
                break;
              case 'Pending Review':
                taskRowBackground = '#f0f0f0'; // Faint gray
                break;
              case 'Completed':
                taskRowBackground = '#e6f7e6'; // Faint green
                break;
              default:
                taskRowBackground = '#f8f9fa'; // Very faint gray
            }
          }

          const overlayPosition = taskRowRect 
            ? calculateOverlayPosition(taskRowRect, 900, 130)
            : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', position: 'fixed' as const };

          return (
            <div
              className="task-portal"
              style={{
                ...overlayPosition,
                backgroundColor: taskRowBackground,
                border: '2px solid var(--color-primary)',
                borderRadius: 'var(--border-radius-lg)',
                boxShadow: 'var(--shadow-xl)',
                zIndex: 10000,
                pointerEvents: 'auto',
                minWidth: '900px',
                padding: '0'
              }}
              onMouseEnter={handlePortalMouseEnter}
              onMouseLeave={handlePortalMouseLeave}
            >
              <table style={{ width: '100%', margin: 0 }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-gray-100)' }}>
                    <th style={{ padding: '8px 12px', fontSize: 'var(--font-size-sm)', textAlign: 'center' }}>المهمة</th>
                    <th style={{ padding: '8px 12px', fontSize: 'var(--font-size-sm)', textAlign: 'center' }}>العميل</th>
                    <th style={{ padding: '8px 12px', fontSize: 'var(--font-size-sm)', textAlign: 'center' }}>الحالة</th>
                    <th style={{ padding: '8px 12px', fontSize: 'var(--font-size-sm)', textAlign: 'center' }}>التاريخ</th>
                    <th style={{ padding: '8px 12px', fontSize: 'var(--font-size-sm)', textAlign: 'center' }}>المدة</th>
                    <th style={{ padding: '8px 12px', fontSize: 'var(--font-size-sm)', textAlign: 'center', minWidth: '250px' }}>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '12px', fontSize: 'var(--font-size-sm)', textAlign: 'center' }}>
                      <div className="d-flex align-items-center justify-content-center gap-1">
                        <span>{task.task_name || t(`type.${task.type}`)}</span>
                        {isTaskUrgent && (
                          <AlertTriangle size={16} className="text-danger" />
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px', fontSize: 'var(--font-size-sm)', textAlign: 'center' }}>
                      {task.client.name}
                    </td>
                    <td style={{ padding: '12px', fontSize: 'var(--font-size-sm)', textAlign: 'center' }}>
                      <span 
                        className="badge" 
                        style={{ 
                          backgroundColor: getBorderColor(task.status),
                          color: 'white'
                        }}
                      >
                        {task.status === 'New' ? 'جديد' :
                         task.status === 'Deferred' ? 'مؤجل' :
                         task.status === 'Pending Review' ? 'انتظار مراجعة' :
                         task.status === 'Completed' ? 'مكتمل' : task.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: 'var(--font-size-sm)', textAlign: 'center' }}>
                      {formatDate(task.start_date).replace(/\/20/, '/')}
                    </td>
                    <td style={{ padding: '12px', fontSize: 'var(--font-size-sm)', textAlign: 'center' }}>
                      {formatDaysElapsed(task.start_date)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div className="d-flex gap-1 justify-content-center flex-wrap">
                        <button
                          onClick={() => {
                            handleEditTask(task);
                            setHoveredTaskId(null);
                          }}
                          className="btn btn-outline-info btn-sm"
                          title="تفاصيل"
                          style={{ fontSize: '0.75em' }}
                        >
                          <Eye size={12} />
                        </button>
                        {task.status !== 'Completed' && task.status !== 'Pending Review' && (
                          <button
                            onClick={() => {
                              handleSubmitForReview(task);
                              setHoveredTaskId(null);
                            }}
                            className="btn btn-outline-success btn-sm"
                            title="إرسال للمراجعة"
                            style={{ fontSize: '0.75em' }}
                          >
                            <Upload size={12} />
                          </button>
                        )}
                        {task.status === 'New' ? (
                          <button
                            onClick={() => {
                              handleDefer(task);
                              setHoveredTaskId(null);
                            }}
                            className="btn btn-outline-warning btn-sm"
                            title="تأجيل"
                            style={{ fontSize: '0.75em' }}
                          >
                            <Pause size={12} />
                          </button>
                        ) : task.status === 'Deferred' ? (
                          <button
                            onClick={() => {
                              handleResume(task);
                              setHoveredTaskId(null);
                            }}
                            className="btn btn-outline-primary btn-sm"
                            title="استئناف"
                            style={{ fontSize: '0.75em' }}
                          >
                            <Play size={12} />
                          </button>
                        ) : null}
                        <button
                          onClick={() => {
                            handleShowRequirements(task);
                            setHoveredTaskId(null);
                          }}
                          className="btn btn-outline-secondary btn-sm"
                          title="المتطلبات"
                          style={{ fontSize: '0.75em' }}
                        >
                          <ListChecks size={12} />
                        </button>
                        <button
                          onClick={() => {
                            openDrawer('taskFollowUp', { 
                              taskId: task.id,
                              taskName: task.task_name || undefined,
                              clientName: task.client.name
                            });
                            setHoveredTaskId(null);
                          }}
                          className="btn btn-outline-info btn-sm"
                          title="التعليقات"
                          style={{ fontSize: '0.75em' }}
                        >
                          <MessageSquare size={12} />
                        </button>
                        <button
                          onClick={() => {
                            handleToggleUrgentTag(task);
                            setHoveredTaskId(null);
                          }}
                          className="btn btn-outline-danger btn-sm"
                          title={isTaskUrgent ? 'إلغاء العاجل' : 'تعليم عاجل'}
                          style={{ fontSize: '0.75em' }}
                        >
                          <AlertTriangle size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })(),
        document.body
      )}
    </div>
  );
};

export default RecentTasksPanel;
