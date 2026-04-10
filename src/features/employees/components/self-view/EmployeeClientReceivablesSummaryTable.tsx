// src/components/employee/EmployeeDashboardClientCard.tsx
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useModalStore } from '@/shared/stores/modalStore';
import { useDrawerStore } from '@/shared/stores/drawerStore';
import { useToast } from '@/shared/hooks/useToast';
import { useDeferTask, useResumeTask, useUpdateTask, useCancelTask } from '@/features/tasks/api/taskQueries';
import { useSubmitTaskForReview } from '@/features/tasks/api/employeeTasksQueries';
import type { Task } from '@/api/types';
import { formatDate } from '@/shared/utils/dateUtils';
// TODO: Replace with Shadcn UI components in Phase 2
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/shadcn/dropdown-menu';
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
import WhatsAppIcon from '@/shared/ui/icons/WhatsAppIcon';
import GoogleDriveIcon from '@/shared/ui/icons/GoogleDriveIcon';
import type { ClientWithTasksAndStats } from '@/features/dashboard/api/dashboardQueries';
import { useRef, useEffect, useState } from 'react';

interface EmployeeDashboardClientCardProps {
  data: ClientWithTasksAndStats;
  onWidthCalculated?: (width: string) => void;
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

const EmployeeDashboardClientCard = ({ data, onWidthCalculated }: EmployeeDashboardClientCardProps) => {
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

  const isClientUrgent = tasks.some(task => task.tags?.some(tag => tag.name === 'قصوى'));

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
          <button className="client-card-action-button client-card-header-action-button rounded transition-colors text-text-primary">
            <MoreVertical size={16} />
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
      className={`bg-bg-surface shadow-sm h-full employee-dashboard-client-card border overflow-hidden relative transition-all duration-300 ${isClientUrgent ? 'border-l-4 border-status-danger-border' : 'border-border-default'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className={`px-4 py-2 border-b ${isClientUrgent ? 'bg-status-danger-bg border-status-danger-border' : 'bg-background border-border-default'}`}>
        <div className="flex justify-between items-center">
          {/* Left: WhatsApp with phone number */}
          <div className="flex items-center gap-2">
            <button
              onClick={openWhatsApp}
              className="client-card-action-button client-card-header-action-button rounded transition-colors"
              title="واتساب"
            >
              <WhatsAppIcon size={16} />
            </button>
            <span style={{ fontSize: '0.85em' }}>
              {client.phone || ''}
            </span>
          </div>

          {/* Center: Client name with Google Drive */}
          <div className="flex items-center justify-center gap-2">
            <Link
              to={`/employee/clients/${client.id}`}
              className="no-underline font-bold text-text-primary hover:text-text-brand transition-colors"
              style={{ fontSize: '0.95em' }}
            >
              {client.name}
            </Link>
            {isClientUrgent && (
              <AlertTriangle size={12} className="text-status-danger-text" />
            )}
            <button
              onClick={openGoogleDrive}
              className="client-card-action-button client-card-header-action-button rounded text-text-primary transition-colors hover:text-text-brand"
              title="Google Drive"
              disabled={!client.google_drive_link}
              type="button"
            >
              <GoogleDriveIcon size={16} className="text-current" />
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
      <div ref={cardBodyRef} className="p-0 relative overflow-visible bg-bg-surface">
        <div className="w-full overflow-hidden relative">
          <table className="w-full text-sm mb-0">
            <thead className="sticky top-0 z-[2]">
              <tr className="bg-background">
                <th className="text-[0.8em] px-2 py-1.5 border-0 text-text-secondary font-semibold">المهمة</th>
                <th className="text-[0.8em] px-2 py-1.5 border-0 text-text-secondary font-semibold">تاريخ</th>
                <th className="text-[0.8em] px-2 py-1.5 border-0 text-text-secondary font-semibold">اليوم</th>
                <th className="text-[0.8em] px-2 py-1.5 border-0 text-text-secondary font-semibold">المبلغ</th>
                <th className="text-[0.8em] px-2 py-1.5 w-20 min-w-[80px] border-0 text-text-secondary font-semibold">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task, taskIndex) => {
                const isTaskUrgent = task.tags?.some(tag => tag.name === 'قصوى');

                return (
                  <tr
                    ref={(el) => { taskRowRefs.current[taskIndex] = el; }}
                    key={task.id}
                    className={`task-row transition-colors duration-150 border-b border-border-default last:border-b-0 ${isTaskUrgent ? 'bg-status-danger-bg/40' : taskIndex % 2 === 0 ? 'bg-bg-surface' : 'bg-bg-surface-hover'}`}
                    data-task-id={task.id}
                  >
                    <td className="text-[0.82em] px-2 py-2 text-text-primary border-0">
                      <div className="flex items-center gap-1">
                        <span className="truncate" style={{ maxWidth: '120px' }}>
                          {task.task_name || t(`type.${task.type}`)}
                        </span>
                        {isTaskUrgent && (
                          <AlertTriangle size={10} className="text-status-danger-text" />
                        )}
                      </div>
                    </td>
                    <td className="text-[0.77em] px-2 py-2 text-text-secondary border-0">
                      {formatDate(task.start_date).replace(/\/20/, '/')}
                    </td>
                    <td className="text-[0.77em] px-2 py-2 text-text-secondary border-0">
                      {formatDaysElapsed(task.start_date)}
                    </td>
                    <td className="text-[0.77em] px-2 py-2 text-text-success font-bold border-0">
                      {task.prepaid_amount > 0 ? (
                        <div>
                          <div>{task.amount.toLocaleString()} ر.س</div>
                          <small className="text-text-secondary">
                            مدفوع: {task.prepaid_amount.toLocaleString()} ر.س
                          </small>
                        </div>
                      ) : (
                        <span>{task.amount.toLocaleString()} ر.س</span>
                      )}
                    </td>
                    <td className="task-actions px-2 py-2 static border-0 min-w-[80px] whitespace-nowrap">
                      <div className="flex gap-1 justify-center">
                        {/* View Subtasks (Eye icon) */}
                        <button
                          onClick={() => handleViewSubtasks(task)}
                          className="px-1.5 py-1 text-xs border border-status-info-border bg-status-info-bg text-status-info-text rounded hover:bg-status-info-border transition-colors"
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
