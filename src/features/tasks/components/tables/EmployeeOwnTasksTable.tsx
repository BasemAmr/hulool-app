import React, { useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGetEmployeeOwnTasksInfinite, useSubmitTaskForReview, useUnassignTask } from '@/features/tasks/api/employeeTasksQueries';
import { useModalStore } from '@/shared/stores/modalStore';
import { useToast } from '@/shared/hooks/useToast';
import { formatDate } from '@/shared/utils/dateUtils';
import { translateTaskType } from '@/shared/constants/taskTypes';
import type { Task } from '@/api/types';
import { useInView } from 'react-intersection-observer';
import {
  Eye,
  Edit2,
  X,
  CheckCircle,
  FileText,
  AlertCircle,
  Calendar,
  MessageCircle,
  RotateCcw,
  UserMinus,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { useCancelTask, useDeferTask, useMarkTaskUrgent, useRemoveTaskUrgent } from '@/features/tasks/api/taskQueries';

const neutralActionButtonClass = 'inline-flex items-center justify-center rounded p-1.5 text-text-secondary hover:text-text-primary cursor-pointer transition-colors duration-150';
const destructiveActionButtonClass = 'inline-flex items-center justify-center rounded p-1.5 text-text-secondary hover:text-text-danger cursor-pointer transition-colors duration-150';

interface EmployeeOwnTasksTableProps {
  searchTerm?: string;
  statusFilter?: string;
  clientId?: number;
  highlightTaskId?: string;
  getTypeRowStyle?: (type: string) => { backgroundColor: string };
  getStatusBadgeStyle?: (status: string) => { backgroundColor: string; color: string; border: string };
}

const EmployeeOwnTasksTable: React.FC<EmployeeOwnTasksTableProps> = ({
  searchTerm,
  statusFilter,
  clientId,
  highlightTaskId,
  getTypeRowStyle,
  getStatusBadgeStyle,
}) => {
  const navigate = useNavigate();
  const { openModal } = useModalStore();
  const { success, error: showError } = useToast();

  const handleHighlightClick = () => {
    navigate('/employee/tasks');
  };

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetEmployeeOwnTasksInfinite({
    search: searchTerm,
    status: statusFilter,
    client_id: clientId,
    per_page: 20,
  });

  const submitForReviewMutation = useSubmitTaskForReview();
  const cancelTaskMutation = useCancelTask();
  const unassignTaskMutation = useUnassignTask();
  const deferTaskMutation = useDeferTask();
  const markUrgentMutation = useMarkTaskUrgent();
  const removeUrgentMutation = useRemoveTaskUrgent();

  const tasks = useMemo(() => data?.pages.flatMap(page => page.tasks) || [], [data]);
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      let statusOrder = ['New', 'Deferred', 'Pending Review', 'Completed', 'Cancelled'];
      return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
    });
  }, [tasks]);

  const { ref } = useInView({
    threshold: 1,
    onChange: (inView) => {
      if (inView && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
  });

  const handleEditTask = (task: Task) => {
    openModal('taskForm', { taskToEdit: task });
  };

  const handleSubmitForReview = (task: Task) => {
    submitForReviewMutation.mutate(task.id, {
      onSuccess: () => {
        success('تم الإرسال', `تم إرسال المهمة "${task.task_name || 'مهمة'}" للمراجعة بنجاح`);
      },
      onError: (err: any) => {
        showError('خطأ', err.message || 'حدث خطأ أثناء إرسال المهمة للمراجعة');
      }
    });
  };

  const handleViewAmountDetails = (task: Task) => {
    openModal('amountDetails', { task });
  };

  const handleDeleteTask = (task: Task) => {
    if (confirm(`هل أنت متأكد من إلغاء المهمة "${task.task_name}"؟`)) {
      cancelTaskMutation.mutate({
        id: task.id,
        decisions: { task_action: 'cancel' }
      }, {
        onSuccess: () => {
          success('تم الإلغاء', 'تم إلغاء المهمة بنجاح');
        },
        onError: (err: any) => {
          showError('خطأ', err.message || 'حدث خطأ أثناء إلغاء المهمة');
        }
      });
    }
  };

  const handleUnassign = (task: Task) => {
    if (confirm(`هل أنت متأكد من إلغاء تعيينك للمهمة "${task.task_name}"؟`)) {
      // Comment 2: Toast notifications are now handled in useUnassignTask mutation
      unassignTaskMutation.mutate(task.id);
    }
  };

  const handleDefer = (task: Task) => {
    if (confirm(`هل أنت متأكد من تأجيل المهمة "${task.task_name}"؟`)) {
      deferTaskMutation.mutate({ id: task.id }, {
        onSuccess: () => {
          success('تم التأجيل', 'تم تأجيل المهمة بنجاح');
        },
        onError: (err: any) => {
          showError('خطأ', err.message || 'حدث خطأ أثناء تأجيل المهمة');
        }
      });
    }
  };

  const isUrgent = (task: Task) => {
    return task.tags?.some(tag => tag.name === 'قصوى');
  };

  const handleToggleUrgent = (task: Task) => {
    if (isUrgent(task)) {
      removeUrgentMutation.mutate(task.id);
    } else {
      markUrgentMutation.mutate(task.id);
    }
  };

  const handleShowRequirements = (task: Task) => {
    openModal('requirements', { task });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'New': { color: 'primary', text: 'جديد' },
      'Pending Review': { color: 'info', text: 'في المراجعة' },
      'Completed': { color: 'success', text: 'مكتمل' },
      'Deferred': { color: 'secondary', text: 'مؤجل' },
      'Cancelled': { color: 'danger', text: 'ملغي' }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'secondary', text: status };
    return (
      <span className={`badge bg-${config.color} text-white`} style={{ fontSize: '0.75rem' }}>
        {config.text}
      </span>
    );
  };

  const getStatusText = (status: string) => {
    const statusConfig = {
      'New': 'جديد',
      'In Progress': 'قيد العمل',
      'Pending Review': 'في المراجعة',
      'Completed': 'مكتمل',
      'Deferred': 'مؤجل',
      'Cancelled': 'ملغي'
    };
    return statusConfig[status as keyof typeof statusConfig] || status;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">جاري التحميل...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-4" role="alert">
        <div className="flex items-center gap-2">
          <AlertCircle size={20} className="text-destructive" />
          <span className="text-destructive">خطأ في تحميل المهام. يرجى المحاولة مرة أخرى.</span>
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center p-5">
        <FileText size={48} className="text-text-primary mb-3" />
        <h5 className="text-text-primary font-bold">لا توجد مهام</h5>
        <p className="text-text-primary text-sm">لم يتم العثور على أي مهام بناءً على المعايير المحددة.</p>
      </div>
    );
  }

  // Define common logic for cell style
  const CELL_STYLE: React.CSSProperties = {
    padding: '8px',
    fontSize: 'var(--font-size-sm)',
    border: '1px solid #e5e7eb', // Bordered grid style
    verticalAlign: 'middle',
    backgroundColor: 'inherit' // Inherit from row
  };

  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-background">
            <tr>
              {['اسم المهمة', 'الملاحظات', 'العميل', 'النوع', 'الحالة', 'تاريخ البداية', 'تاريخ الانتهاء', 'الإجراءات'].map((header, idx) => (
                <th key={idx} style={{
                  ...CELL_STYLE,
                  fontWeight: 'bold',
                  color: 'var(--token-text-primary)',
                  textAlign: header === 'الإجراءات' ? 'center' : 'start'
                }}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedTasks.map((task) => {
              const isHighlighted = highlightTaskId && task.id.toString() === highlightTaskId;
              const rowStyle = getTypeRowStyle ? getTypeRowStyle(task.type) : { backgroundColor: 'transparent' };

              return (
                <tr
                  key={task.id}
                  className="hover:bg-background transition-colors"
                  style={{
                    backgroundColor: isHighlighted ? 'rgba(255, 193, 7, 0.1)' : rowStyle.backgroundColor,
                  }}
                >
                  <td style={{ ...CELL_STYLE, fontWeight: 600 }}>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1">
                        {isUrgent(task) && <AlertTriangle size={14} className="text-status-danger-text fill-red-100" />}
                        <span className="text-text-primary">{task.task_name || 'مهمة بدون اسم'}</span>
                      </div>
                      {isHighlighted && (
                        <span className="text-xs text-status-warning-text font-bold mt-1">
                          ⭐ محددة من الإشعار
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={CELL_STYLE}>
                    {task.notes ? (
                      <div className="text-text-primary text-xs" title={task.notes}>
                        {task.notes.length > 40 ? `${task.notes.substring(0, 40)}...` : task.notes}
                      </div>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>
                  <td style={CELL_STYLE}>
                    <div className="flex items-center gap-2">
                      {task.client?.id ? (
                        <Link
                          to={`/employee/clients/${task.client.id}`}
                          className="font-medium no-underline text-text-primary hover:text-primary transition-colors"
                        >
                          {task.client.name}
                        </Link>
                      ) : (
                        <span className="font-medium">{task.client?.name || 'غير محدد'}</span>
                      )}

                      {task.client?.phone && (
                        <a
                          href={`https://wa.me/${task.client.phone.replace(/[^\d]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-0 hover:scale-110 transition-transform"
                          title="إرسال رسالة واتساب"
                        >
                          <MessageCircle size={14} className="text-status-success-text" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td style={CELL_STYLE}>
                    <span className="px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium border border-primary/20">
                      {translateTaskType(task.type)}
                    </span>
                  </td>
                  <td style={CELL_STYLE}>
                    {getStatusBadgeStyle ? (
                      <span
                        className="inline-block px-2 py-1 rounded-md text-xs font-medium border"
                        style={getStatusBadgeStyle(task.status)}
                      >
                        {getStatusText(task.status)}
                      </span>
                    ) : (
                      getStatusBadge(task.status)
                    )}
                  </td>
                  <td style={{ ...CELL_STYLE, whiteSpace: 'nowrap' }}>
                    <div className="flex items-center text-text-primary text-xs">
                      <Calendar size={14} className="me-1 text-text-muted" />
                      {formatDate(task.start_date)}
                    </div>
                  </td>
                  <td style={{ ...CELL_STYLE, whiteSpace: 'nowrap' }}>
                    <div className="flex items-center text-text-primary text-xs">
                      <Calendar size={14} className="me-1 text-text-muted" />
                      {formatDate(task.end_date)}
                    </div>
                  </td>
                  <td style={CELL_STYLE}>
                    <div className="flex justify-center gap-0.5 flex-wrap">
                      {/* View Amount Details */}
                      <button
                        onClick={() => handleViewAmountDetails(task)}
                        className={neutralActionButtonClass}
                        title="تفاصيل المبلغ"
                      >
                        <Eye size={14} />
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => handleEditTask(task)}
                        className={neutralActionButtonClass}
                        title="تعديل"
                      >
                        <Edit2 size={14} />
                      </button>

                      {/* Defer */}
                      {task.status === 'New' && (
                        <button
                          onClick={() => handleDefer(task)}
                          className={neutralActionButtonClass}
                          title="تأجيل"
                        >
                          <Clock size={14} />
                        </button>
                      )}

                      {/* Submit for Review */}
                      {['New', 'Deferred'].includes(task.status) && (
                        <button
                          onClick={() => handleSubmitForReview(task)}
                          className={neutralActionButtonClass}
                          title="تقديم للمراجعة"
                          disabled={submitForReviewMutation.isPending}
                        >
                          <CheckCircle size={14} />
                        </button>
                      )}

                      {/* Unassign */}
                      {task.status === 'New' && (
                        <button
                          onClick={() => handleUnassign(task)}
                          className={neutralActionButtonClass}
                          title="إلغاء التعيين"
                        >
                          <UserMinus size={14} />
                        </button>
                      )}

                      {/* Mark / Remove Urgent */}
                      <button
                        onClick={() => handleToggleUrgent(task)}
                        className={neutralActionButtonClass}
                        title={isUrgent(task) ? "إزالة علامة هام جداً" : "تمييز كـ هام جداً"}
                      >
                        <AlertTriangle size={14} />
                      </button>

                      {/* Requirements */}
                      {task.requirements && task.requirements.length > 0 && (
                        <button
                          onClick={() => handleShowRequirements(task)}
                          className={neutralActionButtonClass}
                          title="المتطلبات"
                        >
                          <FileText size={14} />
                        </button>
                      )}

                      {/* Cancel */}
                      <button
                        onClick={() => handleDeleteTask(task)}
                        className={destructiveActionButtonClass}
                        title="إلغاء المهمة"
                      >
                        <X size={14} />
                      </button>

                      {/* Restore */}
                      {task.status === 'Completed' && (
                        <button
                          onClick={() => openModal('taskRestore', { task })}
                          className={neutralActionButtonClass}
                          title="استرداد"
                        >
                          <RotateCcw size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {(hasNextPage || isFetchingNextPage) && (
        <div ref={ref} className="text-center p-3 border-t">
          {isFetchingNextPage ? (
            <div className="spinner-border spinner-border-sm text-primary" role="status">
              <span className="visually-hidden">جاري تحميل المزيد...</span>
            </div>
          ) : (
            <div className="text-muted-foreground text-xs">
              عرض {tasks.length} مهمة
            </div>
          )}
        </div>
      )}

      {!hasNextPage && tasks.length > 0 && (
        <div className="px-4 py-3 bg-bg-surface-muted/50 border-t text-center">
          <small className="text-muted-foreground">
            تم عرض جميع المهام ({tasks.length} مهمة)
          </small>
        </div>
      )}
    </div>
  );
};

export default EmployeeOwnTasksTable;
