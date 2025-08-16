import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useGetTasks, useDeleteTask } from '../queries/taskQueries';
import { useModalStore } from '../stores/modalStore';
import { applyPageBackground } from '../utils/backgroundUtils';
import type { Task } from '../api/types';
import AllTasksTable from '../components/tasks/AllTasksTable';
import TaskFilter from '../components/tasks/TaskFilter';
import TotalsCards from '../components/tasks/TotalsCards';
import Button from '../components/ui/Button';
import { PlusCircle } from 'lucide-react';


const AllTasksPage = () => {
  const { t } = useTranslation();
  const openModal = useModalStore((state) => state.openModal);
  const deleteTaskMutation = useDeleteTask();
  const [searchParams, setSearchParams] = useSearchParams();

  // Get filters from URL parameters
  const [page] = useState(1);
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

  // Fetch tasks with current filters (excluding search)
  const { data, isLoading } = useGetTasks({
    page,
    status: status || undefined,
    type: type || undefined
  });

  // Client-side filtering for search
  const filteredTasks = useMemo(() => {
    if (!data?.tasks) return [];
    if (!search.trim()) return data.tasks;

    const searchLower = search.toLowerCase().trim();
    return data.tasks.filter(task =>
      task.task_name?.toLowerCase().includes(searchLower) ||
      task.client.name.toLowerCase().includes(searchLower) ||
      task.client.phone.includes(searchLower) ||
      task.notes?.toLowerCase().includes(searchLower) ||
      task.type.toLowerCase().includes(searchLower)
    );
  }, [data?.tasks, search]);

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
      message: t('tasks.deleteConfirmMessage', { 
        taskName: task.task_name || t(`type.${task.type}`) 
      }),
      onConfirm: () => {
        deleteTaskMutation.mutate(task.id);
      },
    });
  };

  const handleShowRequirements = (task: Task) => {
    openModal('requirements', { task });
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

  return (
    <div>
      <header className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center gap-4 flex-grow-1">
          <h1 style={{
            background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontWeight: 'bold',
            minWidth: 'fit-content',
          }}>{pageTitle}</h1>
          
          {/* Totals Cards positioned between title and button */}
          <div className="flex-grow-1 mx-4 ">
            <TotalsCards tasks={filteredTasks} isLoading={isLoading} />
          </div>
        </div>
        
        <Button onClick={handleAddTask} style={{ minWidth: 'fit-content' }}>
          <PlusCircle size={18} className="ms-2" />
          {t('tasks.addNew')}
        </Button>
      </header>

      <div className="card">
        <div className="card-header bg-white">
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
            isLoading={isLoading}
            onEdit={handleEditTask}
            onComplete={handleCompleteTask}
            onViewAmountDetails={handleViewAmountDetails}
            onDelete={handleDeleteTask}
            onShowRequirements={handleShowRequirements}
          />
          {/* Pagination component will go here (use data.pagination) */}
        </div>
      </div>
    </div>
  );
};

export default AllTasksPage;