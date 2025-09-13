import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import apiClient from '../api/apiClient';

// Type definitions
export interface EmployeeTransaction {
  id: string;
  employee_user_id: string;
  transaction_name: string;
  direction: 'CREDIT' | 'DEBIT';
  amount: string;
  related_task_id: string | null;
  task_amount: string | null;
  notes: string;
  transaction_date: string;
  created_at: string;
  task_name: string | null;
  client_id: string | null;
  client_name: string | null;
}

export interface EmployeeTransactionsResponse {
  success: boolean;
  data: {
    pending_commissions: any[];
    transactions: EmployeeTransaction[];
  };
}

export interface EmployeeCredit {
  id: string;
  client_id: string;
  amount: string;
  received_at: string;
  allocation_method: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  client_name: string;
  client_phone: string;
  allocated_amount: string;
  remaining_amount: string;
  description?: string; // Add optional description field
}

export interface EmployeeCreditsResponse {
  success: boolean;
  data: {
    credits: EmployeeCredit[];
    pagination: {
      current_page: number;
      per_page: number;
      total_count: number;
      total_pages: number;
    };
  };
}

/**
 * Get current employee's transactions (for employee user)
 */
export const useGetMyTransactions = () => {
  return useQuery({
    queryKey: ['employee', 'transactions', 'me'],
    queryFn: async (): Promise<EmployeeTransactionsResponse> => {
      const response = await apiClient.get('/employees/me/transactions');
      return response.data;
    },
    staleTime: 30 * 1000, // Keep fresh for 30 seconds
    refetchInterval: 60 * 1000, // Auto-refetch every minute
  });
};

/**
 * Get current employee's credits with infinite scroll
 */
export const useGetMyCreditsInfinite = () => {
  return useInfiniteQuery({
    queryKey: ['employee', 'credits', 'me', 'infinite'],
    queryFn: async ({ pageParam = 1 }): Promise<EmployeeCreditsResponse> => {
      const response = await apiClient.get('/clients/employee/credits', {
        params: { page: pageParam, per_page: 20 }
      });
      return response.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { current_page, total_pages } = lastPage.data.pagination;
      return current_page < total_pages ? current_page + 1 : undefined;
    },
    staleTime: 2 * 60 * 1000, // Keep fresh for 2 minutes
  });
};

/**
 * Get clients receivables summary for current employee with infinite scroll
 */
export const useGetMyClientsReceivablesSummaryInfinite = () => {
  return useInfiniteQuery({
    queryKey: ['employee', 'receivables', 'clients-summary', 'infinite'],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await apiClient.get('/receivables/clients-summary', {
        params: { page: pageParam, per_page: 20 }
      });
      return response.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { pagination } = lastPage.data;
      return pagination.current_page < pagination.total_pages ? 
        pagination.current_page + 1 : undefined;
    },
    staleTime: 1 * 60 * 1000, // Keep fresh for 1 minute
  });
};

/**
 * Get clients receivables totals for current employee
 */
export const useGetMyClientsReceivablesTotals = () => {
  return useQuery({
    queryKey: ['employee', 'receivables', 'totals'],
    queryFn: async () => {
      const response = await apiClient.get('/receivables/clients-summary/totals');
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // Keep fresh for 2 minutes
  });
};

// New types for employee dashboard
export interface EmployeeReceivableDashboardItem {
  id: string;
  client_id: string;
  task_id: string;
  created_by: string | null;
  type: string;
  description: string;
  amount: string;
  amount_details: string;
  notes: string;
  due_date: string;
  created_at: string;
  updated_at: string;
  client_name: string;
  client_phone: string;
  task_name: string;
  task_type: string;
  task_assigned_to_id: string | null;
  task_created_by: string;
  total_paid: number;
  total_allocated: number;
  remaining_amount: number;
  payments: any[];
  credit_allocations: any[];
  payment_status: string;
  employee_relationship: string[];
  receivables_details: any[];
}

export interface EmployeeReceivableDashboardResponse {
  success: boolean;
  data: {
    receivables: EmployeeReceivableDashboardItem[];
    pagination: {
      total: number;
      per_page: number;
      current_page: number;
      total_pages: number;
      has_next: boolean;
      has_prev: boolean;
    };
  };
}

/**
 * Get employee receivables dashboard with infinite scroll
 */
export const useGetMyReceivablesDashboardInfinite = (params?: {
  payment_status?: 'unpaid' | 'paid';
  client_id?: string;
  search?: string;
}) => {
  return useInfiniteQuery({
    queryKey: ['employee', 'receivables', 'dashboard', 'infinite', params],
    queryFn: async ({ pageParam = 1 }): Promise<EmployeeReceivableDashboardResponse> => {
      const response = await apiClient.get('/receivables/employee/me/dashboard', {
        params: { 
          page: pageParam, 
          per_page: 20,
          ...params
        }
      });
      return response.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { pagination } = lastPage.data;
      return pagination.has_next ? pagination.current_page + 1 : undefined;
    },
    staleTime: 1 * 60 * 1000, // Keep fresh for 1 minute
  });
};
