import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/apiClient';
import type { ApiResponse, TaskType } from '../api/types';

// Employee dashboard data types
export interface EmployeeTransaction {
  id: string;
  employee_user_id: string;
  transaction_name: string;
  direction: 'CREDIT' | 'DEBIT';
  amount: string | null;
  related_task_id: string;
  task_amount: string;
  notes: string;
  transaction_date: string;
  created_at: string;
  task_name: string;
  client_id: string;
  client_name: string;
}

export interface FinancialSummary {
  total_earned: number;
  total_paid_out: number;
  balance_due: number;
  total_transactions: number;
  pending_transactions: number;
  last_payout_date: string | null;
}

export interface TaskStats {
  total_assigned: number;
  new_tasks: number;
  deferred_tasks: number;
  pending_review: number;
  completed_tasks: number;
  completed_this_month: number;
}

export interface EmployeeDashboardTask {
  client_id: number;
  assigned_to_id: number | null;
  task_name: string;
  type: TaskType;
  status: string;
  amount: number;
  expense_amount: number;
  net_earning: number;
  amount_details: any[];
  start_date: string;
  end_date: string;
  prepaid_amount: number;
  prepaid_receivable_id: number | null;
  notes: string;
  id: number;
  created_at: string;
  updated_at: string;
  client: {
    id: string;
    name: string;
    phone: string;
  };
  requirements: any[];
  receivable: any;
  prepaid_receivable: any;
  tags?: Array<{
    id: number;
    name: string;
  }>;
}

export interface EmployeeDashboardData {
  recent_transactions: EmployeeTransaction[];
  financial_summary: FinancialSummary;
  pending_commissions_count: number;
  pending_commission_total: number;
  task_stats: TaskStats;
  recent_tasks: EmployeeDashboardTask[];
}

/**
 * Fetch employee dashboard data
 * Uses the /employees/me/dashboard endpoint
 */
export const useEmployeeDashboard = () => {
  return useQuery({
    queryKey: ['employee', 'dashboard'],
    queryFn: async (): Promise<EmployeeDashboardData> => {
      const response = await apiClient.get<ApiResponse<EmployeeDashboardData>>('/employees/me/dashboard');
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch employee dashboard data');
      }
      return response.data.data;
    },
    staleTime: 1 * 60 * 1000, // Keep fresh for 1 minute
    refetchInterval: 20 * 1000, // Auto-refetch every 20 seconds
  });
};

/**
 * Update employee sort order for clients
 */
const updateEmployeeSortOrder = async ({ clientIds }: { clientIds: number[] }) => {
  const { data } = await apiClient.post<ApiResponse<any>>('/clients/employee/sort-order', {
    client_ids: clientIds,
  });
  return data;
};

/**
 * Hook to update employee sort order
 */
export const useUpdateEmployeeSortOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateEmployeeSortOrder,
    onSuccess: () => {
      // Invalidate to get the latest server-confirmed order
      queryClient.invalidateQueries({ queryKey: ['employee', 'dashboard'] });
    },
  });
};
