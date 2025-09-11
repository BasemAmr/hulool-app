import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import apiClient from '../api/apiClient';
import type { ApiResponse, Client } from '../api/types';

// Interface for employee clients pagination response
export interface EmployeeClientsResponse {
  clients: Client[];
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
export interface EmployeeClientsParams {
  page?: number;
  per_page?: number;
  search?: string;
}

/**
 * Fetch employee's accessible clients with pagination
 * Uses the /clients/employee/all endpoint
 */
export const useGetEmployeeClients = (params: EmployeeClientsParams = {}) => {
  const { page = 1, per_page = 20, search } = params;
  
  return useQuery({
    queryKey: ['employee', 'clients', { page, per_page, search }],
    queryFn: async (): Promise<EmployeeClientsResponse> => {
      const queryParams = new URLSearchParams();
      queryParams.append('page', page.toString());
      queryParams.append('per_page', per_page.toString());
      
      if (search) queryParams.append('search', search);

      const response = await apiClient.get<ApiResponse<EmployeeClientsResponse>>(
        `/clients/employee/all?${queryParams.toString()}`
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch employee clients');
      }
      
      return response.data.data;
    },
    staleTime: 2 * 60 * 1000, // Keep fresh for 2 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refetch every 5 minutes
  });
};

/**
 * Fetch employee's accessible clients with infinite scroll
 */
export const useGetEmployeeClientsInfinite = (filters: Omit<EmployeeClientsParams, 'page'> = {}) => {
  const { per_page = 20, search } = filters;
  
  return useInfiniteQuery({
    queryKey: ['employee', 'clients', 'infinite', { per_page, search }],
    queryFn: async ({ pageParam }: { pageParam: number }): Promise<EmployeeClientsResponse> => {
      const queryParams = new URLSearchParams();
      queryParams.append('page', pageParam.toString());
      queryParams.append('per_page', per_page.toString());
      
      if (search) queryParams.append('search', search);

      const response = await apiClient.get<ApiResponse<EmployeeClientsResponse>>(
        `/clients/employee/all?${queryParams.toString()}`
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch employee clients');
      }
      
      return response.data.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: EmployeeClientsResponse) => {
      const { current_page, total_pages } = lastPage.pagination;
      return current_page < total_pages ? current_page + 1 : undefined;
    },
    staleTime: 2 * 60 * 1000, // Keep fresh for 2 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refetch every 5 minutes
  });
};
