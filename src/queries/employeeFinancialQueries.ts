import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import apiClient from '../api/apiClient';

// Type definitions
export interface EmployeeTransaction {
  id: string;
  employee_user_id?: string;
  transaction_name: string;
  direction: 'CREDIT' | 'DEBIT';
  amount: string;
  related_task_id: string | null;
  task_amount: string | null;
  notes: string;
  transaction_date: string;
  created_at?: string;
  task_name: string | null;
  client_id?: string | null;
  client_name: string | null;
  // New ledger fields
  balance?: string | null;
  is_pending?: boolean;
  source?: 'new_ledger' | 'legacy';
  transaction_type?: string;
}

export interface EmployeeFinancialSummary {
  total_earned: number;
  total_expenses: number;
  total_paid_out?: number;
  balance_due: number;
  total_transactions: number;
  last_payout_date: string | null;
}

export interface EmployeeTransactionsResponse {
  success: boolean;
  data: {
    pending_commissions: EmployeeTransaction[];
    transactions: EmployeeTransaction[];
    summary?: EmployeeFinancialSummary;
    source?: 'new_ledger' | 'legacy';
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
 * Transform API response transactions to normalized format
 */
const transformTransaction = (trans: any): EmployeeTransaction => {
  // Detect if this is a pending commission (description starts with "Pending:" or amount is 0 for CREDIT)
  const isPending = trans.transaction_name?.startsWith('Pending:') || 
    (trans.direction === 'CREDIT' && (parseFloat(trans.amount) || 0) === 0);
  
  return {
    id: String(trans.id),
    employee_user_id: trans.employee_user_id ? String(trans.employee_user_id) : undefined,
    transaction_name: trans.transaction_name || trans.description || '',
    direction: trans.direction || (parseFloat(trans.debit || 0) > 0 ? 'CREDIT' : 'DEBIT'),
    amount: trans.amount || (trans.debit || trans.credit || '0'),
    related_task_id: trans.related_task_id ? String(trans.related_task_id) : null,
    task_amount: trans.task_amount ? String(trans.task_amount) : null,
    notes: trans.notes || '',
    transaction_date: trans.transaction_date || trans.created_at || '',
    created_at: trans.created_at,
    task_name: trans.task_name || null,
    client_id: trans.client_id ? String(trans.client_id) : undefined,
    client_name: trans.client_name || null,
    balance: trans.balance ? String(trans.balance) : null,
    is_pending: isPending,
    source: trans.source || 'legacy',
    transaction_type: trans.transaction_type || undefined,
  };
};

/**
 * Get current employee's transactions (for employee user)
 */
export const useGetMyTransactions = () => {
  return useQuery({
    queryKey: ['employee', 'transactions', 'me'],
    queryFn: async (): Promise<EmployeeTransactionsResponse> => {
      const response = await apiClient.get('/employees/me/transactions');
      const data = response.data;
      
      // Transform transactions to normalized format
      return {
        success: data.success,
        data: {
          pending_commissions: (data.data?.pending_commissions || []).map(transformTransaction),
          transactions: (data.data?.transactions || []).map(transformTransaction),
          summary: data.data?.summary,
          source: data.data?.source,
        },
      };
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
 * Uses new /accounts/employee/me/clients endpoint
 */
export const useGetMyClientsReceivablesSummaryInfinite = () => {
  return useInfiniteQuery({
    queryKey: ['employee', 'accounts', 'clients-summary', 'infinite'],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await apiClient.get('/accounts/employee/me/clients', {
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
 * Uses new /accounts/employee/me/clients/totals endpoint
 */
export const useGetMyClientsReceivablesTotals = () => {
  return useQuery({
    queryKey: ['employee', 'accounts', 'totals'],
    queryFn: async () => {
      const response = await apiClient.get('/accounts/employee/me/clients/totals');
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // Keep fresh for 2 minutes
  });
};

// New types for employee invoice dashboard (migrated from receivables)
export interface EmployeeInvoiceDashboardItem {
  id: number;
  client_id: number;
  task_id: number | null;
  created_by: number;
  type: string;
  is_prepaid: number;
  status: string; // draft, pending, partially_paid, paid, overdue, cancelled
  description: string;
  notes: string | null;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date: string;
  created_at: string;
  updated_at: string;
  original_receivable_id: number | null;
  is_fully_paid: boolean;
  is_partially_paid: boolean;
  is_overdue: boolean;
  payments: any[];
  client: {
    id: number;
    name: string;
    phone: string;
  } | null;
  task: {
    id: number;
    task_name: string;
    type: string;
  } | null;
  // Convenience properties for backward compatibility
  client_name?: string;
  client_phone?: string;
  task_name?: string;
  task_type?: string;
}

export interface EmployeeInvoiceDashboardResponse {
  invoices: EmployeeInvoiceDashboardItem[];
  pagination: {
    total: number;
    per_page: number;
    current_page: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// Legacy interface for backward compatibility (deprecated)
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
 * Transform invoice dashboard item to receivable format for backward compatibility
 */
const transformInvoiceToReceivable = (invoice: EmployeeInvoiceDashboardItem): EmployeeReceivableDashboardItem => {
  return {
    id: String(invoice.id),
    client_id: String(invoice.client_id),
    task_id: invoice.task_id ? String(invoice.task_id) : '',
    created_by: invoice.created_by ? String(invoice.created_by) : null,
    type: invoice.type,
    description: invoice.description,
    amount: String(invoice.amount),
    amount_details: '',
    notes: invoice.notes || '',
    due_date: invoice.due_date,
    created_at: invoice.created_at,
    updated_at: invoice.updated_at,
    client_name: invoice.client?.name || invoice.client_name || '',
    client_phone: invoice.client?.phone || invoice.client_phone || '',
    task_name: invoice.task?.task_name || invoice.task_name || '',
    task_type: invoice.task?.type || invoice.task_type || '',
    task_assigned_to_id: null,
    task_created_by: '',
    total_paid: invoice.paid_amount,
    total_allocated: 0,
    remaining_amount: invoice.remaining_amount,
    payments: invoice.payments || [],
    credit_allocations: [],
    payment_status: invoice.is_fully_paid ? 'paid' : invoice.is_partially_paid ? 'partial' : 'unpaid',
    employee_relationship: [],
    receivables_details: [],
  };
};

/**
 * Get employee invoices dashboard with infinite scroll
 * Uses the new invoice endpoint instead of deprecated receivables endpoint
 */
export const useGetMyReceivablesDashboardInfinite = (params?: {
  payment_status?: 'unpaid' | 'paid' | string[];
  client_id?: string;
  search?: string;
}) => {
  return useInfiniteQuery({
    queryKey: ['employee', 'invoices', 'dashboard', 'infinite', params],
    queryFn: async ({ pageParam = 1 }): Promise<EmployeeReceivableDashboardResponse> => {
      // Build filters for the invoice endpoint
      const queryParams: Record<string, any> = { 
        page: pageParam, 
        per_page: 20,
      };
      
      // Handle payment_status filter
      if (params?.payment_status) {
        if (Array.isArray(params.payment_status)) {
          // Convert array to status filter for invoice endpoint
          queryParams.payment_status = params.payment_status;
        } else {
          queryParams.payment_status = params.payment_status;
        }
      }
      
      if (params?.client_id) {
        queryParams.client_id = params.client_id;
      }
      
      if (params?.search) {
        queryParams.search = params.search;
      }
      
      const response = await apiClient.get<EmployeeInvoiceDashboardResponse>('/invoices/employee/me/dashboard', {
        params: queryParams
      });
      
      // Transform invoice data to receivable format for backward compatibility
      const invoices = response.data.invoices || [];
      const receivables = invoices.map(transformInvoiceToReceivable);
      
      return {
        success: true,
        data: {
          receivables,
          pagination: {
            total: response.data.pagination?.total || 0,
            per_page: response.data.pagination?.per_page || 20,
            current_page: response.data.pagination?.current_page || pageParam,
            total_pages: response.data.pagination?.total_pages || 1,
            has_next: response.data.pagination?.has_next || false,
            has_prev: response.data.pagination?.has_prev || false,
          },
        },
      };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { pagination } = lastPage.data;
      return pagination.has_next ? pagination.current_page + 1 : undefined;
    },
    staleTime: 1 * 60 * 1000, // Keep fresh for 1 minute
  });
};
