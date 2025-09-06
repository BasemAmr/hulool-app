import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import apiClient from '../api/apiClient';
import type { 
  ApiResponse, 
  Task, 
  TaskPayload, 
  TaskPaginatedData, 
  UpdateTaskPayload, 
  UpdateRequirementsPayload, 
  CompleteTaskPayload, 
  CompleteTaskResponse,
  ConflictResponse,
  PrepaidConflictData,
  TaskAmountConflictData,
  PrepaidResolutionDecisions,
  MainReceivableDecisions,
  TaskCancellationDecisions,
  ResolutionSummary,
  ConcurrentModificationData
} from '../api/types';

export interface TaskFilters {
  page?: number;
  status?: string;
  type?: string;
  search?: string;
  client_id?: number;
}

// --- API Functions (Private to this file) ---
const TASKS_PER_PAGE = 20; // Define a constant for page size

const fetchTasks = async (filters: TaskFilters): Promise<TaskPaginatedData> => {
  const { data } = await apiClient.get<ApiResponse<TaskPaginatedData>>('/tasks', {
    params: { ...filters, page: 1, per_page: 1000 },
  });
  return data.data;
};

// New paginated fetch function for infinite queries
export const fetchPaginatedTasks = async ({ pageParam = 1, queryKey }: { pageParam?: number; queryKey: any }): Promise<TaskPaginatedData> => {
  const [_key, filters] = queryKey;
  const { data } = await apiClient.get<ApiResponse<TaskPaginatedData>>('/tasks', {
    params: { ...filters, page: pageParam, per_page: TASKS_PER_PAGE },
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
  decisions: PrepaidResolutionDecisions 
}): Promise<ResolutionSummary> => {
  const { data } = await apiClient.post<ApiResponse<ResolutionSummary>>(`/tasks/${id}/resolve-prepaid-change`, {
    new_prepaid_amount,
    decisions
  });
  if (!data.success) throw new Error(data.message || 'Failed to resolve prepaid change');
  return data.data;
};

// NEW API FUNCTIONS FOR CONFLICT RESOLUTION

// API function to resolve task amount change conflicts
const resolveTaskAmountChange = async ({ 
  id, 
  new_task_amount, 
  main_receivable_decisions 
}: { 
  id: number; 
  new_task_amount: number; 
  main_receivable_decisions: MainReceivableDecisions 
}): Promise<ResolutionSummary> => {
  const { data } = await apiClient.post<ApiResponse<ResolutionSummary>>(`/tasks/${id}/resolve-amount-change`, {
    new_task_amount,
    main_receivable_decisions
  });
  if (!data.success) throw new Error(data.message || 'Failed to resolve amount change');
  return data.data;
};

// API function to cancel task with conflict resolution
const cancelTask = async ({ 
  id, 
  decisions 
}: { 
  id: number; 
  decisions?: TaskCancellationDecisions 
}): Promise<ResolutionSummary> => {
  const payload = decisions || {};
  const { data } = await apiClient.post<ApiResponse<ResolutionSummary>>(`/tasks/${id}/cancel`, payload);
  if (!data.success) throw new Error(data.message || 'Failed to cancel task');
  return data.data;
};

// Enhanced updateTask function that handles conflicts
const updateTaskWithConflictHandling = async ({ 
  id, 
  taskData 
}: { 
  id: number; 
  taskData: UpdateTaskPayload 
}): Promise<Task | ConflictResponse<PrepaidConflictData | TaskAmountConflictData | ConcurrentModificationData>> => {
  try {
    const { data } = await apiClient.put<ApiResponse<Task>>(`/tasks/${id}`, taskData);
    if (!data.success) {
      throw new Error(data.message || 'Failed to update task.');
    }
    return data.data;
  } catch (error: any) {
    // Handle 409 Conflict responses
    if (error.response?.status === 409) {
      return error.response.data as ConflictResponse<PrepaidConflictData | TaskAmountConflictData | ConcurrentModificationData>;
    }
    throw error;
  }
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

// New infinite query hook for paginated tasks
export const useGetTasksInfinite = (filters: Omit<TaskFilters, 'page'>) => {
  return useInfiniteQuery({
    queryKey: ['tasks', filters],
    queryFn: fetchPaginatedTasks,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      // If the current page is less than the total pages, return the next page number
      if (lastPage.pagination.current_page < lastPage.pagination.total_pages) {
        return lastPage.pagination.current_page + 1;
      }
      // Otherwise, return undefined to signify there are no more pages
      return undefined;
    },
    placeholderData: (previousData) => previousData,
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
    // --- START: OPTIMISTIC UPDATE LOGIC ---
    onMutate: async (id) => {
      // 1. Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      await queryClient.cancelQueries({ queryKey: ['dashboard', 'clientsWithActiveTasks'] });

      // 2. Snapshot the previous state of both queries
      const previousTasksData: any = queryClient.getQueryData(['tasks']);
      const previousDashboardData: any = queryClient.getQueryData(['dashboard', 'clientsWithActiveTasks']);

      // 3. Optimistically remove the task from the list
      if (previousTasksData) {
        // Handle infinite query data structure
        if (previousTasksData.pages) {
          queryClient.setQueryData(['tasks'], (oldData: any) => {
            return {
              ...oldData,
              pages: oldData.pages.map((page: any) => ({
                ...page,
                tasks: page.tasks.filter((task: Task) => task.id !== id),
                pagination: {
                  ...page.pagination,
                  total: page.pagination.total - 1
                }
              })),
            };
          });
        } else {
          // Handle regular query data structure
          queryClient.setQueryData(['tasks'], (oldData: any) => {
            return {
              ...oldData,
              tasks: oldData.tasks.filter((task: Task) => task.id !== id),
              pagination: {
                ...oldData.pagination,
                total: oldData.pagination.total - 1
              }
            };
          });
        }
      }
      
      // Update the dashboard view by removing the task
      if (previousDashboardData) {
        queryClient.setQueryData(['dashboard', 'clientsWithActiveTasks'], (oldData: any) => {
          const newData = { ...oldData };

          // Iterate over each task type group
          for (const type in newData) {
            if (newData.hasOwnProperty(type)) {
              // Remove the task from any client group
              newData[type] = newData[type].map((clientGroup: any) => {
                return {
                  ...clientGroup,
                  tasks: clientGroup.tasks.filter((t: Task) => t.id !== id)
                };
              }).filter((clientGroup: any) => clientGroup.tasks.length > 0); // Remove empty client groups
            }
          }
          return newData;
        });
      }

      // 4. Return a context object with the snapshotted values
      return { previousTasksData, previousDashboardData };
    },
    // --- END: OPTIMISTIC UPDATE LOGIC ---
    
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (_err, _variables, context) => {
      if (context?.previousTasksData) {
        queryClient.setQueryData(['tasks'], context.previousTasksData);
      }
      if (context?.previousDashboardData) {
        queryClient.setQueryData(['dashboard', 'clientsWithActiveTasks'], context.previousDashboardData);
      }
      // Note: We'll handle toast notifications in the UI components
    },
    // Always refetch after error or success to ensure data consistency
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-by-tags'] });
      queryClient.invalidateQueries({ queryKey: ['receivables'] });
    },
    onSuccess: () => {
      // The UI has already updated optimistically
      // Just ensure we invalidate related data
    }
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
    // --- START: OPTIMISTIC UPDATE LOGIC ---
    onMutate: async ({ id }) => {
      // 1. Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      await queryClient.cancelQueries({ queryKey: ['dashboard', 'clientsWithActiveTasks'] });

      // 2. Snapshot the previous state of both queries
      const previousTasksData: any = queryClient.getQueryData(['tasks']);
      const previousDashboardData: any = queryClient.getQueryData(['dashboard', 'clientsWithActiveTasks']);

      // 3. Optimistically update to the new value
      // Update the main tasks list (both regular and infinite queries)
      if (previousTasksData) {
        // Handle infinite query data structure
        if (previousTasksData.pages) {
          queryClient.setQueryData(['tasks'], (oldData: any) => {
            return {
              ...oldData,
              pages: oldData.pages.map((page: any) => ({
                ...page,
                tasks: page.tasks.map((task: Task) =>
                  task.id === id ? { ...task, status: 'New' } : task
                ),
              })),
            };
          });
        } else {
          // Handle regular query data structure
          queryClient.setQueryData(['tasks'], (oldData: any) => {
            return {
              ...oldData,
              tasks: oldData.tasks.map((task: Task) =>
                task.id === id ? { ...task, status: 'New' } : task
              ),
            };
          });
        }
      }
      
      // Update the dashboard view
      if (previousDashboardData) {
        queryClient.setQueryData(['dashboard', 'clientsWithActiveTasks'], (oldData: any) => {
          const newData = { ...oldData };

          // Iterate over each task type group
          for (const type in newData) {
            if (newData.hasOwnProperty(type)) {
              // Find the client containing the task
              newData[type] = newData[type].map((clientGroup: any) => {
                // Check if this client has the task
                const taskIndex = clientGroup.tasks.findIndex((t: Task) => t.id === id);
                if (taskIndex > -1) {
                  // Create a new array of tasks with the updated status
                  const updatedTasks = clientGroup.tasks.map((t: Task, index: number) =>
                    index === taskIndex ? { ...t, status: 'New' } : t
                  );
                  // Return the modified client group
                  return { ...clientGroup, tasks: updatedTasks };
                }
                return clientGroup;
              });
            }
          }
          return newData;
        });
      }

      // 4. Return a context object with the snapshotted values
      return { previousTasksData, previousDashboardData };
    },
    // --- END: OPTIMISTIC UPDATE LOGIC ---
    
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (_err, _variables, context) => {
      if (context?.previousTasksData) {
        queryClient.setQueryData(['tasks'], context.previousTasksData);
      }
      if (context?.previousDashboardData) {
        queryClient.setQueryData(['dashboard', 'clientsWithActiveTasks'], context.previousDashboardData);
      }
      // Note: We'll handle toast notifications in the UI components
    },
    // Always refetch after error or success to ensure data consistency
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'clientsWithActiveTasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-by-tags'] });
    },
    onSuccess: (updatedTask: Task) => {
      // The UI has already updated optimistically
      queryClient.invalidateQueries({ queryKey: ['task', updatedTask.id] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    }
  });
};

export const useResolvePrepaidChange = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resolvePrepaidChange,
    onSuccess: (result: ResolutionSummary) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      if (result.task?.id) {
        queryClient.invalidateQueries({ queryKey: ['task', result.task.id] });
        queryClient.invalidateQueries({ queryKey: ['receivables', 'client', result.task.client_id] });
      }
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['receivables'] });
      queryClient.invalidateQueries({ queryKey: ['client-credits'] });
    },
  });
};

// NEW REACT QUERY HOOKS FOR CONFLICT RESOLUTION

export const useUpdateTaskWithConflicts = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateTaskWithConflictHandling,
    onSuccess: (result) => {
      // Only invalidate if it's a successful update (not a conflict response)
      if ('id' in result) {
        const updatedTask = result as Task;
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        queryClient.invalidateQueries({ queryKey: ['task', updatedTask.id] });
        queryClient.invalidateQueries({ queryKey: ['clients'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['receivables', 'client', updatedTask.client_id] });
      }
      // If it's a conflict response, we don't invalidate queries yet
    },
  });
};

export const useResolveTaskAmountChange = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resolveTaskAmountChange,
    onSuccess: (result: ResolutionSummary) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      if (result.task?.id) {
        queryClient.invalidateQueries({ queryKey: ['task', result.task.id] });
        queryClient.invalidateQueries({ queryKey: ['receivables', 'client', result.task.client_id] });
      }
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['receivables'] });
      queryClient.invalidateQueries({ queryKey: ['client-credits'] });
    },
  });
};

export const useCancelTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelTask,
    onSuccess: (result: ResolutionSummary) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      if (result.task?.id) {
        queryClient.invalidateQueries({ queryKey: ['task', result.task.id] });
        queryClient.invalidateQueries({ queryKey: ['receivables', 'client', result.task.client_id] });
      }
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['receivables'] });
      queryClient.invalidateQueries({ queryKey: ['client-credits'] });
    },
  });
};

export const useDeferTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deferTask,
    // --- START: OPTIMISTIC UPDATE LOGIC ---
    onMutate: async ({ id }) => {
      // 1. Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      await queryClient.cancelQueries({ queryKey: ['dashboard', 'clientsWithActiveTasks'] });

      // 2. Snapshot the previous state of both queries
      const previousTasksData: any = queryClient.getQueryData(['tasks']);
      const previousDashboardData: any = queryClient.getQueryData(['dashboard', 'clientsWithActiveTasks']);

      // 3. Optimistically update to the new value
      // Update the main tasks list (both regular and infinite queries)
      if (previousTasksData) {
        // Handle infinite query data structure
        if (previousTasksData.pages) {
          queryClient.setQueryData(['tasks'], (oldData: any) => {
            return {
              ...oldData,
              pages: oldData.pages.map((page: any) => ({
                ...page,
                tasks: page.tasks.map((task: Task) =>
                  task.id === id ? { ...task, status: 'Deferred' } : task
                ),
              })),
            };
          });
        } else {
          // Handle regular query data structure
          queryClient.setQueryData(['tasks'], (oldData: any) => {
            return {
              ...oldData,
              tasks: oldData.tasks.map((task: Task) =>
                task.id === id ? { ...task, status: 'Deferred' } : task
              ),
            };
          });
        }
      }
      
      // Update the dashboard view
      if (previousDashboardData) {
        queryClient.setQueryData(['dashboard', 'clientsWithActiveTasks'], (oldData: any) => {
          const newData = { ...oldData };

          // Iterate over each task type group
          for (const type in newData) {
            if (newData.hasOwnProperty(type)) {
              // Find the client containing the task
              newData[type] = newData[type].map((clientGroup: any) => {
                // Check if this client has the task
                const taskIndex = clientGroup.tasks.findIndex((t: Task) => t.id === id);
                if (taskIndex > -1) {
                  // Create a new array of tasks with the updated status
                  const updatedTasks = clientGroup.tasks.map((t: Task, index: number) =>
                    index === taskIndex ? { ...t, status: 'Deferred' } : t
                  );
                  // Return the modified client group
                  return { ...clientGroup, tasks: updatedTasks };
                }
                return clientGroup;
              });
            }
          }
          return newData;
        });
      }

      // 4. Return a context object with the snapshotted values
      return { previousTasksData, previousDashboardData };
    },
    // --- END: OPTIMISTIC UPDATE LOGIC ---
    
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (_err, _variables, context) => {
      if (context?.previousTasksData) {
        queryClient.setQueryData(['tasks'], context.previousTasksData);
      }
      if (context?.previousDashboardData) {
        queryClient.setQueryData(['dashboard', 'clientsWithActiveTasks'], context.previousDashboardData);
      }
      // Note: We'll handle toast notifications in the UI components
    },
    // Always refetch after error or success to ensure data consistency
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'clientsWithActiveTasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
    },
    onSuccess: (updatedTask: Task) => {
      // The UI has already updated optimistically
      queryClient.invalidateQueries({ queryKey: ['task', updatedTask.id] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['receivables'] });
      queryClient.invalidateQueries({ queryKey: ['receivables', 'client', updatedTask.client.id] });
    }
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