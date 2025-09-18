import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useGetTasksInfinite, useCancelTask } from '../queries/taskQueries';
import { useModalStore } from '../stores/modalStore';
import { useDrawerStore } from '../stores/drawerStore';
import { applyPageBackground } from '../utils/backgroundUtils';
import type { Task } from '../api/types';
import AllTasksTable from '../components/tasks/AllTasksTable';
import TaskFilter from '../components/tasks/TaskFilter';
import Button from '../components/ui/Button';
import { PlusCircle, FileSpreadsheet } from 'lucide-react';
// --- MODIFICATIONS START ---
import { useMutation } from '@tanstack/react-query';
import { exportService } from '../services/export/ExportService';
import { useToast } from '../hooks/useToast';
import { useInView } from 'react-intersection-observer';
// --- MODIFICATIONS END ---


const AllTasksPage = () => {
  const { t } = useTranslation();
  const openModal = useModalStore((state) => state.openModal);
  const { openDrawer } = useDrawerStore();
  const cancelTaskMutation = useCancelTask();
  const { success, error } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast(); // ADD

  // Get filters from URL parameters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [type, setType] = useState(() => searchParams.get('type') || '');

  // This effect syncs the state with the URL search params.
  // It runs when the component mounts and whenever the search params change.
  useEffect(() => {
    setSearch(searchParams.get('search') || '');
    setStatus(searchParams.get('status') || '');
    setType(searchParams.get('type') || '');
  }, [searchParams]);

  // This effect syncs the URL with the state.
  // It runs when the filters change.
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (type) params.set('type', type);

    // Only update if the params have actually changed
    if (params.toString() !== searchParams.toString()) {
      setSearchParams(params);
    }
    // We only want this to run when the user changes filters in the UI,
    // not when the URL changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, type, search]);

  // Apply tasks page background
  useEffect(() => {
    applyPageBackground('tasks');
  }, []);

  // Create page title based on filters
  const pageTitle = useMemo(() => {
    if (status && type) {
      return `${t('tasks.title')} - ${t(`status.${status}`)} - ${t(`type.${type}`)}`;
    } else if (status) {
      return `${t('tasks.title')} - ${t(`status.${status}`)}`;
    } else if (type) {
      return `${t('tasks.title')} - ${t(`type.${type}`)}`;
    }
    return t('tasks.title');
  }, [status, type, t]);

  // Fetch tasks with current filters (excluding search) using infinite query
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetTasksInfinite({
    status: status || undefined,
    type: type || undefined,
  });

  // Flatten the pages into a single array for rendering
  const allTasks = useMemo(() => data?.pages.flatMap(page => page.tasks) || [], [data]);

  // Handle notification links - open task follow-up panel when taskId is provided
  useEffect(() => {
    const taskId = searchParams.get('taskId');
    const highlightMessage = searchParams.get('highlightMessage');
    
    if (taskId) {
      const taskIdNum = parseInt(taskId, 10);
      if (!isNaN(taskIdNum)) {
        console.log('Notification link detected - Task ID:', taskIdNum, 'Highlight Message:', highlightMessage);
        console.log('Available tasks:', allTasks.length, 'Loading:', isLoading);
        
        // Open drawer immediately, even if task details aren't loaded yet
        // The TaskFollowUpPanel will handle loading its own data
        openDrawer('taskFollowUp', {
          taskId: taskIdNum,
          taskName: undefined, // Let the panel fetch this
          clientName: undefined, // Let the panel fetch this
          highlightMessage: highlightMessage ? parseInt(highlightMessage, 10) : undefined
        });
        
        // Clear the URL parameters after handling them
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('taskId');
        newParams.delete('highlightMessage');
        setSearchParams(newParams, { replace: true });
      }
    }
  }, [searchParams, openDrawer, setSearchParams]); // Removed allTasks dependency

  // --- NEW: Logic for infinite scroll ---
  const { ref } = useInView({
    threshold: 1, // Trigger when the element is fully in view
    onChange: (inView) => {
      if (inView && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
  });

  // --- NEW: Mutation for exporting tasks ---
  const exportTasksMutation = useMutation({
    mutationFn: exportService.exportAllTasks,
    onSuccess: () => {
      showToast({ type: 'success', title: 'تم تصدير الملف بنجاح' });
    },
    onError: (error: Error) => {
      showToast({ type: 'error', title: 'فشل التصدير', message: error.message });
    },
  });

  // Client-side filtering for search
  const filteredTasks = useMemo(() => {
    if (!allTasks.length) return [];
    if (!search.trim()) return allTasks;

    const searchLower = search.toLowerCase().trim();
    return allTasks.filter(task =>
      task.task_name?.toLowerCase().includes(searchLower) ||
      task.client.name.toLowerCase().includes(searchLower) ||
      task.client.phone.includes(searchLower) ||
      task.notes?.toLowerCase().includes(searchLower) ||
      task.type.toLowerCase().includes(searchLower)
    );
  }, [allTasks, search]);

  const handleAddTask = () => openModal('taskForm', {});
  const handleEditTask = (task: Task) => openModal('taskForm', { taskToEdit: task });

  const handleCompleteTask = (task: Task) => {
    openModal('taskCompletion', { task });
  };

  const handleViewAmountDetails = (task: Task) => {
    openModal('amountDetails', { task });
  };

  const handleDeleteTask = (task: Task) => {
    openModal('confirmDelete', {
      title: t('common.confirm'),
      message: t('tasks.cancelConfirmMessage', { 
        taskName: task.task_name || t(`type.${task.type}`) 
      }),
      onConfirm: () => {
        cancelTaskMutation.mutate({
          id: task.id,
          decisions: {
            task_action: 'cancel'
          }
        }, {
          onSuccess: () => {
            success(t('tasks.cancelSuccess'), t('tasks.cancelSuccessMessage'));
            // The useCancelTask hook automatically invalidates queries
          },
          onError: (err: any) => {
            error(t('common.error'), err.message || t('tasks.cancelError'));
          }
        });
      },
    });
  };

  const handleShowRequirements = (task: Task) => {
    openModal('requirements', { task });
  };

  const handleAssignTask = (task: Task) => {
    openModal('assignTask', { task });
  };

  // Filter handlers
  const handleSearchChange = (value: string) => setSearch(value);
  const handleStatusChange = (value: string) => setStatus(value);
  const handleTypeChange = (value: string) => setType(value);

  const handleClearFilters = () => {
    setSearch('');
    setStatus('');
    setType('');
  };

  // --- NEW: Export handler ---
  const handleExportToExcel = () => {
    if (filteredTasks.length > 0) {
      const tasksToExport = filteredTasks.map(task => ({
        ...task,
        client_name: task.client.name,
        client_phone: task.client.phone,
        service_name: task.task_name || t(`type.${task.type}`),
        task_type: task.type,
        // Use correct payment calculation based on receivable data
        amount_paid: task.receivable ? task.amount - task.receivable.amount : task.amount,
        amount_remaining: task.receivable?.amount || 0,
        is_overdue: task.receivable ? new Date(task.receivable.due_date || '') < new Date() && task.status !== 'Completed' : false,
      }));

      const summary = {
        total_tasks: tasksToExport.length,
        tasks_new: tasksToExport.filter(t => t.status === 'New').length,
        tasks_in_progress: tasksToExport.filter(t => t.status === 'Deferred').length, // Assuming Deferred is In Progress
        tasks_completed: tasksToExport.filter(t => t.status === 'Completed').length,
        tasks_cancelled: tasksToExport.filter(t => t.status === 'Cancelled').length,
        total_amount: tasksToExport.reduce((sum, t) => sum + t.amount, 0),
        total_paid: tasksToExport.reduce((sum, t) => sum + t.amount_paid, 0),
        total_remaining: tasksToExport.reduce((sum, t) => sum + t.amount_remaining, 0),
        overdue_tasks: tasksToExport.filter(t => t.is_overdue).length,
      };

      exportTasksMutation.mutate({ tasks: tasksToExport, summary });
    }
  };

  return (
    <div>
      <header className="d-flex justify-content-between align-items-center mb-1 py-1">
        <div className="d-flex align-items-center gap-2">
          <h5 className="mb-0" style={{
            background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontWeight: 'bold',
            minWidth: 'fit-content',
            fontSize: '1.1rem'
          }}>{pageTitle}</h5>
          
          <Button onClick={handleAddTask} size="sm" style={{ minWidth: 'fit-content' }}>
            <PlusCircle size={14} className="ms-1" />
            {t('tasks.addNew')}
          </Button>
        </div>
        
        {/* Export button */}
        <Button 
          variant="outline-primary" 
          size="sm"
          onClick={handleExportToExcel}
          isLoading={exportTasksMutation.isPending}
          title="تصدير إلى Excel"
        >
          <FileSpreadsheet size={14} className="me-1" />
          Excel
        </Button>
      </header>

      <div className="card">
        <div className="card-header bg-white py-2">
          <TaskFilter
            search={search}
            status={status}
            type={type}
            onSearchChange={handleSearchChange}
            onStatusChange={handleStatusChange}
            onTypeChange={handleTypeChange}
            onClearFilters={handleClearFilters}
          />
        </div>
        <div className="card-body p-0">
          <AllTasksTable
            tasks={filteredTasks}
            isLoading={isLoading && !data}
            onEdit={handleEditTask}
            onComplete={handleCompleteTask}
            onViewAmountDetails={handleViewAmountDetails}
            onDelete={handleDeleteTask}
            onShowRequirements={handleShowRequirements}
            onAssign={handleAssignTask}
          />
          
          {/* --- NEW: Load More Button & Intersection Observer --- */}
          <div ref={ref} className="text-center p-4">
            {hasNextPage && (
              <Button
                onClick={() => fetchNextPage()}
                isLoading={isFetchingNextPage}
                variant="outline-primary"
              >
                {isFetchingNextPage ? 'جاري التحميل...' : 'تحميل المزيد'}
              </Button>
            )}
            {!hasNextPage && !isLoading && allTasks.length > 0 && (
              <p className="text-muted mb-0">وصلت إلى نهاية القائمة</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllTasksPage;