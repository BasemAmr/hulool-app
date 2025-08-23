import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/apiClient';
import type { ApiResponse, Task, TaskPayload, TaskPaginatedData, UpdateTaskPayload, UpdateRequirementsPayload, CompleteTaskPayload, CompleteTaskResponse } from '../api/types'; // Import CompleteTaskResponse

export interface TaskFilters {
  page?: number;
  status?: string;
  type?: string;
  search?: string;
  client_id?: number;
}

// --- API Functions (Private to this file) ---
const fetchTasks = async (filters: TaskFilters): Promise<TaskPaginatedData> => {
  const { data } = await apiClient.get<ApiResponse<TaskPaginatedData>>('/tasks', {
    params: { ...filters, page: 1, per_page: 1000 },
  });
  return data.data;
};

const fetchTaskById = async (taskId: number): Promise<Task> => {
    const { data } = await apiClient.get<ApiResponse<Task>>(`/tasks/${taskId}`);
    if (!data.success) {
        throw new Error(data.message || 'Failed to fetch task.');
    }
    return data.data;
};

const createTask = async (taskData: TaskPayload): Promise<Task> => {
  const { data } = await apiClient.post<ApiResponse<Task>>('/tasks', taskData);
  if (!data.success) {
      throw new Error(data.message || 'Failed to create task.');
  }
  return data.data;
};

const updateTask = async ({ id, taskData }: { id: number; taskData: UpdateTaskPayload }): Promise<Task> => {
  const { data } = await apiClient.put<ApiResponse<Task>>(`/tasks/${id}`, taskData);
  if (!data.success) {
      throw new Error(data.message || 'Failed to update task.');
  }
  return data.data;
};

const deleteTask = async (id: number): Promise<void> => {
  const { data } = await apiClient.delete<ApiResponse<null>>(`/tasks/${id}`);
  if (!data.success) {
      throw new Error(data.message || 'Failed to delete task.');
  }
};

const updateRequirements = async (payload: UpdateRequirementsPayload): Promise<Task> => {
    const { data } = await apiClient.put<ApiResponse<Task>>(`/tasks/${payload.task_id}/requirements`, { requirements: payload.requirements });
    if (!data.success) {
        throw new Error(data.message || 'Failed to update requirements.');
    }
    return data.data;
};

const createRequirements = async (payload: UpdateRequirementsPayload): Promise<Task> => {
    const { data } = await apiClient.post<ApiResponse<Task>>(`/tasks/${payload.task_id}/requirements`, { requirements: payload.requirements });
    if (!data.success) {
        throw new Error(data.message || 'Failed to create requirements.');
    }
    return data.data;
};

// --- Update Task Completed Workflow API Functions ---
// Moved these declarations up so they are defined before being used in useMutation hooks

// API function to complete a task
const completeTask = async ({ id, payload }: { id: number; payload: CompleteTaskPayload }): Promise<CompleteTaskResponse> => {
    const { data } = await apiClient.post<ApiResponse<CompleteTaskResponse>>(`/tasks/${id}/complete`, payload);
    if (!data.success) throw new Error(data.message || 'Failed to complete task');
    return data.data;
};

// API function to defer a task
const deferTask = async ({ id }: { id: number }): Promise<Task> => {
  const { data } = await apiClient.put<ApiResponse<Task>>(`/tasks/${id}/status`, { status: 'Deferred' });
  if (!data.success) throw new Error(data.message || 'Failed to defer task');
  return data.data;
};

// API function to resume a task
const resumeTask = async ({ id }: { id: number }): Promise<Task> => {
  const { data } = await apiClient.put<ApiResponse<Task>>(`/tasks/${id}/status`, { status: 'New' });
  if (!data.success) throw new Error(data.message || 'Failed to resume task');
  return data.data;
};

// API function to resolve prepaid change conflicts
const resolvePrepaidChange = async ({ id, new_prepaid_amount, decisions }: { 
  id: number; 
  new_prepaid_amount: number; 
  decisions: any 
}): Promise<Task> => {
  const { data } = await apiClient.post<ApiResponse<Task>>(`/tasks/${id}/resolve-prepaid-change`, {
    new_prepaid_amount,
    decisions
  });
  if (!data.success) throw new Error(data.message || 'Failed to resolve prepaid change');
  return data.data;
};


// --- React Query Hooks ---
export const useGetTasks = (filters: TaskFilters) => {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => fetchTasks(filters),
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new
    staleTime: 30 * 1000, // Keep data fresh for 30 seconds
  });
};

export const useGetTask = (taskId: number) => {
    return useQuery({
        queryKey: ['task', taskId],
        queryFn: () => fetchTaskById(taskId),
        enabled: !!taskId, // Only fetch if taskId is provided
        staleTime: 30 * 1000, // Keep data fresh for 30 seconds
    });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTask,
    onSuccess: (createdTask: Task) => { // Type 'createdTask'
      queryClient.invalidateQueries({ queryKey: ['tasks'] }); // Invalidate all tasks
      queryClient.invalidateQueries({ queryKey: ['clients'] }); // Invalidate clients to update task counts
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }); // Invalidate dashboard stats
      queryClient.invalidateQueries({ queryKey: ['tasks-by-tags'] }); // Invalidate tags columns view
      // Specific client tasks in case task was added from client profile
      queryClient.invalidateQueries({ queryKey: ['client', createdTask.client.id] }); // Correct client_id access
      queryClient.invalidateQueries({ queryKey: ['receivables', 'client', createdTask.client.id] }); // Invalidate receivables of the client
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateTask,
    onSuccess: (updatedTask: Task) => { // Type 'updatedTask'
      queryClient.invalidateQueries({ queryKey: ['tasks'] }); // Invalidate all tasks
      queryClient.invalidateQueries({ queryKey: ['task', updatedTask.id] }); // Invalidate specific task
      queryClient.invalidateQueries({ queryKey: ['clients'] }); // Invalidate clients to update task counts
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }); // Invalidate dashboard stats
      queryClient.invalidateQueries({ queryKey: ['tasks-by-tags'] }); // Invalidate tags columns view
      // Invalidate receivables for the client if task is updated
      queryClient.invalidateQueries({ queryKey: ['receivables', 'client', updatedTask.client.id] });
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTask,
    onSuccess: () => { // No 'deletedTask' data, so just invalidate
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] }); // Invalidate clients to update task counts
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }); // Invalidate dashboard stats
      queryClient.invalidateQueries({ queryKey: ['tasks-by-tags'] }); // Invalidate tags columns view
      queryClient.invalidateQueries({ queryKey: ['receivables'] }); // Affects receivables if task had associated receivable
    },
  });
};

export const useUpdateRequirements = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateRequirements,
        onSuccess: (updatedTask: Task) => { // Type 'updatedTask'
            queryClient.invalidateQueries({ queryKey: ['task', updatedTask.id] }); // Invalidate specific task
            queryClient.invalidateQueries({ queryKey: ['tasks'] }); // Invalidate all tasks to reflect changes
            queryClient.invalidateQueries({ queryKey: ['dashboard'] }); // Could affect dashboard if requirements are used there
        },
    });
};

export const useCreateRequirements = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createRequirements,
        onSuccess: (updatedTask: Task) => { // Type 'updatedTask'
            queryClient.invalidateQueries({ queryKey: ['task', updatedTask.id] }); // Invalidate specific task
            queryClient.invalidateQueries({ queryKey: ['tasks'] }); // Invalidate all tasks to reflect changes
            queryClient.invalidateQueries({ queryKey: ['dashboard'] }); // Could affect dashboard
        },
    });
};

export const useResumeTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resumeTask,
    onSuccess: (updatedTask: Task) => { // Type 'updatedTask'
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', updatedTask.id] });
      queryClient.invalidateQueries({ queryKey: ['clients'] }); // Client task counts
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }); // Dashboard stats and recent tasks
      queryClient.invalidateQueries({ queryKey: ['tasks-by-tags'] }); // Invalidate tags columns view
    },
  });
};

export const useResolvePrepaidChange = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resolvePrepaidChange,
    onSuccess: (updatedTask: Task) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', updatedTask.id] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['receivables'] });
      queryClient.invalidateQueries({ queryKey: ['receivables', 'client', updatedTask.client.id] });
      queryClient.invalidateQueries({ queryKey: ['client-credits'] });
    },
  });
};

export const useDeferTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deferTask,
    onSuccess: (updatedTask: Task) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', updatedTask.id] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['receivables'] });
      queryClient.invalidateQueries({ queryKey: ['receivables', 'client', updatedTask.client.id] });
    },
  });
};


export const useCompleteTask = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: completeTask,
        onSuccess: (result: CompleteTaskResponse) => { // Type 'result'
            // Invalidate everything that could be affected by task completion
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['task', result.id] });
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            queryClient.invalidateQueries({ queryKey: ['receivables'] }); // General receivables summaries/lists
            queryClient.invalidateQueries({ queryKey: ['dashboard'] }); // Dashboard stats
            queryClient.invalidateQueries({ queryKey: ['tasks-by-tags'] }); // Invalidate tags columns view

            // Invalidate specific client statement and payable lists if relevant
            // This now correctly checks if result.task exists before accessing client_id
            if (result.task?.client_id) {
                 queryClient.invalidateQueries({ queryKey: ['receivables', 'client', result.task.client_id] });
                 queryClient.invalidateQueries({ queryKey: ['receivables', 'payable', result.task.client_id] });
            }
            // Invalidate filtered receivables if task completion affects them (e.g., if a new receivable is created that is overdue/paid)
            queryClient.invalidateQueries({ queryKey: ['receivables', 'filtered', 'paid'] });
            queryClient.invalidateQueries({ queryKey: ['receivables', 'filtered', 'overdue'] });
        },
    });
};