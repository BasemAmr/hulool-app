// src/components/dashboard/DashboardClientCard.tsx
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useModalStore } from '../../stores/modalStore';
import { useDrawerStore } from '../../stores/drawerStore';
import { useToast } from '../../hooks/useToast';
import { useDeferTask, useResumeTask, useUpdateTask } from '../../queries/taskQueries';
import type { Task } from '../../api/types';
import { formatDate } from '../../utils/dateUtils';
import { Dropdown } from 'react-bootstrap';
import {
  Receipt,
  Check,
  Pause,
  Play,
  ListChecks,
  MoreVertical,
  AlertTriangle,
  Eye,
  MessageSquare,
} from 'lucide-react';
import WhatsAppIcon from '../../assets/images/whats.svg';
import GoogleDriveIcon from '../../assets/images/googe_drive.svg';
import type { ClientWithTasksAndStats } from '../../queries/dashboardQueries';
import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';

interface DashboardClientCardProps {
  data: ClientWithTasksAndStats;
  index?: number;
  alternatingColors: string[];
}

const hexToRgba = (hex: string, opacity: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

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

const DashboardClientCard = ({ data, index = 0, alternatingColors }: DashboardClientCardProps) => {
  const { client, tasks } = data;
  const { t } = useTranslation();
  const openModal = useModalStore(state => state.openModal);
  const { openDrawer } = useDrawerStore();
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  const deferTaskMutation = useDeferTask();
  const resumeTaskMutation = useResumeTask();
  const updateTaskMutation = useUpdateTask();
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
    }, 200); // 200ms delay
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
    // Immediately hide since user is moving away from portal
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
    let top = taskRect.top + scrollY + (taskRect.height / 2) - (overlayHeight / 2); // Centered over the row

    // Check horizontal boundaries
    if (left < 20) {
      left = 20; // 20px margin from left edge
    } else if (left + overlayWidth > viewportWidth - 20) {
      left = viewportWidth - overlayWidth - 20; // 20px margin from right edge
    }

    // Check vertical boundaries
    if (top < 20) {
      // If not enough space above, place below the row
      top = taskRect.bottom + scrollY + 10;
    }

    // Final check if it goes beyond bottom
    if (top + overlayHeight > viewportHeight + scrollY - 20) {
      // If still not enough space, place it in the middle of visible area
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
  const handleComplete = (task: Task) => openModal('taskCompletion', { task });
  const handleShowRequirements = (task: Task) => openModal('requirements', { task });
  const handleAddTask = () => openModal('taskForm', { client });
  const handleAddReceivable = () => openModal('manualReceivable', { client_id: client.id });
  const handleRecordCredit = () => openModal('recordCreditModal', { client });

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

  // Check if client has urgent tasks
  const isClientUrgent = tasks.some(task => task.tags?.some(tag => tag.name === 'قصوى'));
  // const hasUrgentTasks = tasks.filter(task => task.tags?.some(tag => tag.name === 'قصوى')).length > 0;

  // Define stronger alternating colors for headers
  // Color scheme logic
  let headerColor, borderColor, row1Color, row2Color;

  if (isClientUrgent) {
    headerColor = hexToRgba('#dc3545', 0.8); // Red for urgent
    borderColor = hexToRgba('#c82333', 0.6);
    row1Color = hexToRgba('#ffebeb', 0.5);
    row2Color = hexToRgba('#ffe6e6', 0.5);
  } else {
    // Use the stronger alternatingColors as header colors
    const colorIndex = index % 2;
    const baseColor = alternatingColors[colorIndex] || alternatingColors[0];

    // Create stronger color for header (darker version)
    headerColor = baseColor === '#e3f2fd' ? '#1976d2' : // Blue stronger
      baseColor === '#bbdefb' ? '#0d47a1' : // Blue darker
        baseColor === '#fff8e1' ? '#f57f17' : // Yellow stronger  
          baseColor === '#ffecb3' ? '#ff8f00' : // Yellow darker
            baseColor === '#e8f5e8' ? '#2e7d32' : // Green stronger
              baseColor === '#c8e6c9' ? '#1b5e20' : // Green darker
                baseColor === '#f8f9fa' ? '#495057' : // Gray stronger
                  '#343a40'; // Gray darker
    headerColor = hexToRgba(headerColor, 0.5)
    // Create border color (slightly darker than header)
    borderColor = headerColor;

    // Create fainter colors using reduced opacity of the base alternating colors
    row1Color = hexToRgba(alternatingColors[1], 0.3); // Very faint
    row2Color = hexToRgba(alternatingColors[1], 1); // Slightly more visible
  }

  const openGoogleDrive = () => {
    if (client.google_drive_link) {
      window.open(client.google_drive_link, '_blank');
    }
  };

  const openWhatsApp = () => {
    const phoneNumber = client.phone.replace(/[^0-9]/g, '');
    const whatsappUrl = `https://wa.me/+966${phoneNumber}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleEditTask = (task: Task) => openModal('taskForm', { taskToEdit: task, client });

  // Custom hook for dropdown positioning
  const useDropdownPosition = (isOpen: boolean) => {
    const triggerRef = useRef<HTMLButtonElement>(null);
    const [position, setPosition] = useState({ top: 0, left: 0 });

    useEffect(() => {
      if (isOpen && triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setPosition({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX - 100,
        });
      }
    }, [isOpen]);

    return { triggerRef, position };
  };

  // Header dropdown component
  const HeaderDropdownSection = ({
    handleAddTask,
    handleAddReceivable,
    handleRecordCredit
  }: {
    handleAddTask: () => void;
    handleAddReceivable: () => void;
    handleRecordCredit: () => void;
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { triggerRef, position } = useDropdownPosition(isOpen);

    return (
      <div>
        <button
          ref={triggerRef}
          onClick={() => setIsOpen(!isOpen)}
          className="btn btn-outline-light btn-sm p-1 border-0 text-black"
        >
          <MoreVertical size={14} />
        </button>

        {isOpen && createPortal(
          <>
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1040,
              }}
              onClick={() => setIsOpen(false)}
            />

            <div
              className="dropdown-menu show"
              style={{
                position: 'absolute',
                top: position.top,
                left: position.left,
                zIndex: 1050,
                minWidth: '120px',
                fontSize: '0.85em',
                direction: 'rtl',
                textAlign: 'right'
              }}
            >
              <button
                className="dropdown-item text-end"
                onClick={() => {
                  handleAddTask();
                  setIsOpen(false);
                }}
              >
                <Receipt size={14} className="ms-2" />
                إضافة مهمة
              </button>
              <button
                className="dropdown-item text-end"
                onClick={() => {
                  handleAddReceivable();
                  setIsOpen(false);
                }}
              >
                <Receipt size={14} className="ms-2" />
                إضافة مستحق
              </button>
              <button
                className="dropdown-item text-end"
                onClick={() => {
                  handleRecordCredit();
                  setIsOpen(false);
                }}
              >
                <Receipt size={14} className="ms-2" />
                إضافة دفعة
              </button>
            </div>
          </>,
          document.body
        )}
      </div>
    );
  };

  return (
    <div
      className="card h-100 shadow-sm dashboard-client-card"
      style={{
        borderRadius: '0px', // No border radius
        border: `3px solid ${borderColor}`, // Increased border width
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* Header with alternating strong colors */}
      <div
        className="card-header border-0 py-2"
        style={{
          backgroundColor: headerColor,
          borderRadius: 0
        }}
      >
        <div className="d-flex justify-content-between align-items-center">
          {/* Left: WhatsApp with phone number */}
          <div className="d-flex align-items-center gap-2">
            <button
              onClick={openWhatsApp}
              className="btn btn-sm btn-outline-light p-1 border-0"
              title="واتساب"
            >
              <img src={WhatsAppIcon} alt="WhatsApp" width="16" height="16" />
            </button>
            <span style={{ fontSize: '0.85em' }}>
              {client.phone || ''}
            </span>
          </div>

          {/* Center: Client name with Google Drive */}
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
            <button
              onClick={openGoogleDrive}
              className="btn btn-sm btn-outline-light p-1 text-black border-0"
              title="Google Drive"
              disabled={!client.google_drive_link}
            >
              <img src={GoogleDriveIcon} alt="Google Drive" width="16" height="16" />
            </button>
          </div>

          {/* Right: Actions Dropdown */}
          <HeaderDropdownSection
            handleAddTask={handleAddTask}
            handleAddReceivable={handleAddReceivable}
            handleRecordCredit={handleRecordCredit}
          />
        </div>
      </div>

      {/* Body - Tasks Table */}
      <div
        className="card-body p-0"
        style={{
          position: 'relative',
          backgroundColor: row1Color,
          overflow: 'hidden'
        }}
      >
        <div className="table-responsive" style={{
          overflow: 'hidden'
        }}>
          <div style={{
            // ADJUSTED: Allow natural height growth within the flex container
            // maxHeight: '300px', // Removed fixed max-height
            overflow: 'hidden',
            position: 'relative'
          }}>
            <table className="table table-sm mb-0">
              {/* Sticky table header */}
              <thead
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 1,
                  border: 'none'
                }}
              >
                <tr>
                  <th style={{
                    fontSize: '0.8em',
                    padding: '6px 8px',
                    backgroundColor: headerColor,
                    border: 'none'
                  }}>المهمة</th>
                  <th style={{
                    fontSize: '0.8em',
                    padding: '6px 8px',
                    backgroundColor: headerColor,
                    border: 'none'
                  }}>تاريخ</th>
                  <th style={{
                    fontSize: '0.8em',
                    padding: '6px 8px',
                    backgroundColor: headerColor,
                    border: 'none'
                  }}>اليوم</th>
                  <th style={{
                    fontSize: '0.8em',
                    padding: '6px 8px',
                    backgroundColor: headerColor,
                    border: 'none'
                  }}>المبلغ</th>
                  <th style={{
                    fontSize: '0.8em',
                    padding: '6px 8px',
                    width: '80px',
                    minWidth: '80px',
                    backgroundColor: headerColor,
                    border: 'none'
                  }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task, taskIndex) => {
                  const isTaskUrgent = task.tags?.some(tag => tag.name === 'قصوى');

                  // Row background logic
                  let rowBackground;
                  if (isTaskUrgent) {
                    rowBackground = '#ffcccc'; // Red for urgent tasks
                  } else {
                    rowBackground = taskIndex % 2 === 0 ? row1Color : row2Color;
                  }

                  return (
                    <tr
                      key={task.id}
                      className="task-row"
                      data-task-id={task.id}
                      style={{
                        backgroundColor: rowBackground,
                        transition: 'all 0.2s ease-in-out',
                        border: 'none',
                        position: 'relative'
                      }}
                      onMouseEnter={(e) => handleRowMouseEnter(task.id, e)}
                      onMouseLeave={handleRowMouseLeave}
                    >
                      <td style={{
                        fontSize: '0.82em',
                        padding: '8px',
                        color: 'black',
                        backgroundColor: rowBackground,
                        border: 'none'
                      }}>
                        <div className="d-flex align-items-center gap-1">
                          <span className="text-truncate" style={{ maxWidth: 180, display: 'inline-block' }}>
                            {task.task_name || t(`type.${task.type}`)}
                          </span>
                          {task.tags?.some(tag => tag.name === 'قصوى') && (
                            <AlertTriangle size={10} className="text-danger" />
                          )}
                        </div>
                      </td>
                      <td style={{
                        fontSize: '0.77em',
                        padding: '8px',
                        color: 'black',
                        backgroundColor: rowBackground,
                        border: 'none'
                      }}>
                        {formatDate(task.start_date).replace(/\/20/, '/')}
                      </td>
                      <td style={{
                        fontSize: '0.77em',
                        padding: '8px',
                        color: 'black',
                        backgroundColor: rowBackground,
                        border: 'none'
                      }}>
                        {formatDaysElapsed(task.start_date)}
                      </td>
                      <td style={{
                        fontSize: '0.77em',
                        padding: '8px',
                        color: 'black',
                        backgroundColor: rowBackground,
                        border: 'none'
                      }} className="text-success fw-bold">
                        <div className="d-flex align-items-center text-danger">
                          <svg
                            width={10}
                            height={10}
                            viewBox="0 0 1124.14 1256.39"
                            style={{
                              marginLeft: '2px',
                              verticalAlign: 'middle'
                            }}
                          >
                            <path
                              d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z"
                              fill="#f00"
                            />
                            <path
                              d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z"
                              fill="#f00"
                            />
                          </svg>
                          {task.amount?.toLocaleString()}
                        </div>
                      </td>
                      <td 
                        className="task-actions"
                        style={{
                          padding: '8px',
                          position: 'relative',
                          color: 'black',
                          backgroundColor: rowBackground,
                          border: 'none',
                          minWidth: '80px',
                          whiteSpace: 'nowrap'
                        }}>
                        <div className="d-flex gap-1" style={{ 
                          justifyContent: 'flex-start',
                          minWidth: 'fit-content'
                        }}>
                          <button
                            className="btn btn-outline-secondary btn-sm p-1 me-1"
                            onClick={() => openDrawer('taskFollowUp', { 
                              taskId: task.id,
                              taskName: task.task_name || undefined,
                              clientName: client.name
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
                                align={"end"}
                                className="text-end"
                                style={{
                                  position: 'absolute',
                                  zIndex: 1050,
                                  minWidth: '120px',
                                  fontSize: '0.85em',
                                  top: 'auto',
                                  left: 'auto',
                                  transform: 'none'
                                }}
                              >
                                <Dropdown.Item onClick={() => handleComplete(task)} className="text-end">
                                  <Check size={11} className="ms-2" />
                                  إكمال
                                </Dropdown.Item>
                                {task.status === 'New' ? (
                                  <Dropdown.Item onClick={() => handleDefer(task)} className="text-end">
                                    <Pause size={11} className="ms-2" />
                                    تأجيل
                                  </Dropdown.Item>
                                ) : (
                                  <Dropdown.Item onClick={() => handleResume(task)} className="text-end">
                                    <Play size={11} className="ms-2" />
                                    استئناف
                                  </Dropdown.Item>
                                )}
                                <Dropdown.Item onClick={() => handleShowRequirements(task)} className="text-end">
                                  <ListChecks size={11} className="ms-2" />
                                  المتطلبات
                                </Dropdown.Item>
                                <Dropdown.Item 
                                  onClick={() => openDrawer('taskFollowUp', { 
                                    taskId: task.id,
                                    taskName: task.task_name || undefined,
                                    clientName: client.name
                                  })} 
                                  className="text-end"
                                >
                                  <MessageSquare size={11} className="ms-2" />
                                  التعليقات
                                </Dropdown.Item>
                                <Dropdown.Item onClick={() => handleToggleUrgentTag(task)} className="text-end">
                                  <AlertTriangle size={11} className="ms-2" />
                                  {task.tags?.some(tag => tag.name === 'قصوى') ? 'إلغاء العاجل' : 'تعليم عاجل'}
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
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Compact floating row overlay for hovered task */}
      {hoveredTaskId && createPortal(
        (() => {
          const task = tasks.find(t => t.id === hoveredTaskId);
          if (!task) return null;
          
          const isTaskUrgent = task.tags?.some(tag => tag.name === 'قصوى');
          let taskRowBackground;
          if (isTaskUrgent) {
            taskRowBackground = 'rgba(255, 204, 204, 1)'; // Full opacity for urgent
          } else {
            const taskIndex = tasks.findIndex(t => t.id === task.id);
            const baseColor = taskIndex % 2 === 0 ? row1Color : row2Color;
            // Convert to full opacity
            taskRowBackground = baseColor.includes('rgba') 
              ? baseColor.replace(/[\d\.]+\)$/g, '1)')  // Change last number to 1
              : baseColor;
          }

          const overlayPosition = taskRowRect 
            ? calculateOverlayPosition(taskRowRect, 800, 120)
            : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', position: 'fixed' as const };

          return (
            <div
              className="task-portal"
              style={{
                ...overlayPosition,
                backgroundColor: taskRowBackground,
                border: '2px solid #007bff',
                borderRadius: '8px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                zIndex: 10000,
                pointerEvents: 'auto',
                minWidth: '800px',
                padding: '0'
              }}
              onMouseEnter={handlePortalMouseEnter}
              onMouseLeave={handlePortalMouseLeave}
            >
              {/* Compact table row format */}
              <table style={{ width: '100%', margin: 0 }}>
                <thead>
                  <tr style={{ backgroundColor: 'rgba(0, 123, 255, 0.1)' }}>
                    <th style={{ padding: '8px 12px', fontSize: '0.85em', textAlign: 'center' }}>المهمة</th>
                    <th style={{ padding: '8px 12px', fontSize: '0.85em', textAlign: 'center' }}>التاريخ</th>
                    <th style={{ padding: '8px 12px', fontSize: '0.85em', textAlign: 'center' }}>المدة</th>
                    <th style={{ padding: '8px 12px', fontSize: '0.85em', textAlign: 'center' }}>المبلغ</th>
                    <th style={{ padding: '8px 12px', fontSize: '0.85em', textAlign: 'center', minWidth: '200px' }}>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '12px', fontSize: '0.9em', textAlign: 'center' }}>
                      <div className="d-flex align-items-center justify-content-center gap-1">
                        <span>{task.task_name || t(`type.${task.type}`)}</span>
                        {task.tags?.some(tag => tag.name === 'قصوى') && (
                          <AlertTriangle size={16} className="text-danger" />
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px', fontSize: '0.9em', textAlign: 'center' }}>
                      {formatDate(task.start_date).replace(/\/20/, '/')}
                    </td>
                    <td style={{ padding: '12px', fontSize: '0.9em', textAlign: 'center' }}>
                      {formatDaysElapsed(task.start_date)}
                    </td>
                    <td style={{ padding: '12px', fontSize: '0.9em', textAlign: 'center', color: '#dc3545', fontWeight: 'bold' }}>
                      {task.amount?.toLocaleString()} ريال
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
                        <button
                          onClick={() => {
                            handleComplete(task);
                            setHoveredTaskId(null);
                          }}
                          className="btn btn-outline-success btn-sm"
                          title="إكمال"
                          style={{ fontSize: '0.75em' }}
                        >
                          <Check size={12} />
                        </button>
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
                        ) : (
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
                        )}
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
                              clientName: client.name
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
                          title={task.tags?.some(tag => tag.name === 'قصوى') ? 'إلغاء العاجل' : 'تعليم عاجل'}
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

export default DashboardClientCard;

