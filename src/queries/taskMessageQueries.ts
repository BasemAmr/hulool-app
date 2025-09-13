import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import apiClient from '../api/apiClient';
import type { ApiResponse } from '../api/types';

// Types for task messages
export interface TaskMessage {
  id: number;
  task_id: number;
  employee_id: number;
  employee_name: string;
  employee_email: string;
  message_content: string;
  message_type: 'comment';
  created_at: string;
  created_at_formatted: string;
  is_system_message: boolean;
  task_name?: string;
  client_name?: string;
}

export interface TaskMessagePaginatedData {
  messages: TaskMessage[];
  pagination: {
    current_page: number;
    per_page: number;
    total_messages: number;
    total_pages: number;
    has_next_page: boolean;
    has_prev_page: boolean;
  };
  task_info: {
    id: number;
    task_name: string;
    client_name: string;
  };
}

export interface CreateTaskMessagePayload {
  message_content: string;
}

export interface TaskMessageStats {
  total_messages: number;
  comment_count: number;
  system_log_count: number;
  client_update_count: number;
  last_message_at: string | null;
}

// --- API Functions ---

const fetchTaskMessages = async ({ 
  pageParam = 1, 
  queryKey 
}: { 
  pageParam?: number; 
  queryKey: any 
}): Promise<TaskMessagePaginatedData> => {
  const [_key, taskId, per_page = 20] = queryKey;
  const { data } = await apiClient.get<ApiResponse<TaskMessagePaginatedData>>(
    `/tasks/${taskId}/messages`,
    {
      params: { page: pageParam, per_page },
    }
  );
  return data.data;
};

const createTaskMessage = async ({
  taskId,
  payload,
}: {
  taskId: number;
  payload: CreateTaskMessagePayload;
}): Promise<TaskMessage> => {
  const { data } = await apiClient.post<ApiResponse<{ message: TaskMessage }>>(
    `/tasks/${taskId}/messages`,
    payload
  );
  return data.data.message;
};

const fetchTaskMessageStats = async (taskId: number): Promise<TaskMessageStats> => {
  const { data } = await apiClient.get<ApiResponse<TaskMessageStats>>(
    `/tasks/${taskId}/messages/stats`
  );
  return data.data;
};

const fetchRecentMessages = async (limit: number = 10): Promise<TaskMessage[]> => {
  const { data } = await apiClient.get<ApiResponse<{ messages: TaskMessage[] }>>(
    '/messages/recent',
    { params: { limit } }
  );
  return data.data.messages;
};

// --- React Query Hooks ---

/**
 * Hook to fetch task messages with infinite scroll pagination
 */
export const useTaskMessages = (taskId: number, per_page: number = 20) => {
  return useInfiniteQuery({
    queryKey: ['taskMessages', taskId, per_page],
    queryFn: fetchTaskMessages,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.has_next_page 
        ? lastPage.pagination.current_page + 1 
        : undefined;
    },
    getPreviousPageParam: (firstPage) => {
      return firstPage.pagination.has_prev_page 
        ? firstPage.pagination.current_page - 1 
        : undefined;
    },
    enabled: !!taskId && taskId > 0,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook to create a new task message
 */
export const useCreateTaskMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTaskMessage,
    onMutate: async ({ taskId, payload }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['taskMessages', taskId] });

      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData(['taskMessages', taskId]);

      // Optimistically update to the new value
      queryClient.setQueryData(['taskMessages', taskId], (old: any) => {
        if (!old) return old;

        const optimisticMessage: TaskMessage = {
          id: Date.now(), // Temporary ID
          task_id: taskId,
          employee_id: 0, // Will be filled by server
          employee_name: 'أنت', // Placeholder
          employee_email: '',
          message_content: payload.message_content,
          message_type: 'comment',
          created_at: new Date().toISOString(),
          created_at_formatted: 'الآن',
          is_system_message: false,
        };

        return {
          ...old,
          pages: old.pages.map((page: TaskMessagePaginatedData, index: number) => {
            if (index === 0) {
              // Add to first page (newest messages)
              return {
                ...page,
                messages: [optimisticMessage, ...page.messages],
                pagination: {
                  ...page.pagination,
                  total_messages: page.pagination.total_messages + 1,
                },
              };
            }
            return page;
          }),
        };
      });

      // Return a context object with the snapshotted value
      return { previousMessages, taskId };
    },
    onError: (_err, _variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context) {
        queryClient.setQueryData(['taskMessages', context.taskId], context.previousMessages);
      }
    },
    onSettled: (_data, _error, variables) => {
      // Always refetch after error or success to ensure server state
      queryClient.invalidateQueries({ queryKey: ['taskMessages', variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ['taskMessageStats', variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ['recentMessages'] });
      
      // Employee-related invalidations
      queryClient.invalidateQueries({ queryKey: ['employee'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
};

/**
 * Hook to fetch task message statistics
 */
export const useTaskMessageStats = (taskId: number) => {
  return useQuery({
    queryKey: ['taskMessageStats', taskId],
    queryFn: () => fetchTaskMessageStats(taskId),
    enabled: !!taskId && taskId > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Hook to fetch recent messages across all tasks (for dashboard)
 */
export const useRecentMessages = (limit: number = 10) => {
  return useQuery({
    queryKey: ['recentMessages', limit],
    queryFn: () => fetchRecentMessages(limit),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5, // Auto-refresh every 5 minutes
  });
};

// --- Utility functions ---

/**
 * Invalidate task message queries for a specific task
 */
export const invalidateTaskMessages = (queryClient: any, taskId: number) => {
  queryClient.invalidateQueries({ queryKey: ['taskMessages', taskId] });
  queryClient.invalidateQueries({ queryKey: ['taskMessageStats', taskId] });
  queryClient.invalidateQueries({ queryKey: ['recentMessages'] });
};

/**
 * Prefetch task messages for a task
 */
export const prefetchTaskMessages = async (queryClient: any, taskId: number) => {
  await queryClient.prefetchInfiniteQuery({
    queryKey: ['taskMessages', taskId, 20],
    queryFn: fetchTaskMessages,
    pages: 1,
  });
};
