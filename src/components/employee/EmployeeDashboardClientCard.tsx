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
// TODO: Replace with Shadcn UI components in Phase 2
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
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
  const [isHovered, setIsHovered] = useState(false);

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

  // Header dropdown component using Shadcn DropdownMenu
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-1 border-0 text-black hover:bg-black/10 rounded transition-colors" style={{ background: 'none' }}>
            <MoreVertical size={14} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="text-right" style={{ fontSize: '0.85em', direction: 'rtl' }}>
          <DropdownMenuItem onClick={handleAddTask} className="text-right">
            <Receipt size={14} className="ml-2" />
            إضافة مهمة
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleAddReceivable} className="text-right">
            <Receipt size={14} className="ml-2" />
            إضافة مستحق
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleRecordCredit} className="text-right">
            <Receipt size={14} className="ml-2" />
            إضافة دفعة
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <div
      ref={cardRef}
      className="rounded-lg border-[3px] bg-card shadow-sm h-full employee-dashboard-client-card"
      style={{
        borderColor: borderColor,
        overflow: 'hidden',
        position: 'relative',
        transition: 'all 0.3s ease-in-out',
        transform: 'scale(1)',
      }}
      onMouseEnter={(e) => {
        setIsHovered(true);
        e.currentTarget.style.transform = 'scale(1.02)';
        e.currentTarget.style.zIndex = '10';
        e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
        e.currentTarget.style.overflow = 'visible';
      }}
      onMouseLeave={(e) => {
        setIsHovered(false);
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.zIndex = '1';
        e.currentTarget.style.boxShadow = '';
        e.currentTarget.style.overflow = 'hidden';
      }}
    >
      {/* Header with alternating strong colors */}
      <div
        className="px-4 py-2 border-b-0"
        style={{
          backgroundColor: headerColor,
          borderRadius: 0
        }}
      >
        <div className="flex justify-between items-center">
          {/* Left: WhatsApp with phone number */}
          <div className="flex items-center gap-2">
            <button
              onClick={openWhatsApp}
              className="p-1 border-0 hover:bg-white/20 rounded transition-colors"
              title="واتساب"
            >
              <img src={WhatsAppIcon} alt="WhatsApp" width="16" height="16" />
            </button>
            <span style={{ fontSize: '0.85em' }}>
              {client.phone || ''}
            </span>
          </div>

          {/* Center: Client name with Google Drive */}
          <div className="flex items-center justify-center gap-2">
            <Link
              to={`/employee/clients/${client.id}`}
              className="no-underline font-bold text-black hover:text-black/80 transition-colors"
              style={{ fontSize: '0.95em' }}
            >
              {client.name}
            </Link>
            {isClientUrgent && (
              <AlertTriangle size={12} className="text-yellow-600" />
            )}
            <button
              onClick={openGoogleDrive}
              className="p-1 text-black border-0 hover:bg-white/20 rounded transition-colors"
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
        className="p-0"
        style={{
          position: 'relative',
          backgroundColor: row1Color,
          overflow: 'visible',
        }}
      >
        <div
          className="w-full overflow-x-auto"
          style={{
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          <table className="w-full text-sm mb-0">
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
                    className="task-row hover:bg-muted/30 transition-all"
                    data-task-id={task.id}
                    style={{
                      backgroundColor: rowBackground,
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
                      <div className="flex items-center gap-1">
                        <span className="truncate" style={{ maxWidth: '120px' }}>
                          {task.task_name || t(`type.${task.type}`)}
                        </span>
                        {isTaskUrgent && (
                          <AlertTriangle size={10} className="text-red-600" />
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
                    }} className="text-green-600 font-bold">
                      {task.prepaid_amount > 0 ? (
                        <div>
                          <div>{task.amount.toLocaleString()} ر.س</div>
                          <small className="text-black">
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
                      <div className="flex gap-1 justify-center">
                        {/* View Subtasks (Eye icon) */}
                        <button
                          onClick={() => handleViewSubtasks(task)}
                          className="px-1.5 py-1 text-xs border border-blue-500 text-blue-500 rounded hover:bg-blue-500 hover:text-white transition-colors"
                          title="المهام الفرعية"
                        >
                          <Eye size={10} />
                        </button>

                        {/* Dropdown with actions */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="px-1.5 py-1 text-xs border border-border rounded hover:bg-accent hover:text-accent-foreground transition-colors"
                            >
                              <MoreVertical size={10} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="text-right" style={{ minWidth: '140px', fontSize: '0.85em' }}>
                            {task.status !== 'Completed' && task.status !== 'Pending Review' && (
                              <DropdownMenuItem onClick={() => handleSubmitForReview(task)} className="text-right">
                                <Upload size={11} className="ml-2" />
                                إرسال للمراجعة
                              </DropdownMenuItem>
                            )}
                            {task.status === 'New' && (
                              <DropdownMenuItem onClick={() => handleDefer(task)} className="text-right">
                                <Pause size={11} className="ml-2" />
                                تأجيل
                              </DropdownMenuItem>
                            )}
                            {task.status === 'Deferred' && (
                              <DropdownMenuItem onClick={() => handleResume(task)} className="text-right">
                                <Play size={11} className="ml-2" />
                                استئناف
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleShowRequirements(task)} className="text-right">
                              <ListChecks size={11} className="ml-2" />
                              المتطلبات
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openDrawer('taskFollowUp', {
                                taskId: task.id,
                                taskName: task.task_name || undefined,
                                clientName: client.name
                              })}
                              className="text-right"
                            >
                              <MessageSquare size={11} className="ml-2" />
                              التعليقات
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleUrgentTag(task)} className="text-right">
                              <AlertTriangle size={11} className="ml-2" />
                              {task.tags?.some(tag => tag.name === 'قصوى') ? 'إلغاء العاجل' : 'تعليم عاجل'}
                            </DropdownMenuItem>
                            {task.status !== 'Completed' && task.status !== 'Cancelled' && (
                              <DropdownMenuItem onClick={() => handleCancelTask(task)} className="text-right text-destructive">
                                <X size={11} className="ml-2" />
                                إلغاء المهمة
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Dropdown is now handled by Shadcn */}
      </div>
    </div>
  );
};

export default EmployeeDashboardClientCard;
