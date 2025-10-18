// Admin Employee Tasks Table with Filters
import { useState, Fragment } from 'react';
import type { Task } from '../api/types';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import Button from '../components/ui/Button';
import WhatsAppIcon from '../components/ui/WhatsAppIcon';
import { 
  Pause, 
  Play, 
  ExternalLink, 
  MessageSquare, 
  ClipboardCheck, 
  RotateCcw,
  Upload,
  Filter
} from 'lucide-react';
import { useDeferTask, useResumeTask, useRestoreTask } from '../queries/taskQueries';
import { useToast } from '../hooks/useToast';
import { useModalStore } from '../stores/modalStore';
import { useDrawerStore } from '../stores/drawerStore';
import { useStickyHeader } from '../hooks/useStickyHeader';
import { useAdminSubmitTaskForReview } from './employeeManagementQueries';
import { useGetAdminEmployeeTasks, type EmployeeTasksFilters } from './employeeManagementQueries';
import Input from '../components/ui/Input';

interface AdminEmployeeTasksTableProps {
  employeeId: number;
}

const AdminEmployeeTasksTable = ({ employeeId }: AdminEmployeeTasksTableProps) => {
  const { t } = useTranslation();
  const deferTaskMutation = useDeferTask();
  const resumeTaskMutation = useResumeTask();
  const restoreTaskMutation = useRestoreTask();
  const submitForReviewMutation = useAdminSubmitTaskForReview();
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const { openDrawer } = useDrawerStore();
  const { openModal } = useModalStore();
  const { sentinelRef, isSticky } = useStickyHeader();

  // Filter states - Applied filters (used for API)
  const [page, setPage] = useState(1);
  const [appliedStatuses, setAppliedStatuses] = useState<string[]>([]);
  const [appliedType, setAppliedType] = useState<string>('');
  const [appliedDateFrom, setAppliedDateFrom] = useState<string>('');
  const [appliedDateTo, setAppliedDateTo] = useState<string>('');
  
  // Temporary filter states (changed in modal, not applied yet)
  const [tempStatuses, setTempStatuses] = useState<string[]>([]);
  const [tempType, setTempType] = useState<string>('');
  const [tempDateFrom, setTempDateFrom] = useState<string>('');
  const [tempDateTo, setTempDateTo] = useState<string>('');
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  // Build filters object with APPLIED filters only
  const filters: EmployeeTasksFilters = {
    page,
    per_page: 20,
    ...(appliedStatuses.length > 0 && { status: appliedStatuses.join(',') }),
    ...(appliedType && { type: appliedType }),
    ...(appliedDateFrom && { date_from: appliedDateFrom }),
    ...(appliedDateTo && { date_to: appliedDateTo })
  };

  // Fetch tasks with filters
  const { data: tasksData, isLoading } = useGetAdminEmployeeTasks(employeeId, filters);
  const tasks = tasksData?.tasks || [];
  const total = tasksData?.pagination?.total || 0;
  const totalPages = Math.ceil(total / 20);

  // Handle temporary status checkbox change (in modal)
  const handleTempStatusChange = (status: string) => {
    setTempStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status) 
        : [...prev, status]
    );
  };

  // Handle temporary type change (in modal)
  const handleTempTypeChange = (type: string) => {
    setTempType(type);
  };

  // Handle temporary date change (in modal)
  const handleTempDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempDateFrom(e.target.value);
  };

  const handleTempDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempDateTo(e.target.value);
  };

  // Open filter modal and sync temp states with applied states
  const openFiltersModal = () => {
    setTempStatuses([...appliedStatuses]);
    setTempType(appliedType);
    setTempDateFrom(appliedDateFrom);
    setTempDateTo(appliedDateTo);
    setShowFiltersModal(true);
  };

  // Apply filters - move temp states to applied states
  const applyFilters = () => {
    setAppliedStatuses([...tempStatuses]);
    setAppliedType(tempType);
    setAppliedDateFrom(tempDateFrom);
    setAppliedDateTo(tempDateTo);
    setPage(1);
    setShowFiltersModal(false);
  };

  // Clear all filters
  const clearFilters = () => {
    setTempStatuses([]);
    setTempType('');
    setTempDateFrom('');
    setTempDateTo('');
    setAppliedStatuses([]);
    setAppliedType('');
    setAppliedDateFrom('');
    setAppliedDateTo('');
    setPage(1);
    setShowFiltersModal(false);
  };

  // Handle defer task
  const handleDefer = (task: Task) => {
    deferTaskMutation.mutate({ id: task.id }, {
      onSuccess: () => {
        success(t('tasks.deferSuccess'), t('tasks.deferSuccessMessage', {
          taskName: task.task_name || t(`type.${task.type}`)
        }));
      },
      onError: (err: any) => {
        error(t('common.error'), err.message || t('tasks.deferError'));
      }
    });
  };

  // Handle resume task
  const handleResume = (task: Task) => {
    resumeTaskMutation.mutate({ id: task.id }, {
      onSuccess: () => {
        success(t('tasks.resumeSuccess'), t('tasks.resumeSuccessMessage', {
          taskName: task.task_name || t(`type.${task.type}`)
        }));
      },
      onError: (err: any) => {
        error(t('common.error'), err.message || t('tasks.resumeError'));
      }
    });
  };

  // Handle restore completed task
  const handleRestore = (task: Task) => {
    restoreTaskMutation.mutate({ id: task.id }, {
      onSuccess: () => {
        success('تمت الاستعادة', `تم استعادة المهمة "${task.task_name || t(`type.${task.type}`)}" إلى حالة جديدة`);
      },
      onError: (err: any) => {
        error(t('common.error'), err.message || 'حدث خطأ أثناء استعادة المهمة');
      }
    });
  };

  // Handle submit for review with immediate approval modal
  const handleSubmitForReview = (task: Task) => {
    submitForReviewMutation.mutate(task.id, {
      onSuccess: async (response) => {
        success('تم الإرسال', `تم إرسال المهمة "${task.task_name || 'مهمة'}" للمراجعة بنجاح`);
        
        // Invalidate queries to refresh data
        await queryClient.invalidateQueries({ queryKey: ['tasks'] });
        await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        
        // Small delay to ensure database commit
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Open approval modal with updated task status
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

  // Handle opening approval modal directly for pending review tasks
  const handleApproveTask = (task: Task) => {
    openModal('approval', { task });
  };

  // Helper function to get type background color
  const getTypeRowStyle = (type: string) => {
    switch (type) {
      case 'Government':
        return { backgroundColor: 'rgba(74, 162, 255, 0.01)' };
      case 'RealEstate':
        return { backgroundColor: 'rgba(90, 175, 110, 0.1)' };
      case 'Accounting':
        return { backgroundColor: 'rgba(248, 220, 61, 0.1)' };
      default:
        return { backgroundColor: 'rgba(206, 208, 209, 0.1)' };
    }
  };

  // Helper function to format WhatsApp URL
  const getWhatsAppUrl = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? `966${cleanPhone.substring(1)}` : `966${cleanPhone}`;
    return `https://wa.me/${formattedPhone}`;
  };

  if (isLoading) {
    return <div className="p-4 text-center">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
      <span className="text-black mt-2 block">جاري تحميل المهام...</span>
    </div>;
  }

  // Sort tasks: Newest Urgent first, then Urgent, then newest normal tasks
  let sortedTasks = [...tasks].sort((a, b) => {
    const aIsUrgent = a.tags?.some((tag: any) => tag.name === 'قصوى') || false;
    const bIsUrgent = b.tags?.some((tag: any) => tag.name === 'قصوى') || false;
    const aDate = new Date(a.created_at || a.start_date).getTime();
    const bDate = new Date(b.created_at || b.start_date).getTime();

    if (aIsUrgent && bIsUrgent) {
      return bDate - aDate;
    }
    if (!aIsUrgent && !bIsUrgent) {
      return bDate - aDate;
    }
    
    return aIsUrgent ? -1 : 1;
  });

  sortedTasks = sortedTasks.sort((a, b) => {
    const statusOrder = ['New', 'Pending Review', 'Deferred', 'Completed', 'Cancelled'];
    return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
  });

  return (
    <div className="w-full">
      {/* Filter Toggle Button */}
      <div className="p-3 bg-light border-bottom d-flex justify-content-between align-items-center">
        <div className="d-flex gap-2">
          <Button
            variant="outline-primary"
            size="sm"
            onClick={openFiltersModal}
          >
            <Filter size={16} className="me-1" />
            تصفية المهام
            {(appliedStatuses.length > 0 || appliedType || appliedDateFrom || appliedDateTo) && (
              <span className="badge bg-primary ms-2">
                {appliedStatuses.length + (appliedType ? 1 : 0) + (appliedDateFrom || appliedDateTo ? 1 : 0)}
              </span>
            )}
          </Button>
          {(appliedStatuses.length > 0 || appliedType || appliedDateFrom || appliedDateTo) && (
            <Button
              variant="outline-danger"
              size="sm"
              onClick={clearFilters}
            >
              مسح الفلاتر
            </Button>
          )}
        </div>
        <small className="text-muted">
          عرض {sortedTasks.length} من أصل {total} مهمة
          {(appliedStatuses.length > 0 || appliedType || appliedDateFrom || appliedDateTo) && ' (مفلترة)'}
        </small>
      </div>

      {/* Filters Modal */}
      {showFiltersModal && (
        <div 
          className="modal show d-block" 
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowFiltersModal(false)}
        >
          <div 
            className="modal-dialog modal-dialog-centered modal-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">تصفية المهام</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowFiltersModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                {/* Status Filter */}
                <div className="mb-4">
                  <label className="form-label fw-bold">الحالة</label>
                  <div className="d-flex flex-wrap gap-2">
                    {['New', 'Pending Review', 'Deferred', 'Completed', 'Cancelled'].map(status => (
                      <Fragment key={status}>
                        <input
                          type="checkbox"
                          className="btn-check"
                          id={`modal-status-${status}`}
                          checked={tempStatuses.includes(status)}
                          onChange={() => handleTempStatusChange(status)}
                        />
                        <label className="btn btn-outline-primary" htmlFor={`modal-status-${status}`}>
                          {t(`status.${status}`)}
                        </label>
                      </Fragment>
                    ))}
                  </div>
                </div>

                {/* Type Filter */}
                <div className="mb-4">
                  <label className="form-label fw-bold">النوع</label>
                  <select
                    value={tempType}
                    onChange={(e) => handleTempTypeChange(e.target.value)}
                    className="form-select"
                  >
                    <option value="">جميع الأنواع</option>
                    <option value="Government">حكومي</option>
                    <option value="RealEstate">عقاري</option>
                    <option value="Accounting">محاسبي</option>
                    <option value="Other">أخرى</option>
                  </select>
                </div>

                {/* Date Range */}
                <div className="mb-4">
                  <label className="form-label fw-bold">نطاق التاريخ</label>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label text-muted small">من تاريخ</label>
                      <Input
                        type="date"
                        value={tempDateFrom}
                        onChange={handleTempDateFromChange}
                        className="form-control"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-muted small">إلى تاريخ</label>
                      <Input
                        type="date"
                        value={tempDateTo}
                        onChange={handleTempDateToChange}
                        className="form-control"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <Button
                  variant="outline-secondary"
                  onClick={() => setShowFiltersModal(false)}
                >
                  إلغاء
                </Button>
                <Button
                  variant="outline-danger"
                  onClick={clearFilters}
                >
                  مسح الكل
                </Button>
                <Button
                  variant="primary"
                  onClick={applyFilters}
                >
                  تطبيق الفلاتر
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tasks Table */}
      <div className="table-responsive" style={{ fontSize: '1.2em' }}>
        <div ref={sentinelRef}></div>
        
        <table className={`table table-sm table-hover ${isSticky ? 'sticky-header' : ''}`}>
          <thead className="table-light">
            <tr>
              <th className="text-end text-black fw-bold">‏{t('tasks.tableHeaderClient')}</th>
              <th className="text-end text-black fw-bold">‏{t('tasks.tableHeaderClientPhone')}</th>
              <th className="text-end text-black fw-bold">‏{t('tasks.tableHeaderService')}</th>
              <th className="text-end text-black fw-bold">‏{t('tasks.tableHeaderType')}</th>
              <th className="text-end text-black fw-bold">‏{t('tasks.tableHeaderNotes')}</th>
              <th className="text-end text-black fw-bold">‏{t('tasks.tableHeaderStatus')}</th>
              <th className="text-start text-black fw-bold">{t('tasks.tableHeaderActions')}</th>
            </tr>
          </thead>
          <tbody>
            {sortedTasks.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-muted py-4">
                  لا توجد مهام
                </td>
              </tr>
            ) : (
              sortedTasks.map((task) => {
                const isUrgent = task.tags?.some((tag: any) => tag.name === 'قصوى');
                const typeStyle = getTypeRowStyle(task.type);
                
                return (
                  <tr 
                    key={task.id} 
                    style={typeStyle}
                    className={`task-row-${task.type.toLowerCase()} ${isUrgent ? 'border-danger border-2' : ''}`}
                  >
                    {/* Client */}
                    <td>
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          {task.client ? (
                            <Link 
                              to={`/clients/${task.client.id}`}
                              className="fw-medium text-black text-decoration-none"
                            >
                              {task.client.name}
                            </Link>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className='text-center'>
                      <div className="d-flex align-items-center justify-content-center gap-1">
                        {task.client ? (
                          <>
                            <a
                              href={getWhatsAppUrl(task.client.phone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-success"
                              title="فتح واتساب"
                            >
                              <WhatsAppIcon />
                            </a>
                            <span className="text-sm text-muted">{task.client.phone}</span>
                          </>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </div>
                    </td>

                    {/* Service/Task name */}
                    <td>
                      <div className="fw-medium text-black">
                        {task.task_name || t(`type.${task.type}`)}
                      </div>
                    </td>

                    {/* Type */}
                    <td>
                      <span className="fw-medium text-black">{t(`type.${task.type}`)}</span>
                    </td>

                    {/* Notes */}
                    <td>
                      <div className="text-sm text-black text-truncate" style={{ maxWidth: '200px' }}>
                        {task.notes || '—'}
                      </div>
                    </td>

                    {/* Status */}
                    <td>
                      <span className={`badge ${
                        task.status === 'New' ? 'bg-warning text-dark' :
                        task.status === 'Deferred' ? 'bg-danger' :
                        task.status === 'Completed' ? 'bg-success' :
                        task.status === 'Pending Review' ? 'bg-info text-dark' :
                        'bg-secondary'
                      }`}>
                        {t(`status.${task.status}`)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="text-start">
                      <div className="d-flex justify-content-start gap-1 flex-wrap">
                        {/* Google Drive Link */}
                        {task.client?.google_drive_link && (
                          <Button 
                            variant="outline-secondary" 
                            size="sm" 
                            onClick={() => window.open(task.client!.google_drive_link!, '_blank')}
                            title="فتح Google Drive"
                          >
                            <ExternalLink size={18} />
                          </Button>
                        )}

                        {/* Follow-up */}
                        <Button 
                          variant="outline-secondary" 
                          size="sm" 
                          onClick={() => openDrawer('taskFollowUp', { 
                            taskId: task.id,
                            taskName: task.task_name || undefined,
                            clientName: task.client?.name || 'عميل غير محدد'
                          })} 
                          title="عرض المراسلات والمتابعة"
                        >
                          <MessageSquare size={18} />
                        </Button>

                        {/* Submit for Review - NEW special button */}
                        {task.status === 'New' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleSubmitForReview(task)}
                            title="إرسال للمراجعة والموافقة"
                          >
                            <Upload size={18} />
                          </Button>
                        )}

                        {/* Approve Task - for pending review tasks */}
                        {task.status === 'Pending Review' && (
                          <Button
                            variant="outline-success"
                            size="sm"
                            onClick={() => handleApproveTask(task)}
                            title="الموافقة على المهمة"
                          >
                            <ClipboardCheck size={18} />
                          </Button>
                        )}

                        {/* Defer/Resume */}
                        {task.status !== 'Deferred' && task.status !== 'Completed' ? (
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => handleDefer(task)}
                            title="تأجيل المهمة"
                          >
                            <Pause size={18} />
                          </Button>
                        ) : task.status === 'Deferred' ? (
                          <Button
                            variant="outline-info"
                            size="sm"
                            onClick={() => handleResume(task)}
                            title="استئناف المهمة"
                          >
                            <Play size={18} />
                          </Button>
                        ) : null}

                        {/* Restore Completed Task */}
                        {task.status === 'Completed' && (
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handleRestore(task)}
                            title="استعادة المهمة"
                          >
                            <RotateCcw size={18} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Custom styles for row type backgrounds */}
        <style>{`
          .task-row-government > td {
            background-color: rgba(74, 162, 255, 0.08) !important;
          }
          .task-row-government:hover > td {
            background-color: rgba(74, 162, 255, 0.15) !important;
          }
          
          .task-row-realestate > td {
            background-color: rgba(90, 175, 110, 0.08) !important;
          }
          .task-row-realestate:hover > td {
            background-color: rgba(90, 175, 110, 0.15) !important;
          }
          
          .task-row-accounting > td {
            background-color: rgba(248, 220, 61, 0.08) !important;
          }
          .task-row-accounting:hover > td {
            background-color: rgba(248, 220, 61, 0.15) !important;
          }
          
          .task-row-other > td {
            background-color: rgba(206, 208, 209, 0.08) !important;
          }
          .task-row-other:hover > td {
            background-color: rgba(206, 208, 209, 0.15) !important;
          }
        `}</style>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => setPage(prev => Math.max(1, prev - 1))}
            disabled={page === 1}
          >
            السابق
          </Button>
          <span className="text-sm text-gray-600">
            صفحة {page} من {totalPages}
          </span>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
            disabled={page === totalPages}
          >
            التالي
          </Button>
        </div>
      )}
    </div>
  );
};

export default AdminEmployeeTasksTable;
