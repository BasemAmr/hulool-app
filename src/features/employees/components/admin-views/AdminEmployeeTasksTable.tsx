// Admin Employee Tasks Table with Filters - Tailwind version
import { useState, Fragment } from 'react';
import type { Task } from '@/api/types';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import Button from '@/shared/ui/primitives/Button';
import WhatsAppIcon from '@/shared/ui/icons/WhatsAppIcon';
import {
  Pause,
  Play,
  ExternalLink,
  MessageSquare,
  ClipboardCheck,
  RotateCcw,
  Upload,
  Filter,
  X
} from 'lucide-react';
import { useDeferTask, useResumeTask, useRestoreTask } from '@/features/tasks/api/taskQueries';
import { useToast } from '@/shared/hooks/useToast';
import { useModalStore } from '@/shared/stores/modalStore';
import { useDrawerStore } from '@/shared/stores/drawerStore';
import { useStickyHeader } from '@/shared/hooks/useStickyHeader';
import { useAdminSubmitTaskForReview } from '@/features/employees/api/employeeManagementQueries';
import { useGetAdminEmployeeTasks, type EmployeeTasksFilters } from '@/features/employees/api/employeeManagementQueries';
import Input from '@/shared/ui/primitives/Input';
import { Badge } from '@/shared/ui/shadcn/badge';
import { cn } from '@/shared/utils/cn';

interface AdminEmployeeTasksTableProps {
  userId: number;
}

const neutralActionButtonClass = 'inline-flex items-center justify-center rounded p-1.5 text-text-secondary hover:text-text-primary cursor-pointer transition-colors duration-150';

const AdminEmployeeTasksTable = ({ userId }: AdminEmployeeTasksTableProps) => {
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
  const { data: tasksData, isLoading } = useGetAdminEmployeeTasks(userId, filters);
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
  const getTypeRowClass = (type: string) => {
    switch (type) {
      case 'Government':
        return 'bg-status-info-bg/50 hover:bg-status-info-bg/50';
      case 'RealEstate':
        return 'bg-status-success-bg/50 hover:bg-status-success-bg/50';
      case 'Accounting':
        return 'bg-status-warning-bg/50 hover:bg-status-warning-bg/50';
      default:
        return 'bg-background hover:bg-background';
    }
  };

  // Helper function to format WhatsApp URL
  const getWhatsAppUrl = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? `966${cleanPhone.substring(1)}` : `966${cleanPhone}`;
    return `https://wa.me/${formattedPhone}`;
  };

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        <span className="text-text-primary mt-2 block">جاري تحميل المهام...</span>
      </div>
    );
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

  const activeFiltersCount = appliedStatuses.length + (appliedType ? 1 : 0) + (appliedDateFrom || appliedDateTo ? 1 : 0);

  return (
    <div className="w-full">
      {/* Filter Toggle Button */}
      <div className="p-3 bg-bg-surface-muted border-b flex justify-between items-center">
        <div className="flex gap-2">
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={openFiltersModal}
          >
            <Filter size={16} className="ml-1" />
            تصفية المهام
            {activeFiltersCount > 0 && (
              <Badge className="bg-primary text-white mr-2">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
          {activeFiltersCount > 0 && (
            <Button
              variant="outline-danger"
              size="sm"
              onClick={clearFilters}
            >
              مسح الفلاتر
            </Button>
          )}
        </div>
        <small className="text-muted-foreground">
          عرض {sortedTasks.length} من أصل {total} مهمة
          {activeFiltersCount > 0 && ' (مفلترة)'}
        </small>
      </div>

      {/* Filters Modal */}
      {showFiltersModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
          onClick={() => setShowFiltersModal(false)}
        >
          <div
            className="bg-card rounded-lg shadow-xl w-full max-w-2xl mx-4 border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b">
              <h5 className="font-semibold text-lg">تصفية المهام</h5>
              <button
                className="p-1 hover:bg-bg-surface-muted rounded"
                onClick={() => setShowFiltersModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              {/* Status Filter */}
              <div className="mb-4">
                <label className="block font-bold mb-2">الحالة</label>
                <div className="flex flex-wrap gap-2">
                  {['New', 'Pending Review', 'Deferred', 'Completed', 'Cancelled'].map(status => (
                    <Fragment key={status}>
                      <label
                        className={cn(
                          "px-3 py-1.5 rounded border cursor-pointer transition-colors",
                          tempStatuses.includes(status)
                            ? "bg-primary text-white border-primary"
                            : "bg-card border-border-strong hover:bg-bg-surface-muted"
                        )}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={tempStatuses.includes(status)}
                          onChange={() => handleTempStatusChange(status)}
                        />
                        {t(`status.${status}`)}
                      </label>
                    </Fragment>
                  ))}
                </div>
              </div>

              {/* Type Filter */}
              <div className="mb-4">
                <label className="block font-bold mb-2">النوع</label>
                <select
                  value={tempType}
                  onChange={(e) => handleTempTypeChange(e.target.value)}
                  className="w-full px-3 py-2 border border-border-strong rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                <label className="block font-bold mb-2">نطاق التاريخ</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">من تاريخ</label>
                    <Input
                      type="date"
                      value={tempDateFrom}
                      onChange={handleTempDateFromChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">إلى تاريخ</label>
                    <Input
                      type="date"
                      value={tempDateTo}
                      onChange={handleTempDateToChange}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
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
      )}

      {/* Tasks Table */}
      <div className="overflow-x-auto text-lg">
        <div ref={sentinelRef}></div>

        <table className={cn("w-full text-sm", isSticky && "sticky-header")}>
          <thead className="bg-bg-surface-muted">
            <tr>
              <th className="text-right text-text-primary font-bold px-4 py-3">‏{t('tasks.tableHeaderClient')}</th>
              <th className="text-right text-text-primary font-bold px-4 py-3">‏{t('tasks.tableHeaderClientPhone')}</th>
              <th className="text-right text-text-primary font-bold px-4 py-3">‏{t('tasks.tableHeaderService')}</th>
              <th className="text-right text-text-primary font-bold px-4 py-3">‏{t('tasks.tableHeaderType')}</th>
              <th className="text-right text-text-primary font-bold px-4 py-3">‏{t('tasks.tableHeaderNotes')}</th>
              <th className="text-right text-text-primary font-bold px-4 py-3">‏{t('tasks.tableHeaderStatus')}</th>
              <th className="text-left text-text-primary font-bold px-4 py-3">{t('tasks.tableHeaderActions')}</th>
            </tr>
          </thead>
          <tbody>
            {sortedTasks.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-muted-foreground py-8">
                  لا توجد مهام
                </td>
              </tr>
            ) : (
              sortedTasks.map((task) => {
                const isUrgent = task.tags?.some((tag: any) => tag.name === 'قصوى');
                const typeClass = getTypeRowClass(task.type);

                return (
                  <tr
                    key={task.id}
                    className={cn(
                      typeClass,
                      "border-b transition-colors",
                      isUrgent && "border-2 border-status-danger-border"
                    )}
                  >
                    {/* Client */}
                    <td className="px-4 py-3">
                      <div className="flex justify-between items-center">
                        <div>
                          {task.client ? (
                            <Link
                              to={`/clients/${task.client.id}`}
                              className="font-medium text-text-primary no-underline hover:underline"
                            >
                              {task.client.name}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {task.client ? (
                          <>
                            <a
                              href={getWhatsAppUrl(task.client.phone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-status-success-text"
                              title="فتح واتساب"
                            >
                              <WhatsAppIcon />
                            </a>
                            <span className="text-sm text-muted-foreground">{task.client.phone}</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>

                    {/* Service/Task name */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-text-primary">
                        {task.task_name || t(`type.${task.type}`)}
                      </div>
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3">
                      <span className="font-medium text-text-primary">{t(`type.${task.type}`)}</span>
                    </td>

                    {/* Notes */}
                    <td className="px-4 py-3">
                      <div className="text-sm text-text-primary truncate max-w-[200px]">
                        {task.notes || '—'}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          task.status === 'New' ? 'default' :
                            task.status === 'Deferred' ? 'destructive' :
                              task.status === 'Pending Review' ? 'secondary' :
                                task.status === 'Completed' ? 'default' :
                                  'outline'
                        }
                        className={cn(
                          task.status === 'New' && "bg-status-warning-bg0 text-text-primary hover:bg-status-warning-bg0",
                          task.status === 'Pending Review' && "bg-blue-400 text-text-primary hover:bg-blue-400",
                          task.status === 'Completed' && "bg-status-success-bg0 text-white hover:bg-status-success-bg0"
                        )}
                      >
                        {t(`status.${task.status}`)}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-left">
                      <div className="flex justify-start gap-1 flex-wrap">
                        {/* Google Drive Link */}
                        {task.client?.google_drive_link && (
                          <button
                            type="button"
                            onClick={() => window.open(task.client!.google_drive_link!, '_blank')}
                            title="فتح Google Drive"
                            className={neutralActionButtonClass}
                          >
                            <ExternalLink size={18} />
                          </button>
                        )}

                        {/* Follow-up */}
                        <button
                          type="button"
                          onClick={() => openDrawer('taskFollowUp', {
                            taskId: task.id,
                            taskName: task.task_name || undefined,
                            clientName: task.client?.name || 'عميل غير محدد'
                          })}
                          title="عرض المراسلات والمتابعة"
                          className={neutralActionButtonClass}
                        >
                          <MessageSquare size={18} />
                        </button>

                        {/* Submit for Review - NEW special button */}
                        {task.status === 'New' && (
                          <button
                            type="button"
                            onClick={() => handleSubmitForReview(task)}
                            title="إرسال للمراجعة والموافقة"
                            className={neutralActionButtonClass}
                          >
                            <Upload size={18} />
                          </button>
                        )}

                        {/* Approve Task - for pending review tasks */}
                        {task.status === 'Pending Review' && (
                          <button
                            type="button"
                            onClick={() => handleApproveTask(task)}
                            title="الموافقة على المهمة"
                            className={neutralActionButtonClass}
                          >
                            <ClipboardCheck size={18} />
                          </button>
                        )}

                        {/* Defer/Resume */}
                        {task.status !== 'Deferred' && task.status !== 'Completed' ? (
                          <button
                            type="button"
                            onClick={() => handleDefer(task)}
                            title="تأجيل المهمة"
                            className={neutralActionButtonClass}
                          >
                            <Pause size={18} />
                          </button>
                        ) : task.status === 'Deferred' ? (
                          <button
                            type="button"
                            onClick={() => handleResume(task)}
                            title="استئناف المهمة"
                            className={neutralActionButtonClass}
                          >
                            <Play size={18} />
                          </button>
                        ) : null}

                        {/* Restore Completed Task */}
                        {task.status === 'Completed' && (
                          <button
                            type="button"
                            onClick={() => handleRestore(task)}
                            title="استعادة المهمة"
                            className={neutralActionButtonClass}
                          >
                            <RotateCcw size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
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
          <span className="text-sm text-text-secondary">
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

