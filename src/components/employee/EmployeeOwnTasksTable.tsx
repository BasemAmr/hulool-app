import React, { useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGetEmployeeOwnTasksInfinite, useSubmitTaskForReview } from '../../queries/employeeTasksQueries';
import { useModalStore } from '../../stores/modalStore';
import { useToast } from '../../hooks/useToast';
import { formatDate } from '../../utils/dateUtils';
import type { Task } from '../../api/types';
import { useInView } from 'react-intersection-observer';
import { 
  Eye, 
  Edit2, 
  X, 
  CheckCircle, 
  FileText, 
  AlertCircle,
  Calendar,
  MessageCircle
} from 'lucide-react';
import { useCancelTask } from '../../queries/taskQueries';

interface EmployeeOwnTasksTableProps {
  searchTerm?: string;
  statusFilter?: string;
  clientId?: number; // NEW: Optional client filter
  highlightTaskId?: string;
  getTypeRowStyle?: (type: string) => { backgroundColor: string };
  getStatusBadgeStyle?: (status: string) => { backgroundColor: string; color: string; border: string };
}

const EmployeeOwnTasksTable: React.FC<EmployeeOwnTasksTableProps> = ({
  searchTerm,
  statusFilter,
  clientId, // NEW: Optional client filter
  highlightTaskId,
  getTypeRowStyle,
  getStatusBadgeStyle,
}) => {
  const navigate = useNavigate();
  const { openModal } = useModalStore();
  const { success, error: showError } = useToast();

  const handleHighlightClick = () => {
    // Remove highlight by navigating to tasks page without highlight parameter
    navigate('/employee/tasks');
  };

  // Fetch employee's own tasks with infinite scroll
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
    client_id: clientId, // NEW: Add client filter
    per_page: 20,
  });

  // Submit task for review mutation
  const submitForReviewMutation = useSubmitTaskForReview();

  // Cancel task mutation (replacing delete)
  const cancelTaskMutation = useCancelTask();

  // Flatten the pages into a single array for rendering
  const tasks = useMemo(() => data?.pages.flatMap(page => page.tasks) || [], [data]);
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      let statusOrder = ['New', 'Deferred', 'Pending Review', 'Completed', 'Cancelled'];
      return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
    });
  }, [tasks]);
  // Intersection observer for infinite scroll
  const { ref } = useInView({
    threshold: 1,
    onChange: (inView) => {
      if (inView && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
  });

  // Handler functions for task actions
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
        decisions: {
          task_action: 'cancel'
        }
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
        <FileText size={48} className="text-black mb-3" />
        <h5 className="text-black font-bold">لا توجد مهام</h5>
        <p className="text-black text-sm">لم يتم العثور على أي مهام بناءً على المعايير المحددة.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border-0 bg-card shadow-sm">
      <div className="p-0">
        <div className="w-full overflow-x-auto">
          <table className="w-full mb-0">
            <thead style={{ backgroundColor: 'var(--color-gray-50)' }}>
              <tr>
                <th style={{ padding: '8px', fontSize: 'var(--font-size-sm)', fontWeight: 'bold' }}>
                  اسم المهمة
                </th>
                <th style={{ padding: '8px', fontSize: 'var(--font-size-sm)', fontWeight: 'bold' }}>
                  الملاحظات
                </th>
                <th style={{ padding: '8px', fontSize: 'var(--font-size-sm)', fontWeight: 'bold' }}>
                  العميل
                </th>
                <th style={{ padding: '8px', fontSize: 'var(--font-size-sm)', fontWeight: 'bold' }}>
                  النوع
                </th>
                <th style={{ padding: '8px', fontSize: 'var(--font-size-sm)', fontWeight: 'bold' }}>
                  الحالة
                </th>
                <th style={{ padding: '8px', fontSize: 'var(--font-size-sm)', fontWeight: 'bold' }}>
                  تاريخ البداية
                </th>
                <th style={{ padding: '8px', fontSize: 'var(--font-size-sm)', fontWeight: 'bold' }}>
                  تاريخ الانتهاء
                </th>
                <th style={{ padding: '8px', fontSize: 'var(--font-size-sm)', fontWeight: 'bold', textAlign: 'center' }}>
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedTasks.map((task) => {
                const isHighlighted = highlightTaskId && task.id.toString() === highlightTaskId;
                return (
                <tr
                  key={task.id}
                  className="hover:bg-muted/50 transition-colors"
                  style={{
                    backgroundColor: isHighlighted 
                      ? 'rgba(255, 193, 7, 0.1)' 
                      : (getTypeRowStyle ? getTypeRowStyle(task.type).backgroundColor : 'transparent'),
                    border: isHighlighted ? '2px solid rgba(255, 193, 7, 0.3)' : 'none',
                    position: 'relative'
                  }}
                >
                  {isHighlighted && (
                    <td colSpan={8} className="p-0" style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
                      <div 
                        className="w-full text-center py-1 cursor-pointer"
                        style={{ 
                          backgroundColor: 'rgba(255, 193, 7, 0.1)',
                          fontSize: '0.8em'
                        }}
                        onClick={handleHighlightClick}
                        title="انقر لإزالة التمييز"
                      >
                        <small className="text-black font-bold">
                          ⭐ هذه المهمة المحددة من الإشعار - انقر لإزالة التمييز
                        </small>
                      </div>
                    </td>
                  )}
                  {[
                    <td key="name" style={{ backgroundColor: getTypeRowStyle ? getTypeRowStyle(task.type).backgroundColor : 'transparent', padding: '8px', fontSize: 'var(--font-size-sm)' }}>
                      <span className="font-bold text-black">{task.task_name || 'مهمة بدون اسم'}</span>
                    </td>,
                    <td key="notes" style={{ backgroundColor: getTypeRowStyle ? getTypeRowStyle(task.type).backgroundColor : 'transparent', padding: '8px', fontSize: 'var(--font-size-sm)' }}>
                      {task.notes ? (
                        <div className="text-black text-xs">
                          {task.notes.length > 40 ? `${task.notes.substring(0, 40)}...` : task.notes}
                        </div>
                      ) : (
                        <span className="text-black">—</span>
                      )}
                    </td>,
                    <td key="client" style={{ backgroundColor: getTypeRowStyle ? getTypeRowStyle(task.type).backgroundColor : 'transparent', padding: '8px', fontSize: 'var(--font-size-sm)' }}>
                      <div className="flex items-center gap-2">
                        {task.client?.id ? (
                          <Link 
                            to={`/employee/clients/${task.client.id}`}
                            className="font-medium no-underline text-black hover:text-primary transition-colors"
                          >
                            {task.client.name}
                          </Link>
                        ) : (
                          <span className="font-medium">{task.client?.name || 'غير محدد'}</span>
                        )}
                        <span className="text-black text-xs">{task.client?.phone}</span>
                        {task.client?.phone && (
                          <a
                            href={`https://wa.me/${task.client.phone.replace(/[^\d]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-0 hover:scale-110 transition-transform"
                            title="إرسال رسالة واتساب"
                          >
                            <MessageCircle size={12} className="text-green-600" />
                          </a>
                        )}
                      </div>
                    </td>,
                    <td key="type" style={{ backgroundColor: getTypeRowStyle ? getTypeRowStyle(task.type).backgroundColor : 'transparent', padding: '8px', fontSize: 'var(--font-size-sm)' }}>
                      <span className="px-2.5 py-1 bg-primary text-white rounded-full text-xs font-medium">{task.type}</span>
                    </td>,
                    <td key="status" style={{ backgroundColor: getTypeRowStyle ? getTypeRowStyle(task.type).backgroundColor : 'transparent', padding: '8px', fontSize: 'var(--font-size-sm)' }}>
                      {getStatusBadgeStyle ? (
                        <span 
                          className="inline-block px-2 py-1 rounded-xl text-xs font-medium"
                          style={{
                            ...getStatusBadgeStyle(task.status)
                          }}
                        >
                          {getStatusText(task.status)}
                        </span>
                      ) : (
                        getStatusBadge(task.status)
                      )}
                    </td>,
                    <td key="start" style={{ backgroundColor: getTypeRowStyle ? getTypeRowStyle(task.type).backgroundColor : 'transparent', padding: '8px', fontSize: 'var(--font-size-sm)' }}>
                      <div className="flex items-center text-black">
                        <Calendar size={14} className="me-1" />
                        {formatDate(task.start_date)}
                      </div>
                    </td>,
                    <td key="end" style={{ backgroundColor: getTypeRowStyle ? getTypeRowStyle(task.type).backgroundColor : 'transparent', padding: '8px', fontSize: 'var(--font-size-sm)' }}>
                      <div className="flex items-center text-black">
                        <Calendar size={14} className="me-1" />
                        {formatDate(task.end_date)}
                      </div>
                    </td>,
                    <td key="actions" style={{ backgroundColor: getTypeRowStyle ? getTypeRowStyle(task.type).backgroundColor : 'transparent', padding: '8px', fontSize: 'var(--font-size-sm)' }}>
                      <div className="flex justify-center gap-1">
                        {/* View Amount Details */}
                        <button
                          onClick={() => handleViewAmountDetails(task)}
                          className="px-1.5 py-0.5 text-xs border border-blue-500 text-blue-500 rounded hover:bg-blue-500 hover:text-white transition-colors"
                          title="عرض تفاصيل المبلغ"
                        >
                          <Eye size={12} />
                        </button>

                        {/* Edit Task */}
                        <button
                          onClick={() => handleEditTask(task)}
                          className="px-1.5 py-0.5 text-xs border border-primary text-primary rounded hover:bg-primary hover:text-white transition-colors"
                          title="تعديل المهمة"
                        >
                          <Edit2 size={12} />
                        </button>

                        {/* Submit for Review - only for certain statuses */}
                        {['New', 'Deferred'].includes(task.status) && (
                          <button
                            onClick={() => handleSubmitForReview(task)}
                            className="px-1.5 py-0.5 text-xs border border-green-600 text-green-600 rounded hover:bg-green-600 hover:text-white transition-colors"
                            title="تقديم للمراجعة"
                            disabled={submitForReviewMutation.isPending}
                          >
                            <CheckCircle size={12} />
                          </button>
                        )}

                        {/* Show Requirements */}
                        {task.requirements && task.requirements.length > 0 && (
                          <button
                            onClick={() => handleShowRequirements(task)}
                            className="px-1.5 py-0.5 text-xs border border-yellow-600 text-yellow-600 rounded hover:bg-yellow-600 hover:text-white transition-colors"
                            title="عرض المتطلبات"
                          >
                            <FileText size={12} />
                          </button>
                        )}

                        {/* Cancel Task */}
                        <button
                          onClick={() => handleDeleteTask(task)}
                          className="px-1.5 py-0.5 text-xs border border-red-600 text-red-600 rounded hover:bg-red-600 hover:text-white transition-colors"
                          title="حذف المهمة"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </td>
                  ]}
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Infinite scroll trigger */}
      {(hasNextPage || isFetchingNextPage) && (
        <div ref={ref} className="text-center p-3">
          {isFetchingNextPage ? (
            <div className="spinner-border spinner-border-sm text-primary" role="status">
              <span className="visually-hidden">جاري تحميل المزيد...</span>
            </div>
          ) : (
            <div className="text-black text-sm">
              عرض {tasks.length} مهمة
            </div>
          )}
        </div>
      )}
      
      {/* Show total when no more data */}
      {!hasNextPage && tasks.length > 0 && (
        <div className="px-4 py-3 bg-muted/30 border-t border-border text-center">
          <small className="text-black">
            تم عرض جميع المهام ({tasks.length} مهمة)
          </small>
        </div>
      )}
    </div>
  );
};

export default EmployeeOwnTasksTable;
