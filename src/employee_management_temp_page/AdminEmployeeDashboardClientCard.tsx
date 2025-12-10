// Admin Employee Dashboard Client Card - Tailwind version
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Task, Client } from '../api/types';
import { useModalStore } from '../stores/modalStore';
import { useQueryClient } from '@tanstack/react-query';
import { MoreVertical, Pause, Play, X, ListChecks, MessageSquare, AlertTriangle, Eye, Upload, Receipt } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import { useDeferTask, useResumeTask, useCancelTask, useUpdateTask } from '../queries/taskQueries';
import { useDrawerStore } from '../stores/drawerStore';
import { useAdminSubmitTaskForReview } from './employeeManagementQueries';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../components/ui/dropdown-menu';
import { Badge } from '../components/ui/badge';
import { cn } from '@/lib/utils';

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

interface AdminEmployeeDashboardClientCardProps {
  data: ClientWithTasksAndStats;
  alternatingColors: string[];
  index: number;
  onAssign?: (task: Task) => void;
  onWidthCalculated?: (width: string) => void;
}

const AdminEmployeeDashboardClientCard = ({
  data,
  alternatingColors,
  index,
  onWidthCalculated
}: AdminEmployeeDashboardClientCardProps) => {
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
      className="h-full shadow-sm rounded-none overflow-visible relative transition-all duration-300 flex flex-col"
      style={{
        border: `3px solid ${borderColor}`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div
        className="border-0 py-2 rounded-none"
        style={{ backgroundColor: headerColor }}
      >
        <div className="flex justify-between items-center px-2">
          <div className="flex items-center gap-2">
            <span className="text-sm">
              {client.phone}
            </span>
          </div>

          <div className="flex items-center justify-center gap-2">
            <Link
              to={`/clients/${client.id}`}
              className="no-underline font-bold text-black text-[0.95em]"
            >
              {client.name}
            </Link>
            {isClientUrgent && (
              <AlertTriangle size={12} className="text-yellow-500" />
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 rounded hover:bg-white/20 transition-all duration-200 cursor-pointer border-0 bg-transparent text-black">
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
      <div
        className="p-0 relative overflow-visible flex flex-col"
        style={{ backgroundColor: row1Color }}
      >
        <div className="overflow-auto relative">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-[2]">
              <tr>
                <th className="text-[0.8em] px-2 py-1.5 border-0" style={{ backgroundColor: headerColor }}>الخدمة</th>
                <th className="text-[0.8em] px-2 py-1.5 border-0" style={{ backgroundColor: headerColor }}>النوع</th>
                <th className="text-[0.8em] px-2 py-1.5 border-0" style={{ backgroundColor: headerColor }}>الحالة</th>
                <th className="text-[0.8em] px-2 py-1.5 border-0" style={{ backgroundColor: headerColor }}>الوقت</th>
                <th className="text-[0.8em] px-2 py-1.5 w-20 min-w-[80px] border-0" style={{ backgroundColor: headerColor }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody className="overflow-visible">
              {tasks.map((task, idx) => {
                const isUrgent = task.tags?.some(tag => tag.name === 'قصوى');
                const rowColor = idx % 2 === 0 ? row1Color : row2Color;
                const isDeferred = task.status === 'Deferred';

                return (
                  <tr
                    key={task.id}
                    ref={(el) => { taskRowRefs.current[idx] = el; }}
                    className={cn(
                      "border-b border-black/5 relative transition-all duration-200",
                      isDeferred && "opacity-60"
                    )}
                    style={{ backgroundColor: rowColor }}
                  >
                    {/* Service */}
                    <td className="text-[0.82em] px-2 py-2 text-black border-0" style={{ backgroundColor: rowColor }}>
                      <div className="flex items-center gap-1">
                        <span className="truncate max-w-[180px] inline-block">
                          {task.task_name || t(`type.${task.type}`)}
                        </span>
                        {isUrgent && (
                          <AlertTriangle size={10} className="text-red-500" />
                        )}
                      </div>
                    </td>

                    {/* Type */}
                    <td className="text-[0.77em] px-2 py-2 text-black border-0" style={{ backgroundColor: rowColor }}>
                      <span>{t(`type.${task.type}`)}</span>
                    </td>

                    {/* Status */}
                    <td className="text-[0.77em] px-2 py-2 text-black border-0 text-center" style={{ backgroundColor: rowColor }}>
                      <Badge
                        variant={
                          task.status === 'New' ? 'default' :
                          task.status === 'Deferred' ? 'destructive' :
                          task.status === 'Pending Review' ? 'secondary' :
                          task.status === 'Completed' ? 'default' :
                          'outline'
                        }
                        className={cn(
                          "text-[0.7em]",
                          task.status === 'New' && "bg-yellow-500 text-black hover:bg-yellow-500",
                          task.status === 'Pending Review' && "bg-blue-400 text-black hover:bg-blue-400",
                          task.status === 'Completed' && "bg-green-500 text-white hover:bg-green-500"
                        )}
                      >
                        {t(`status.${task.status}`)}
                      </Badge>
                    </td>

                    {/* Time Elapsed */}
                    <td className="text-[0.77em] px-2 py-2 text-black border-0 text-center" style={{ backgroundColor: rowColor }}>
                      <span className="text-muted-foreground">
                        {formatDaysElapsed(task.start_date)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td
                      className="px-2 py-2 static text-black border-0 min-w-[50px] whitespace-nowrap"
                      style={{ backgroundColor: rowColor }}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1 rounded border border-gray-300 bg-white hover:bg-gray-100 transition-all duration-200 cursor-pointer text-[10px] leading-none">
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

export default AdminEmployeeDashboardClientCard;
