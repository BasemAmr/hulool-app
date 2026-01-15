import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/apiClient';
import type {
  Employee,
  EmployeePaginatedData,
  EmployeeStats,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  EmployeeReceivablesData,
  ApiResponse,
} from '../api/types';

/**
 * Fetch all employees with pagination and filtering
 */
export const useGetEmployees = (params?: {
  page?: number;
  per_page?: number;
  search?: string;
}) => {
  return useQuery({
    queryKey: ['employees', params],
    queryFn: async (): Promise<EmployeePaginatedData> => {
      const response = await apiClient.get('/employees', { params });
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // Keep fresh for 2 minutes
  });
};

/**
 * Fetch active employees for selection dropdown
 */
export const useGetEmployeesForSelection = () => {
  return useQuery({
    queryKey: ['employees', 'selection'],
    queryFn: async (): Promise<Employee[]> => {
      const response = await apiClient.get('/employees/selection');
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000, // Keep fresh for 5 minutes - employees don't change often
  });
};

/**
 * Fetch specific employee by ID
 */
export const useGetEmployee = (id: number) => {
  return useQuery({
    queryKey: ['employees', id],
    queryFn: async (): Promise<Employee> => {
      const response = await apiClient.get(`/employees/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });
};

/**
 * Fetch employee statistics
 */
export const useGetEmployeeStats = () => {
  return useQuery({
    queryKey: ['employees', 'stats'],
    queryFn: async (): Promise<EmployeeStats> => {
      const response = await apiClient.get('/employees/stats');
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Create new employee
 */
export const useCreateEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (employeeData: CreateEmployeeRequest): Promise<Employee> => {
      const response = await apiClient.post('/employees', employeeData);
      return response.data.data;
    },
    onSuccess: () => {
      // Invalidate the unified users query that now includes employee status
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employees', 'selection'] });
    },
  });
};

/**
 * Update employee
 */
export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateEmployeeRequest }): Promise<Employee> => {
      const response = await apiClient.put(`/employees/${id}`, data);
      return response.data.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employees', id] });
    },
  });
};

/**
 * Delete employee (soft delete)
 */
export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      await apiClient.delete(`/employees/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
};

/**
 * Remove employee status (hard delete from tm_employees table)
 */
export const useRemoveEmployeeStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: number): Promise<void> => {
      await apiClient.delete(`/employees/user/${userId}`);
    },
    onSuccess: () => {
      // Invalidate the unified users query that now includes employee status
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employees', 'selection'] });
    },
  });
};

/**
 * Assign task to employee
 */
export const useAssignTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, assignedToId }: { taskId: number; assignedToId: number | null }) => {
      const response = await apiClient.put(`/tasks/${taskId}/assign`, {
        assigned_to_id: assignedToId,
      });
      return response.data;
    },
    onSuccess: (_, { taskId }) => {
      // Invalidate task queries to refresh the assignment
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId] });

      // Also invalidate recent tasks in case they're displayed
      queryClient.invalidateQueries({ queryKey: ['tasks', 'recent'] });

      // Invalidate dashboard queries since task assignment affects active tasks
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'clientsWithActiveTasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'employee', 'clientsWithActiveTasks'] });
    },
  });
};

/**
 * Get employee transactions (payouts and commissions)
 */
export const useGetEmployeeTransactions = (
  employeeId: number,
  params?: { page?: number; per_page?: number }
) => {
  return useQuery({
    queryKey: ['employees', employeeId, 'transactions', params],
    queryFn: async () => {
      const response = await apiClient.get(`/employees/${employeeId}/payouts`, { params });
      return response.data;
    },
    enabled: !!employeeId,
    staleTime: 30 * 1000, // Keep fresh for 30 seconds
  });
};

/**
 * Delete employee transaction (payout only)
 */
export const useDeleteEmployeeTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employeeUserId,
      transactionId
    }: {
      employeeTableId: number;
      employeeUserId: number;
      transactionId: number
    }) => {
      // The DELETE API endpoint expects user_id in the URL
      const response = await apiClient.delete(`/employees/${employeeUserId}/transactions/${transactionId}`);
      return response.data;
    },
    onSuccess: (_, { employeeTableId }) => {
      // Invalidate query using the employee table ID
      queryClient.invalidateQueries({ queryKey: ['employees', employeeTableId, 'transactions'] });
    },
  });
};

/**
 * Update employee transaction (edit payout amount/notes)
 */
export const useUpdateEmployeeTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employeeUserId,
      transactionId,
      data
    }: {
      employeeTableId: number;
      employeeUserId: number;
      transactionId: number;
      data: { amount?: number; notes?: string; }
    }) => {
      // The PUT API endpoint expects user_id in the URL
      const response = await apiClient.put(`/employees/${employeeUserId}/transactions/${transactionId}`, data);
      return response.data;
    },
    onSuccess: (_, { employeeTableId }) => {
      // Invalidate query using the employee table ID
      queryClient.invalidateQueries({ queryKey: ['employees', employeeTableId, 'transactions'] });
    },
  });
};

/**
 * Get tasks assigned to/created by employee
 */
export const useGetEmployeeTasks = (
  employeeId: number,
  params?: { page?: number; per_page?: number; status?: string | string[] }
) => {
  return useQuery({
    queryKey: ['employees', employeeId, 'tasks', params],
    queryFn: async () => {
      // We need to get employee details first to get the user_id
      // const employeeResponse = await apiClient.get(`/employees/${employeeId}`);
      // const employee = employeeResponse.data.data;
      const response = await apiClient.get(`/tasks/employee/${employeeId}`, { params });
      return response.data;
      // return { data: { tasks: [], pagination: {} } };
    },
    enabled: !!employeeId,
    staleTime: 1 * 60 * 1000, // Keep fresh for 1 minute
  });
};

/**
 * Get clients related to employee
 */
export const useGetEmployeeClients = (
  employeeId: number,
  params?: { page?: number; per_page?: number }
) => {
  return useQuery({
    queryKey: ['employees', employeeId, 'clients', params],
    queryFn: async () => {
      // We need to get employee details first to get the user_id
      const employeeResponse = await apiClient.get(`/employees/${employeeId}`);
      const employee = employeeResponse.data.data;

      // Get clients associated with this employee's tasks
      const response = await apiClient.get(`/clients/admin/employee/${employee.user_id}`, { params });
      return response.data;
    },
    enabled: !!employeeId,
    staleTime: 2 * 60 * 1000, // Keep fresh for 2 minutes
  });
};

/**
 * Get receivables summary for employee's clients
 */
export const useGetEmployeeReceivablesSummary = (
  employeeId: number,
  params?: { page?: number; per_page?: number }
) => {
  return useQuery({
    queryKey: ['employees', employeeId, 'client-balances', params],
    queryFn: async (): Promise<ApiResponse<EmployeeReceivablesData>> => {
      // We need to get employee details first to get the user_id
      const employeeResponse = await apiClient.get<ApiResponse<Employee>>(`/employees/${employeeId}`);
      const employee = employeeResponse.data.data;
      // Use new accounts endpoint instead of deprecated receivables
      const response = await apiClient.get<ApiResponse<EmployeeReceivablesData>>(`/accounts/clients/balances`, {
        params: {
          employee_user_id: employee.user_id,
          ...params
        }
      });
      return response.data;
    },
    enabled: !!employeeId,
    staleTime: 1 * 60 * 1000, // Keep fresh for 1 minute
  });
};

/**
 * Get receivables totals for employee's clients
 */
export const useGetEmployeeReceivablesTotals = (employeeId: number) => {
  return useQuery({
    queryKey: ['employees', employeeId, 'client-balance-totals'],
    queryFn: async () => {
      // We need to get employee details first to get the user_id
      const employeeResponse = await apiClient.get<ApiResponse<Employee>>(`/employees/${employeeId}`);
      const employee = employeeResponse.data.data;
      // Use new accounts endpoint instead of deprecated receivables
      const response = await apiClient.get('/accounts/clients/totals', {
        params: {
          employee_user_id: employee.user_id
        }
      });
      return response.data;
    },
    enabled: !!employeeId,
    staleTime: 2 * 60 * 1000, // Keep fresh for 2 minutes
  });
};

/**
 * Add payout to employee
 */
export const useAddEmployeePayout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employeeUserId,
      payoutData
    }: {
      employeeUserId: number;
      payoutData: { amount: number; notes?: string; type?: string; }
    }) => {
      // The POST API endpoint expects user_id in the URL
      const response = await apiClient.post(`/employees/${employeeUserId}/payouts`, payoutData);
      return response.data;
    },
    onSuccess: (_, { employeeUserId }) => {
      // Invalidate query using the employee table ID
      queryClient.invalidateQueries({ queryKey: ['employees', employeeUserId, 'transactions'] });
    },
  });
};

/**
 * Add borrow to employee
 */
export const useAddEmployeeBorrow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employeeUserId,
      borrowData
    }: {
      employeeUserId: number;
      borrowData: { amount: number; notes?: string; }
    }) => {
      // The POST API endpoint expects user_id in the URL
      const response = await apiClient.post(`/employees/${employeeUserId}/borrow`, borrowData);
      return response.data;
    },
    onSuccess: (_, { employeeUserId }) => {
      // Invalidate query using the employee table ID
      queryClient.invalidateQueries({ queryKey: ['employees', employeeUserId, 'transactions'] });
    },
  });
};

// Types for employee financial summary
export interface EmployeeFinancialSummary {
  total_earned: number;
  total_expenses: number;
  total_paid_out?: number;
  balance_due: number;
  total_transactions: number;
  last_payout_date: string | null;
}

export interface EmployeeTransactionData {
  id: string;
  transaction_name: string;
  direction: 'CREDIT' | 'DEBIT';
  amount: string | null;
  related_task_id: string | null;
  task_amount: string | null;
  notes: string;
  transaction_date: string;
  task_name: string | null;
  client_name: string | null;
  balance?: string | null;
  is_pending?: boolean;
  source?: 'new_ledger' | 'legacy';
}

export interface EmployeeLedgerResponse {
  success: boolean;
  data: {
    pending_commissions: EmployeeTransactionData[];
    transactions: EmployeeTransactionData[];
    summary?: EmployeeFinancialSummary;
    source?: 'new_ledger' | 'legacy';
  };
  pagination?: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
}

/**
 * Get employee ledger with transactions and summary
 * Uses the admin endpoint to get full transaction history with summary
 */
export const useGetEmployeeLedger = (
  employeeId: number,
  params?: { page?: number; per_page?: number }
) => {
  return useQuery({
    queryKey: ['employees', employeeId, 'ledger', params],
    queryFn: async (): Promise<EmployeeLedgerResponse> => {
      const response = await apiClient.get(`/employees/${employeeId}/payouts`, { params });
      return response.data;
    },
    enabled: !!employeeId,
    staleTime: 30 * 1000, // Keep fresh for 30 seconds
  });
};