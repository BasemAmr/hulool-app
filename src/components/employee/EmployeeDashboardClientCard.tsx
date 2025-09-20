// src/components/employee/EmployeeDashboardClientCard.tsx
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useModalStore } from '../../stores/modalStore';
import { useDrawerStore } from '../../stores/drawerStore';
import { useToast } from '../../hooks/useToast';
import { useDeferTask, useResumeTask, useUpdateTask, useCancelTask } from '../../queries/taskQueries';
import { useSubmitTaskForReview } from '../../queries/employeeTasksQueries';
import type { Task } from '../../api/types';
import { formatDate } from '../../utils/dateUtils';
import { Dropdown } from 'react-bootstrap';
import {
  Receipt,
  MoreVertical,
  AlertTriangle,
  Eye,
  MessageSquare,
  ListChecks,
  Upload,
  Pause,
  Play,
  X
} from 'lucide-react';
import WhatsAppIcon from '../../assets/images/whats.svg';
import GoogleDriveIcon from '../../assets/images/googe_drive.svg';
import type { ClientWithTasksAndStats } from '../../queries/dashboardQueries';
import { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface EmployeeDashboardClientCardProps {
  data: ClientWithTasksAndStats;
  index?: number;
  alternatingColors: string[];
  onWidthCalculated?: (width: string) => void;
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

const EmployeeDashboardClientCard = ({ data, index = 0, alternatingColors, onWidthCalculated }: EmployeeDashboardClientCardProps) => {
  const { client, tasks } = data;
  const { t } = useTranslation();
  const openModal = useModalStore(state => state.openModal);
  const { openDrawer } = useDrawerStore();
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  const deferTaskMutation = useDeferTask();
  const resumeTaskMutation = useResumeTask();
  const updateTaskMutation = useUpdateTask();
  const submitForReviewMutation = useSubmitTaskForReview();
  const cancelTaskMutation = useCancelTask();
  const cardRef = useRef<HTMLDivElement>(null);
  const taskRowRefs = useRef<(HTMLTableRowElement | null)[]>([]);
  const cardBodyRef = useRef<HTMLDivElement>(null);
  const dropdownMenuRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [activeDropdownTaskId, setActiveDropdownTaskId] = useState<number | null>(null);

  // Calculate dynamic width on hover
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

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeDropdownTaskId && dropdownPosition) {
        // Check if click was outside the dropdown menu and toggle button
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
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'employee', 'clientsWithActiveTasks'] });
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
      onSuccess: () => {
        success('تم الإرسال', `تم إرسال المهمة "${task.task_name || 'مهمة'}" للمراجعة بنجاح`);
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'employee', 'clientsWithActiveTasks'] });
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
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'employee', 'clientsWithActiveTasks'] });
      },
      onError: (err: any) => {
        error('خطأ', err.message || 'حدث خطأ أثناء إلغاء المهمة');
      }
    });
  };
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
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'employee', 'clientsWithActiveTasks'] });
      },
      onError: (err: any) => {
        error('خطأ', err.message || 'حدث خطأ أثناء تحديث علامة العاجل');
      }
    });
  };

  // Check if client has urgent tasks
  const isClientUrgent = tasks.some(task => task.tags?.some(tag => tag.name === 'قصوى'));

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

  const handleViewSubtasks = (task: Task) => openModal('taskForm', { taskToEdit: task, client: task.client });

  // Header dropdown component using Bootstrap Dropdown for consistency
  const HeaderDropdownSection = ({
    handleAddTask,
    handleAddReceivable,
    handleRecordCredit
  }: {
    handleAddTask: () => void;
    handleAddReceivable: () => void;
    handleRecordCredit: () => void;
  }) => {
    return (
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
          <Dropdown.Item
            onClick={() => handleAddTask()}
            className="text-end"
          >
            <Receipt size={14} className="ms-2" />
            إضافة مهمة
          </Dropdown.Item>
          <Dropdown.Item
            onClick={() => handleAddReceivable()}
            className="text-end"
          >
            <Receipt size={14} className="ms-2" />
            إضافة مستحق
          </Dropdown.Item>
          <Dropdown.Item
            onClick={() => handleRecordCredit()}
            className="text-end"
          >
            <Receipt size={14} className="ms-2" />
            إضافة دفعة
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    );
  };

  return (
    <div
      ref={cardRef}
      className="card h-100 shadow-sm employee-dashboard-client-card"
      style={{
        borderRadius: '0px', // No border radius
        border: `3px solid ${borderColor}`, // Increased border width
        overflow: 'hidden', // Hide overflow normally, show on hover
        position: 'relative',
        transition: 'all 0.3s ease-in-out',
        transform: 'scale(1)',
      }}
      onMouseEnter={(e) => {
        setIsHovered(true);
        e.currentTarget.style.transform = 'scale(1.02)';
        e.currentTarget.style.zIndex = '10';
        e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
        e.currentTarget.style.overflow = 'visible'; // Show overflow on hover
      }}
      onMouseLeave={(e) => {
        setIsHovered(false);
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.zIndex = '1';
        e.currentTarget.style.boxShadow = '';
        e.currentTarget.style.overflow = 'hidden'; // Hide overflow on mouse leave
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
              to={`/employee/clients/${client.id}`}
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
        ref={cardBodyRef}
        className="card-body p-0"
        style={{
          position: 'relative',
          backgroundColor: row1Color,
          overflow: 'visible',
        }}
      >
        <div
          className="table-responsive"
          style={{
            overflow: 'hidden', // Match card overflow behavior
            position: 'relative'
          }}
        >
          <table className="table table-sm mb-0">
            {/* Sticky table header */}
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
            <tbody
              style={{
                overflow: 'hidden'
              }}
            >
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
                    ref={(el) => { taskRowRefs.current[taskIndex] = el; }}
                    key={task.id}
                    className="task-row"
                    data-task-id={task.id}
                    style={{
                      backgroundColor: rowBackground,
                      transition: 'all 0.2s ease-in-out',
                      border: 'none',
                      position: 'relative'
                    }}
                  >
                    <td style={{
                      fontSize: '0.82em',
                      padding: '8px',
                      color: 'black',
                      backgroundColor: rowBackground,
                      border: 'none'
                    }}>
                      <div className="d-flex align-items-center gap-1">
                        <span className="text-truncate" style={{ maxWidth: '120px' }}>
                          {task.task_name || t(`type.${task.type}`)}
                        </span>
                        {isTaskUrgent && (
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
                      {task.prepaid_amount > 0 ? (
                        <div>
                          <div>{task.amount.toLocaleString()} ر.س</div>
                          <small className="text-muted">
                            مدفوع: {task.prepaid_amount.toLocaleString()} ر.س
                          </small>
                        </div>
                      ) : (
                        <span>{task.amount.toLocaleString()} ر.س</span>
                      )}
                    </td>
                    <td
                      className="task-actions"
                      style={{
                        padding: '8px',
                        position: 'static',
                        color: 'black',
                        backgroundColor: rowBackground,
                        border: 'none',
                        minWidth: '80px',
                        whiteSpace: 'nowrap'
                      }}>
                      <div className="d-flex gap-1 justify-content-center">
                        {/* View Subtasks (Eye icon) */}
                        <button
                          onClick={() => handleViewSubtasks(task)}
                          className="btn btn-outline-info btn-sm p-1"
                          title="المهام الفرعية"
                          style={{ fontSize: '10px', lineHeight: 1 }}
                        >
                          <Eye size={10} />
                        </button>

                        {/* Dropdown with actions */}
                        <div style={{ position: 'relative' }}>
                          <Dropdown show={activeDropdownTaskId === task.id} onToggle={(isOpen) => {
                            if (isOpen) {
                              setActiveDropdownTaskId(task.id);
                              // Calculate position relative to the trigger button
                              const triggerElement = document.querySelector(`[data-task-id="${task.id}"] .dropdown-toggle`) as HTMLElement;
                              if (triggerElement && cardBodyRef.current) {
                                const triggerRect = triggerElement.getBoundingClientRect();
                                const cardBodyRect = cardBodyRef.current.getBoundingClientRect();
                                setDropdownPosition({
                                  top: triggerRect.bottom - cardBodyRect.top + 2,
                                  left: triggerRect.right - cardBodyRect.left - 120 // 120px is menu width
                                });
                              }
                            } else {
                              setActiveDropdownTaskId(null);
                              setDropdownPosition(null);
                            }
                          }}>
                            <Dropdown.Toggle
                              variant="outline-secondary"
                              size="sm"
                              className="p-1"
                              style={{ fontSize: '10px' }}
                              data-task-id={task.id}
                            >
                              <MoreVertical size={10} />
                            </Dropdown.Toggle>
                          </Dropdown>
                        </div>
                      </div>
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
                  minWidth: '140px',
                  fontSize: '0.85em',
                  position: 'absolute',
                  top: dropdownPosition.top,
                  left: dropdownPosition.left,
                  marginTop: '2px'
                }}
              >
                {/* Submit for Review */}
                {task.status !== 'Completed' && task.status !== 'Pending Review' && (
                  <Dropdown.Item onClick={() => handleSubmitForReview(task)} className="text-end">
                    <Upload size={11} className="ms-2" />
                    إرسال للمراجعة
                  </Dropdown.Item>
                )}
                
                {/* Defer/Resume */}
                {task.status === 'New' && (
                  <Dropdown.Item onClick={() => handleDefer(task)} className="text-end">
                    <Pause size={11} className="ms-2" />
                    تأجيل
                  </Dropdown.Item>
                )}
                {task.status === 'Deferred' && (
                  <Dropdown.Item onClick={() => handleResume(task)} className="text-end">
                    <Play size={11} className="ms-2" />
                    استئناف
                  </Dropdown.Item>
                )}
                
                {/* Requirements */}
                <Dropdown.Item onClick={() => handleShowRequirements(task)} className="text-end">
                  <ListChecks size={11} className="ms-2" />
                  المتطلبات
                </Dropdown.Item>
                
                {/* Comments */}
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
                
                {/* Toggle Urgent */}
                <Dropdown.Item onClick={() => handleToggleUrgentTag(task)} className="text-end">
                  <AlertTriangle size={11} className="ms-2" />
                  {task.tags?.some(tag => tag.name === 'قصوى') ? 'إلغاء العاجل' : 'تعليم عاجل'}
                </Dropdown.Item>
                
                <Dropdown.Divider />
                
                {/* Cancel Task - only for non-completed tasks */}
                {task.status !== 'Completed' && task.status !== 'Cancelled' && (
                  <Dropdown.Item onClick={() => handleCancelTask(task)} className="text-end text-danger">
                    <X size={11} className="ms-2" />
                    إلغاء المهمة
                  </Dropdown.Item>
                )}
              </Dropdown.Menu>
            </div>,
            cardBodyRef.current
          );
        })()}
      </div>
    </div>
  );
};

export default EmployeeDashboardClientCard;