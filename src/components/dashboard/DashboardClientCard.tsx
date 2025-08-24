// src/components/dashboard/DashboardClientCard.tsx
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useModalStore } from '../../stores/modalStore';
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
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  const deferTaskMutation = useDeferTask();
  const resumeTaskMutation = useResumeTask();
  const updateTaskMutation = useUpdateTask();

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
    headerColor = '#dc3545'; // Red for urgent
    borderColor = '#c82333';
    row1Color = '#ffebeb';
    row2Color = '#ffe6e6';
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
        overflow: 'hidden'
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
            maxHeight: '300px', overflow: 'hidden'
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
                    width: '60px',
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
                      style={{
                        backgroundColor: rowBackground,
                        transition: 'all 0.2s ease-in-out',
                        border: 'none'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.02)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                        e.currentTarget.style.zIndex = '2';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.zIndex = '1';
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
                      <td style={{
                        padding: '8px',
                        position: 'relative',
                        color: 'black',
                        backgroundColor: rowBackground,
                        border: 'none'
                      }}>
                        <div className="d-flex gap-1">
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
    </div>
  );
};

export default DashboardClientCard;

