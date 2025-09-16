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
  Trash2, 
  CheckCircle, 
  FileText, 
  AlertCircle,
  Calendar,
  MessageCircle
} from 'lucide-react';
import { useDeleteTask } from '../../queries/taskQueries';

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

  // Delete task mutation
  const deleteTaskMutation = useDeleteTask();

  // Flatten the pages into a single array for rendering
  const tasks = useMemo(() => data?.pages.flatMap(page => page.tasks) || [], [data]);

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
    if (confirm(`هل أنت متأكد من حذف المهمة "${task.task_name}"؟`)) {
      deleteTaskMutation.mutate(task.id);
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
      <div className="d-flex justify-content-center align-items-center p-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">جاري التحميل...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        <AlertCircle size={20} className="me-2" />
        خطأ في تحميل المهام. يرجى المحاولة مرة أخرى.
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center p-5">
        <FileText size={48} className="text-muted mb-3" />
        <h5 className="text-muted">لا توجد مهام</h5>
        <p className="text-muted">لم يتم العثور على أي مهام بناءً على المعايير المحددة.</p>
      </div>
    );
  }

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table mb-0">
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
              {tasks.map((task) => {
                const isHighlighted = highlightTaskId && task.id.toString() === highlightTaskId;
                return (
                <tr
                  key={task.id}
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
                        className="w-80 text-center py-1"
                        style={{ 
                          backgroundColor: 'rgba(255, 193, 7, 0.1)', 
                          cursor: 'pointer',
                          fontSize: '0.8em'
                        }}
                        onClick={handleHighlightClick}
                        title="انقر لإزالة التمييز"
                      >
                        <small className="text-dark fw-bold">
                          ⭐ هذه المهمة المحددة من الإشعار - انقر لإزالة التمييز
                        </small>
                      </div>
                    </td>
                  )}
                  {[
                    <td key="name" style={{ backgroundColor: getTypeRowStyle ? getTypeRowStyle(task.type).backgroundColor : 'transparent', padding: '8px', fontSize: 'var(--font-size-sm)' }}>
                      <span className="fw-bold text-dark">{task.task_name || 'مهمة بدون اسم'}</span>
                    </td>,
                    <td key="notes" style={{ backgroundColor: getTypeRowStyle ? getTypeRowStyle(task.type).backgroundColor : 'transparent', padding: '8px', fontSize: 'var(--font-size-sm)' }}>
                      {task.notes ? (
                        <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                          {task.notes.length > 40 ? `${task.notes.substring(0, 40)}...` : task.notes}
                        </div>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>,
                    <td key="client" style={{ backgroundColor: getTypeRowStyle ? getTypeRowStyle(task.type).backgroundColor : 'transparent', padding: '8px', fontSize: 'var(--font-size-sm)' }}>
                      <div className="d-flex align-items-center gap-2">
                        {task.client?.id ? (
                          <Link 
                            to={`/employee/clients/${task.client.id}`}
                            className="fw-medium text-decoration-none text-dark"
                          >
                            {task.client.name}
                          </Link>
                        ) : (
                          <span className="fw-medium">{task.client?.name || 'غير محدد'}</span>
                        )}
                        <span className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>{task.client?.phone}</span>
                        {task.client?.phone && (
                          <a
                            href={`https://wa.me/${task.client.phone.replace(/[^\d]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm p-0"
                            title="إرسال رسالة واتساب"
                            style={{ fontSize: '12px' }}
                          >
                            <MessageCircle size={12} className="text-success" />
                          </a>
                        )}
                      </div>
                    </td>,
                    <td key="type" style={{ backgroundColor: getTypeRowStyle ? getTypeRowStyle(task.type).backgroundColor : 'transparent', padding: '8px', fontSize: 'var(--font-size-sm)' }}>
                      <span className="badge" style={{ backgroundColor: 'var(--color-primary)', color: 'white', fontSize: '0.75rem' }}>{task.type}</span>
                    </td>,
                    <td key="status" style={{ backgroundColor: getTypeRowStyle ? getTypeRowStyle(task.type).backgroundColor : 'transparent', padding: '8px', fontSize: 'var(--font-size-sm)' }}>
                      {getStatusBadgeStyle ? (
                        <span 
                          className="badge"
                          style={{
                            ...getStatusBadgeStyle(task.status),
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: '500'
                          }}
                        >
                          {getStatusText(task.status)}
                        </span>
                      ) : (
                        getStatusBadge(task.status)
                      )}
                    </td>,
                    <td key="start" style={{ backgroundColor: getTypeRowStyle ? getTypeRowStyle(task.type).backgroundColor : 'transparent', padding: '8px', fontSize: 'var(--font-size-sm)' }}>
                      <div className="d-flex align-items-center text-muted">
                        <Calendar size={14} className="me-1" />
                        {formatDate(task.start_date)}
                      </div>
                    </td>,
                    <td key="end" style={{ backgroundColor: getTypeRowStyle ? getTypeRowStyle(task.type).backgroundColor : 'transparent', padding: '8px', fontSize: 'var(--font-size-sm)' }}>
                      <div className="d-flex align-items-center text-muted">
                        <Calendar size={14} className="me-1" />
                        {formatDate(task.end_date)}
                      </div>
                    </td>,
                    <td key="actions" style={{ backgroundColor: getTypeRowStyle ? getTypeRowStyle(task.type).backgroundColor : 'transparent', padding: '8px', fontSize: 'var(--font-size-sm)' }}>
                      <div className="d-flex justify-content-center gap-1">
                        {/* View Amount Details */}
                        <button
                          onClick={() => handleViewAmountDetails(task)}
                          className="btn btn-sm btn-outline-info"
                          title="عرض تفاصيل المبلغ"
                          style={{ padding: '2px 6px' }}
                        >
                          <Eye size={12} />
                        </button>

                        {/* Edit Task */}
                        <button
                          onClick={() => handleEditTask(task)}
                          className="btn btn-sm btn-outline-primary"
                          title="تعديل المهمة"
                          style={{ padding: '2px 6px' }}
                        >
                          <Edit2 size={12} />
                        </button>

                        {/* Submit for Review - only for certain statuses */}
                        {['New', 'Deferred'].includes(task.status) && (
                          <button
                            onClick={() => handleSubmitForReview(task)}
                            className="btn btn-sm btn-outline-success"
                            title="تقديم للمراجعة"
                            style={{ padding: '2px 6px' }}
                            disabled={submitForReviewMutation.isPending}
                          >
                            <CheckCircle size={12} />
                          </button>
                        )}

                        {/* Show Requirements */}
                        {task.requirements && task.requirements.length > 0 && (
                          <button
                            onClick={() => handleShowRequirements(task)}
                            className="btn btn-sm btn-outline-warning"
                            title="عرض المتطلبات"
                            style={{ padding: '2px 6px' }}
                          >
                            <FileText size={12} />
                          </button>
                        )}

                        {/* Delete Task */}
                        <button
                          onClick={() => handleDeleteTask(task)}
                          className="btn btn-sm btn-outline-danger"
                          title="حذف المهمة"
                          style={{ padding: '2px 6px' }}
                        >
                          <Trash2 size={12} />
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
            <div className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
              عرض {tasks.length} مهمة
            </div>
          )}
        </div>
      )}
      
      {/* Show total when no more data */}
      {!hasNextPage && tasks.length > 0 && (
        <div className="card-footer bg-light border-0 text-center">
          <small className="text-muted">
            تم عرض جميع المهام ({tasks.length} مهمة)
          </small>
        </div>
      )}
    </div>
  );
};

export default EmployeeOwnTasksTable;
