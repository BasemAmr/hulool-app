import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/apiClient';
import type { ApiResponse, Task, TaskPayload, TaskPaginatedData, UpdateTaskPayload, UpdateRequirementsPayload,CompleteTaskPayload  } from '../api/types';

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

// --- React Query Hooks ---
export const useGetTasks = (filters: TaskFilters) => {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => fetchTasks(filters),
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new
  });
};

export const useGetTask = (taskId: number) => {
    return useQuery({
        queryKey: ['task', taskId],
        queryFn: () => fetchTaskById(taskId),
        enabled: !!taskId, // Only fetch if taskId is provided
    });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] }); // Invalidate all tasks
      queryClient.invalidateQueries({ queryKey: ['clients'] }); // Invalidate clients to update task counts
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateTask,
    onSuccess: (updatedTask) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] }); // Invalidate all tasks
      queryClient.invalidateQueries({ queryKey: ['task', updatedTask.id] }); // Invalidate specific task
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] }); // Invalidate clients to update task counts
    },
  });
};

export const useUpdateRequirements = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateRequirements,
        onSuccess: (updatedTask) => {
            queryClient.invalidateQueries({ queryKey: ['task', updatedTask.id] }); // Invalidate specific task
            queryClient.invalidateQueries({ queryKey: ['tasks'] }); // Invalidate all tasks to reflect changes
        },
    });
};

export const useCreateRequirements = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createRequirements,
        onSuccess: (updatedTask) => {
            queryClient.invalidateQueries({ queryKey: ['task', updatedTask.id] }); // Invalidate specific task
            queryClient.invalidateQueries({ queryKey: ['tasks'] }); // Invalidate all tasks to reflect changes
        },
    });
};



// Update Task Completed Workflow

// --- API Function ---
import type { CompleteTaskResponse } from '../api/types';
const completeTask = async ({ id, payload }: { id: number; payload: CompleteTaskPayload }): Promise<CompleteTaskResponse> => {
    const { data } = await apiClient.post<ApiResponse<CompleteTaskResponse>>(`/tasks/${id}/complete`, payload);
    if (!data.success) throw new Error(data.message || 'Failed to complete task');
    return data.data;
};

// --- Defer Task by updating overalll task data , updating status along, not a specifc api endpoint ---
const deferTask = async ({ id }: { id: number }): Promise<Task> => {
  const { data } = await apiClient.put<ApiResponse<Task>>(`/tasks/${id}/status`, { status: 'Deferred' });
  if (!data.success) throw new Error(data.message || 'Failed to defer task');
  return data.data;
};

export const useDeferTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deferTask,
    onSuccess: (updatedTask) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', updatedTask.id] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
};

// --- Resume Task by updating status to New ---
const resumeTask = async ({ id }: { id: number }): Promise<Task> => {
  const { data } = await apiClient.put<ApiResponse<Task>>(`/tasks/${id}/status`, { status: 'New' });
  if (!data.success) throw new Error(data.message || 'Failed to resume task');
  return data.data;
};

export const useResumeTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resumeTask,
    onSuccess: (updatedTask) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', updatedTask.id] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
};


// --- React Query Hook ---
export const useCompleteTask = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: completeTask,
        onSuccess: (result) => {
            // Invalidate everything that could be affected by task completion
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['task', result.id] });
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            queryClient.invalidateQueries({ queryKey: ['receivables'] });
        },
    });
};