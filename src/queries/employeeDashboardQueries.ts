import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/apiClient';
import type { ApiResponse, TaskType } from '../api/types';

// Employee dashboard data types - Monthly Ledger Response
export interface MonthlyTransaction {
  id: number;
  date: string;
  description: string;
  from_account: string;
  to_account: string;
  amount: number;
  running_balance: number;
  direction: 'income' | 'expense' | null;
  transaction_type: string;
  reference_type: string | null;
  reference_id: string | null;
}

export interface OpeningBalance {
  total_debit: number;
  total_credit: number;
  balance: number;
  description: string;
}

export interface PeriodInfo {
  month: number;
  year: number;
  month_name: string;
}

export interface MonthlySummary {
  period_income: number;
  period_expenses: number;
  net_change: number;
  closing_balance: number;
  total_to_date_income: number;
  total_to_date_expenses: number;
  balance_due: number;
}

export interface MonthlyLedgerData {
  period: PeriodInfo;
  opening_balance: OpeningBalance;
  transactions: MonthlyTransaction[];
  summary: MonthlySummary;
  task_stats?: TaskStats;
  recent_tasks?: EmployeeDashboardTask[];
}

// Legacy types for backwards compatibility
export interface EmployeeTransaction {
  id: string;
  employee_user_id?: string;
  transaction_name: string;
  direction: 'CREDIT' | 'DEBIT';
  amount: string | null;
  related_task_id: string | null;
  task_amount: string | null;
  notes: string;
  transaction_date: string;
  created_at?: string;
  task_name: string | null;
  client_id?: string | null;
  client_name: string | null;
  balance?: string | null;
  is_pending?: boolean;
  source?: 'new_ledger' | 'legacy';
  transaction_type?: string;
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
 * Fetch employee monthly ledger (new API)
 * Uses the /employees/me/dashboard endpoint
 */
export const useEmployeeDashboard = (month?: number, year?: number) => {
  return useQuery({
    queryKey: ['employee', 'dashboard', month, year],
    queryFn: async (): Promise<MonthlyLedgerData> => {
      const params: any = {};
      if (month) params.month = month;
      if (year) params.year = year;
      
      const response = await apiClient.get<MonthlyLedgerData>('/employees/me/dashboard', { params });
      return response.data;
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
