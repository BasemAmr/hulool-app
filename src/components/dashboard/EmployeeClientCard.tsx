// Employee view of client dashboard card - grouped by client for employee's own tasks
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useModalStore } from '../../stores/modalStore';
import { useDrawerStore } from '../../stores/drawerStore';
import { useToast } from '../../hooks/useToast';
import { useDeferTask, useResumeTask, useUpdateTask, useCancelTask, useRestoreTask } from '../../queries/taskQueries';
import type { Task } from '../../api/types';
import { Dropdown } from 'react-bootstrap';
import {
  AlertTriangle,
  Eye,
  MessageSquare,
  ListChecks,
  Pause,
  Play,
  X,
  MoreVertical,
  RotateCcw
} from 'lucide-react';
import WhatsAppIcon from '../../assets/images/whats.svg';
import GoogleDriveIcon from '../../assets/images/googe_drive.svg';
import { useRef, useEffect, useState } from 'react';

interface EmployeeClientCardProps {
  clientName: string;
  clientPhone: string;
  clientId: number;
  googleDriveLink?: string;
  tasks: Task[];
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

const EmployeeClientCard = ({
  clientName,
  clientPhone,
  clientId,
  googleDriveLink,
  tasks,
  index = 0,
  alternatingColors,
  onWidthCalculated
}: EmployeeClientCardProps) => {
  const { t } = useTranslation();
  const openModal = useModalStore(state => state.openModal);
  const { openDrawer } = useDrawerStore();
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  const deferTaskMutation = useDeferTask();
  const resumeTaskMutation = useResumeTask();
  const updateTaskMutation = useUpdateTask();
  const cancelTaskMutation = useCancelTask();
  const restoreTaskMutation = useRestoreTask();
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
  
  const handleRestore = (task: Task) => {
    restoreTaskMutation.mutate({ id: task.id }, {
      onSuccess: () => {
        success('تمت الاستعادة', `تم استعادة المهمة "${task.task_name || t(`type.${task.type}`)}" إلى حالة جديدة`);
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'clientsWithActiveTasks'] });
      },
      onError: (err: any) => {
        error('خطأ', err.message || 'حدث خطأ أثناء استعادة المهمة');
      }
    });
  };

  const handleComplete = (task: Task) => openModal('taskCompletion', { task });
  const handleShowRequirements = (task: Task) => openModal('requirements', { task });
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

  const handleViewSubtasks = (task: Task) => openModal('taskForm', { taskToEdit: task, client: { id: clientId, name: clientName, phone: clientPhone, region_id: 0, google_drive_link: googleDriveLink || '', created_at: '', updated_at: '' } });

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

  const openGoogleDrive = () => {
    if (googleDriveLink) {
      window.open(googleDriveLink, '_blank');
    }
  };

  const openWhatsApp = () => {
    const phoneNumber = clientPhone.replace(/[^0-9]/g, '');
    const whatsappUrl = `https://wa.me/+966${phoneNumber}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div
      ref={cardRef}
      className="card h-100 shadow-sm employee-client-card"
      style={{
        borderRadius: '0px',
        border: `3px solid ${borderColor}`,
        overflow: 'visible',
        position: 'relative',
        transition: 'all 0.3s ease-in-out',
        transform: 'scale(1)',
      }}
      onMouseEnter={(e) => {
        setIsHovered(true);
        e.currentTarget.style.transform = 'scale(1.02)';
        e.currentTarget.style.zIndex = '10';
        e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
      }}
      onMouseLeave={(e) => {
        setIsHovered(false);
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.zIndex = '1';
        e.currentTarget.style.boxShadow = '';
      }}
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
            <button
              onClick={openWhatsApp}
              className="btn btn-sm btn-outline-light p-1 border-0"
              title="واتساب"
            >
              <img src={WhatsAppIcon} alt="WhatsApp" width="16" height="16" />
            </button>
            <span style={{ fontSize: '0.85em' }}>
              {clientPhone}
            </span>
          </div>

          <div className="d-flex align-items-center justify-content-center gap-2">
            <Link
              to={`/clients/${clientId}`}
              className="text-decoration-none fw-bold text-black"
              style={{ fontSize: '0.95em' }}
            >
              {clientName}
            </Link>
            {isClientUrgent && (
              <AlertTriangle size={12} className="text-warning" />
            )}
            {googleDriveLink && (
              <button
                onClick={openGoogleDrive}
                className="btn btn-sm btn-outline-light p-1 text-black border-0"
                title="Google Drive"
              >
                <img src={GoogleDriveIcon} alt="Google Drive" width="16" height="16" />
              </button>
            )}
          </div>

          <div style={{ width: 30 }} />
        </div>
      </div>

      {/* Body - Tasks Table */}
      <div
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
            overflow: 'visible',
            position: 'relative',
            fontSize: '1.5em'
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
                    >
                      <Dropdown align="end">
                        <Dropdown.Toggle
                          as="button"
                          className="btn btn-sm btn-outline-secondary p-1"
                          style={{ fontSize: '10px', lineHeight: 1 }}
                        >
                          <MoreVertical size={12} />
                        </Dropdown.Toggle>

                        <Dropdown.Menu style={{ fontSize: '0.85em', direction: 'rtl', textAlign: 'right', zIndex: 1060 }}>
                          {task.status === 'Completed' ? (
                            <Dropdown.Item onClick={() => handleRestore(task)} className="text-end">
                              <RotateCcw size={11} className="ms-2" />
                              استعادة إلى جديد
                            </Dropdown.Item>
                          ) : (
                            <Dropdown.Item 
                              onClick={() => handleComplete(task)} 
                              className="text-end"
                            >
                              <MessageSquare size={11} className="ms-2" />
                              إكمال
                            </Dropdown.Item>
                          )}

                          {/* Follow-up */}
                          <Dropdown.Item
                            onClick={() => openDrawer('taskFollowUp', { 
                              taskId: task.id,
                              taskName: task.task_name || undefined,
                              clientName: clientName
                            })}
                            className="text-end"
                          >
                            <MessageSquare size={14} className="ms-2" />
                            المراسلات والمتابعة
                          </Dropdown.Item>

                          {/* Requirements */}
                          {task.requirements && task.requirements.length > 0 && (
                            <Dropdown.Item
                              onClick={() => handleShowRequirements(task)}
                              className="text-end"
                            >
                              <ListChecks size={14} className="ms-2" />
                              عرض المتطلبات
                            </Dropdown.Item>
                          )}

                          {/* View Subtasks */}
                          <Dropdown.Item
                            onClick={() => handleViewSubtasks(task)}
                            className="text-end"
                          >
                            <Eye size={14} className="ms-2" />
                            المهام الفرعية
                          </Dropdown.Item>

                          <Dropdown.Divider />

                          {/* Defer/Resume */}
                          {!isDeferred ? (
                            <Dropdown.Item
                              onClick={() => handleDefer(task)}
                              className="text-end"
                            >
                              <Pause size={14} className="ms-2" />
                              تأجيل المهمة
                            </Dropdown.Item>
                          ) : (
                            <Dropdown.Item
                              onClick={() => handleResume(task)}
                              className="text-end"
                            >
                              <Play size={14} className="ms-2" />
                              استئناف المهمة
                            </Dropdown.Item>
                          )}

                          {/* Toggle Urgent */}
                          <Dropdown.Item
                            onClick={() => handleToggleUrgentTag(task)}
                            className="text-end"
                          >
                            <AlertTriangle size={14} className="ms-2" />
                            {isUrgent ? 'إزالة علامة العاجل' : 'وضع علامة عاجل'}
                          </Dropdown.Item>

                          <Dropdown.Divider />

                          {/* Cancel Task */}
                          <Dropdown.Item
                            onClick={() => handleCancelTask(task)}
                            className="text-end text-danger"
                          >
                            <X size={14} className="ms-2" />
                            إلغاء المهمة
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
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

export default EmployeeClientCard;
