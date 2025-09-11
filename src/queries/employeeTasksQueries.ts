import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import apiClient from '../api/apiClient';
import type { ApiResponse, Task } from '../api/types';

// Interface for employee tasks pagination response
export interface EmployeeTasksResponse {
  tasks: Task[];
  pagination: {
    total: number;
    per_page: number;
    current_page: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// Interface for query parameters
export interface EmployeeTasksParams {
  page?: number;
  per_page?: number;
  status?: string;
  search?: string;
}

/**
 * Fetch employee's own tasks
 * Uses the /tasks/employee/me endpoint
 */
export const useGetEmployeeOwnTasks = (params: EmployeeTasksParams = {}) => {
  const { page = 1, per_page = 20, status, search } = params;
  
  return useQuery({
    queryKey: ['employee', 'tasks', 'own', { page, per_page, status, search }],
    queryFn: async (): Promise<EmployeeTasksResponse> => {
      const queryParams = new URLSearchParams();
      queryParams.append('page', page.toString());
      queryParams.append('per_page', per_page.toString());
      
      if (status) queryParams.append('status', status);
      if (search) queryParams.append('search', search);

      const response = await apiClient.get<ApiResponse<EmployeeTasksResponse>>(
        `/tasks/employee/me?${queryParams.toString()}`
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch employee tasks');
      }
      
      return response.data.data;
    },
    staleTime: 2 * 60 * 1000, // Keep fresh for 2 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refetch every 5 minutes
  });
};

/**
 * Fetch employee's own tasks with infinite scroll
 */
export const useGetEmployeeOwnTasksInfinite = (filters: Omit<EmployeeTasksParams, 'page'> = {}) => {
  const { per_page = 20, status, search } = filters;
  
  return useInfiniteQuery({
    queryKey: ['employee', 'tasks', 'own', 'infinite', { per_page, status, search }],
    queryFn: async ({ pageParam }: { pageParam: number }): Promise<EmployeeTasksResponse> => {
      const queryParams = new URLSearchParams();
      queryParams.append('page', pageParam.toString());
      queryParams.append('per_page', per_page.toString());
      
      if (status) queryParams.append('status', status);
      if (search) queryParams.append('search', search);

      const response = await apiClient.get<ApiResponse<EmployeeTasksResponse>>(
        `/tasks/employee/me?${queryParams.toString()}`
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch employee tasks');
      }
      
      return response.data.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: EmployeeTasksResponse) => {
      const { current_page, total_pages } = lastPage.pagination;
      return current_page < total_pages ? current_page + 1 : undefined;
    },
    staleTime: 2 * 60 * 1000, // Keep fresh for 2 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refetch every 5 minutes
  });
};

/**
 * Submit task for review mutation
 */
export const useSubmitTaskForReview = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (taskId: number) => {
      const response = await apiClient.put<ApiResponse<Task>>(
        `/tasks/${taskId}/submit-for-review`
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to submit task for review');
      }
      
      return response.data.data;
    },
    onSuccess: () => {
      // Invalidate and refetch employee tasks
      queryClient.invalidateQueries({ queryKey: ['employee', 'tasks', 'own'] });
      queryClient.invalidateQueries({ queryKey: ['employee', 'dashboard'] });
    },
  });
};
