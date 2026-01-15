import React from 'react';
import AllTasksTable from '../tasks/AllTasksTable';
import { useGetEmployeeTasks } from '../../queries/employeeQueries';
import { useModalStore } from '../../stores/modalStore';
import type { Task } from '../../api/types';

interface EmployeeTasksTableProps {
  employeeId: number;
  page: number;
  perPage: number;
  onPageChange: (page: number) => void;
}

const EmployeeTasksTable: React.FC<EmployeeTasksTableProps> = ({
  employeeId,
  page,
  perPage,
  onPageChange,
}) => {
  const { openModal } = useModalStore();

  // Fetch employee tasks (only New or Pending Review)
  const {
    data: tasksData,
    isLoading
  } = useGetEmployeeTasks(employeeId, {
    page,
    per_page: perPage,
    status: ['New', 'Pending Review']
  });

  const tasks = tasksData?.data?.tasks || [];
  const pagination = tasksData?.data?.pagination || {};

  // Handler functions for task actions
  const handleEditTask = (task: Task) => {
    openModal('taskForm', { taskToEdit: task });
  };

  const handleCompleteTask = (task: Task) => {
    openModal('taskCompletion', { task });
  };

  const handleViewAmountDetails = (task: Task) => {
    openModal('amountDetails', { task });
  };

  const handleDeleteTask = (task: Task) => {
    if (confirm(`Are you sure you want to delete the task "${task.task_name}"?`)) {
      // Handle task deletion - would need to implement this mutation
      console.log('Delete task:', task);
    }
  };

  const handleShowRequirements = (task: Task) => {
    openModal('requirements', { task });
  };

  const handleAssignTask = (task: Task) => {
    openModal('assignTask', { task });
  };

  if (isLoading) {
    return <div className="p-4 text-center">Loading tasks...</div>;
  }

  return (
    <div>

      {/* Use existing AllTasksTable component */}
      <AllTasksTable
        tasks={tasks}
        isLoading={isLoading}
        onEdit={handleEditTask}
        onComplete={handleCompleteTask}
        onViewAmountDetails={handleViewAmountDetails}
        onDelete={handleDeleteTask}
        // onShowRequirements={handleShowRequirements}
        onAssign={handleAssignTask}
      />

      {/* Pagination */}
      {pagination.total > perPage && (
        <div className="p-4 flex justify-between items-center border-t">
          <div className="text-black text-sm">
            Showing {((page - 1) * perPage) + 1} to {Math.min(page * perPage, pagination.total)} of {pagination.total} tasks
          </div>
          <div className="inline-flex gap-2">
            <button
              className="px-3 py-1.5 text-sm border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </button>
            <button
              className="px-3 py-1.5 text-sm border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={page >= Math.ceil(pagination.total / perPage)}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeTasksTable;
