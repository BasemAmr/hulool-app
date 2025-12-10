// src/components/dashboard/DashboardClientCard.tsx
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useModalStore } from '../../stores/modalStore';
import { useDrawerStore } from '../../stores/drawerStore';
import { useToast } from '../../hooks/useToast';
import { useDeferTask, useResumeTask, useUpdateTask, useCancelTask, useRestoreTask } from '../../queries/taskQueries';
import { useGetEmployeesForSelection } from '../../queries/employeeQueries';
import type { Task } from '../../api/types';
import { formatDate } from '../../utils/dateUtils';
// TODO: Replace with Shadcn UI components in Phase 2
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';
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
  UserPlus,
  X,
  RotateCcw
} from 'lucide-react';
import WhatsAppIcon from '../../assets/images/whats.svg';
import GoogleDriveIcon from '../../assets/images/googe_drive.svg';
import type { ClientWithTasksAndStats } from '../../queries/dashboardQueries';
import { useRef, useEffect, useState } from 'react';

interface DashboardClientCardProps {
  data: ClientWithTasksAndStats;
  index?: number;
  alternatingColors: string[];
  onAssign?: (task: Task) => void;
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

const DashboardClientCard = ({ data, index = 0, alternatingColors, onAssign, onWidthCalculated }: DashboardClientCardProps) => {
  const { client, tasks } = data;
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
  const { data: employees = [] } = useGetEmployeesForSelection();
  // Add this right after the employees query
  // Add this to see the structure of the first employee
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

  const isUserEmployee = (userId: number | null) => {
    if (!userId) return false;
    return employees.some(emp => emp.user_id == userId);
  };
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
    row2Color = hexToRgba(alternatingColors[1], 1); // Slightly more hidden
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
          <button className="p-1.5 rounded hover:bg-white/20 transition-all duration-200 cursor-pointer border-0 bg-transparent">
            <MoreVertical size={16} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="text-right" style={{ fontSize: '0.85em', direction: 'rtl' }}>
          <DropdownMenuItem onClick={handleAddTask} className="text-right cursor-pointer">
            <Receipt size={14} className="ml-2" />
            إضافة مهمة
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleAddReceivable} className="text-right cursor-pointer">
            <Receipt size={14} className="ml-2" />
            إضافة مستحق
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleRecordCredit} className="text-right cursor-pointer">
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
      className="h-full shadow-md rounded-none border-4 overflow-visible relative transition-all duration-300"
      style={{
        borderColor: borderColor,
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
      {/* Header with alternating strong colors */}
      <div
        className="border-0 py-2 rounded-none"
        style={{
          backgroundColor: headerColor,
        }}
      >
        <div className="flex justify-between items-center">
          {/* Left: WhatsApp with phone number */}
          <div className="flex items-center gap-2">
            <button
              onClick={openWhatsApp}
              className="p-1.5 rounded hover:bg-white/20 transition-all duration-200 cursor-pointer border-0 bg-transparent"
              title="واتساب"
            >
              <img src={WhatsAppIcon} alt="WhatsApp" width="18" height="18" />
            </button>
            <span className="text-sm">
              {client.phone || ''}
            </span>
          </div>

          {/* Center: Client name with Google Drive */}
          <div className="flex items-center justify-center gap-2">
            <Link
              to={`/clients/${client.id}`}
              className="no-underline font-bold text-black text-[0.95em] hover:opacity-80 transition-opacity"
            >
              {client.name}
            </Link>
            {isClientUrgent && (
              <AlertTriangle size={14} className="text-warning" />
            )}
            <button
              onClick={openGoogleDrive}
              className="p-1.5 rounded hover:bg-white/20 transition-all duration-200 cursor-pointer border-0 bg-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              title="Google Drive"
              disabled={!client.google_drive_link}
            >
              <img src={GoogleDriveIcon} alt="Google Drive" width="18" height="18" />
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
        className="p-0 relative overflow-visible"
        style={{
          backgroundColor: row1Color,
        }}

      >
        <div
          className="overflow-hidden relative"
        >
          <table className="w-full text-sm">
            {/* Sticky table header */}
            <thead
              className="sticky top-0 z-[2]"
            >
              <tr>
                <th className="text-[0.8em] px-2 py-1.5 border-0" style={{ backgroundColor: headerColor }}>المهمة</th>
                <th className="text-[0.8em] px-2 py-1.5 border-0" style={{ backgroundColor: headerColor }}>تاريخ</th>
                <th className="text-[0.8em] px-2 py-1.5 border-0" style={{ backgroundColor: headerColor }}>اليوم</th>
                <th className="text-[0.8em] px-2 py-1.5 border-0" style={{ backgroundColor: headerColor }}>المبلغ</th>
                <th className="text-[0.8em] px-2 py-1.5 border-0 w-20 min-w-[80px]" style={{ backgroundColor: headerColor }}>إجراءات</th>
              </tr>
            </thead>
            <tbody
              className="overflow-hidden"
            >
              {tasks.map((task, taskIndex) => {
                const isTaskUrgent = task.tags?.some(tag => tag.name === 'قصوى');

                // Row background logic
                let rowBackground;
                // Check if task is assigned to an employee
                const isEmployeeTask = task.assigned_to_id && isUserEmployee(task.assigned_to_id);

                if (isTaskUrgent) {
                  rowBackground = '#ffcccc'; // Red for urgent tasks
                } else {
                  rowBackground = taskIndex % 2 === 0 ? row1Color : row2Color;
                }

                // Get employee first name for prefix
                const assignedEmployee = employees.find(emp => emp.user_id == task.assigned_to_id); const employeeFirstName = assignedEmployee ? assignedEmployee.display_name.split(' ')[0] : null;
                const taskDisplayName = employeeFirstName
                  ? `${employeeFirstName}: ${task.task_name || t(`type.${task.type}`)}`
                  : (task.task_name || t(`type.${task.type}`));

                // console.log('Task:', task.id, 'assigned_to_id:', task.assigned_to_id, 'isEmployeeTask:', isEmployeeTask, 'assignedEmployee:', assignedEmployee);

                return (
                  <tr
                    ref={(el) => { taskRowRefs.current[taskIndex] = el; }}
                    key={task.id}
                    className="task-row transition-all duration-200 relative"
                    data-task-id={task.id}
                    style={{
                      backgroundColor: rowBackground,
                      border: isEmployeeTask ? '3px solid #000' : 'none',
                    }}
                  >
                    <td className="text-[0.82em] px-2 py-2 text-black border-0" style={{ backgroundColor: rowBackground }}>
                      <div className="flex items-center gap-1">
                        <span className="truncate max-w-[180px] inline-block">
                          {taskDisplayName}
                        </span>
                        {task.tags?.some(tag => tag.name === 'قصوى') && (
                          <AlertTriangle size={10} className="text-danger" />
                        )}
                      </div>
                    </td>
                    <td className="text-[0.77em] px-2 py-2 text-black border-0" style={{ backgroundColor: rowBackground }}>
                      {formatDate(task.start_date).replace(/\/20/, '/')}
                    </td>
                    <td className="text-[0.77em] px-2 py-2 text-black border-0" style={{ backgroundColor: rowBackground }}>
                      {formatDaysElapsed(task.start_date)}
                    </td>
                    <td className="text-[0.77em] px-2 py-2 text-black border-0 font-bold" style={{ backgroundColor: rowBackground }}>
                      <div className="flex items-center text-danger">
                        <svg
                          width={10}
                          height={10}
                          viewBox="0 0 1124.14 1256.39"
                          className="mr-0.5 align-middle"
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
                        {Number(task.amount).toLocaleString()}
                      </div>
                    </td>
                    <td
                      className="px-2 py-2 static text-black border-0 min-w-[80px] whitespace-nowrap"
                      style={{ backgroundColor: rowBackground }}
                    >
                      <div className="flex gap-1.5 justify-start items-center min-w-fit">
                        <button
                          className="p-1.5 rounded border border-gray-300 bg-white hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 cursor-pointer"
                          onClick={() => openDrawer('taskFollowUp', {
                            taskId: task.id,
                            taskName: task.task_name || undefined,
                            clientName: client.name
                          })}
                          title="التعليقات"
                        >
                          <MessageSquare size={12} />
                        </button>

                        <button
                          onClick={() => handleViewSubtasks(task)}
                          className="p-1.5 rounded border border-blue-300 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:border-blue-400 transition-all duration-200 cursor-pointer"
                          title="المهام الفرعية"
                        >
                          <Eye size={12} />
                        </button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="p-1.5 rounded border border-gray-300 bg-white hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 cursor-pointer"
                            >
                              <MoreVertical size={12} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="text-right bg-card border rounded shadow-lg min-w-[120px] text-[0.85em]">
                            {task.status === 'Completed' ? (
                              <DropdownMenuItem onClick={() => handleRestore(task)} className="text-right cursor-pointer hover:bg-accent">
                                <RotateCcw size={12} className="ml-2" />
                                استعادة إلى جديد
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => handleComplete(task)}
                                className="text-right cursor-pointer hover:bg-accent"
                                disabled={Boolean(task.assigned_to_id) && Boolean(isUserEmployee(task.assigned_to_id))}
                              >
                                <Check size={12} className="ml-2" />
                                {task.assigned_to_id && isUserEmployee(task.assigned_to_id) ? 'موظف مكلف' : 'إكمال'}
                              </DropdownMenuItem>
                            )}
                            {task.status === 'New' ? (
                              <DropdownMenuItem onClick={() => handleDefer(task)} className="text-right cursor-pointer hover:bg-accent">
                                <Pause size={12} className="ml-2" />
                                تأجيل
                              </DropdownMenuItem>
                            ) : task.status === 'Deferred' ? (
                              <DropdownMenuItem onClick={() => handleResume(task)} className="text-right cursor-pointer hover:bg-accent">
                                <Play size={12} className="ml-2" />
                                استئناف
                              </DropdownMenuItem>
                            ) : null}
                            {task.status !== 'Completed' && task.status !== 'Cancelled' && (
                              <DropdownMenuItem onClick={() => handleCancelTask(task)} className="text-right text-destructive cursor-pointer hover:bg-destructive/10">
                                <X size={12} className="ml-2" />
                                إلغاء المهمة
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleToggleUrgentTag(task)} className="text-right cursor-pointer hover:bg-accent">
                              <AlertTriangle size={12} className="ml-2" />
                              {task.tags?.some(tag => tag.name === 'قصوى') ? 'إلغاء العاجل' : 'تعليم عاجل'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleShowRequirements(task)} className="text-right cursor-pointer hover:bg-accent">
                              <ListChecks size={12} className="ml-2" />
                              المتطلبات
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openDrawer('taskFollowUp', {
                                taskId: task.id,
                                taskName: task.task_name || undefined,
                                clientName: client.name
                              })}
                              className="text-right cursor-pointer hover:bg-accent"
                            >
                              <MessageSquare size={12} className="ml-2" />
                              التعليقات
                            </DropdownMenuItem>
                            {onAssign && (task.status === 'New' || task.status === 'Deferred') && (
                              <DropdownMenuItem onClick={() => onAssign(task)} className="text-right cursor-pointer hover:bg-accent">
                                <UserPlus size={12} className="ml-2" />
                                {task.assigned_to_id ? 'الغاء/تغيير الموظف' : 'تعيين موظف'}
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

export default DashboardClientCard;
