/**
 * Account Queries
 * 
 * This module provides access to the double-entry ledger system.
 * It handles account balances, transaction history, and financial summaries.
 * 
 * Account Types:
 * - client: Client accounts (what clients owe)
 * - employee: Employee accounts (commissions, salary)
 * - company: Company accounts (expenses, income)
 * 
 * @see api/types.ts for AccountBalance, FinancialTransaction, and related types
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import apiClient from '../api/apiClient';
import type { 
  ApiResponse, 
  AccountType,
  AccountBalance,
  AccountStats,
  FinancialTransaction,
  TransactionSummary,
  ClientAccountBalance,
  ClientsTotalStats,
  TotalUnpaidStats,
  PaymentMethodStats,
  DailyPaymentTotal,
  AccountHistoryPaginatedData,
  ClientBalancesPaginatedData,
  BalanceVerification,
  BalanceRecalculation,
  Pagination
} from '../api/types';

// --- Constants ---
const TRANSACTIONS_PER_PAGE = 50;
const CLIENTS_PER_PAGE = 20;

// --- Types for API Responses ---
interface TransactionHistoryResponse {
  transactions?: FinancialTransaction[];
  data?: FinancialTransaction[];
  pagination: Pagination;
}

interface ClientBalancesResponse {
  clients?: ClientAccountBalance[];
  data?: ClientAccountBalance[];
  pagination: Pagination;
}

interface TransactionFilters {
  account_type?: AccountType;
  account_id?: number;
  transaction_type?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  per_page?: number;
}

interface ClientBalancesFilters {
  search?: string;
  employee_user_id?: number;
  page?: number;
  per_page?: number;
}

// --- API Functions ---

/**
 * Get balance for a specific account
 */
const fetchAccountBalance = async (
  accountType: AccountType, 
  accountId: number
): Promise<AccountBalance> => {
  const { data } = await apiClient.get<any>(
    `/accounts/${accountType}/${accountId}/balance`
  );
  
  // Handle different response formats
  // Format 1: { success: true, data: { balance: 10, ... } }
  // Format 2: { balance: 10 }
  // Format 3: { success: true, data: { current_balance: 10, ... } }
  
  if (data.success === false) {
    throw new Error(data.message || 'Failed to fetch account balance');
  }

  // Extract balance data from various possible locations
  let balanceData: any;
  
  if (data.data && typeof data.data === 'object') {
    // Wrapped response: { success: true, data: {...} }
    balanceData = data.data;
  } else if (typeof data === 'object' && !Array.isArray(data)) {
    // Direct response: { balance: 10 } or { current_balance: 10, ... }
    balanceData = data;
  } else {
    throw new Error('Invalid balance response format');
  }

  // Ensure all required fields exist with defaults
  const result: AccountBalance = {
    account_type: (balanceData.account_type || accountType) as AccountType,
    account_id: balanceData.account_id || accountId,
    name: balanceData.name,
    current_balance: balanceData.current_balance ?? balanceData.balance ?? 0,
    total_credits: balanceData.total_credits ?? 0,
    total_debits: balanceData.total_debits ?? 0,
    total_invoiced: balanceData.total_invoiced,
    total_paid: balanceData.total_paid,
    last_updated: balanceData.last_updated || new Date().toISOString(),
  };

  return result;
};

/**
 * Get transaction history for an account with pagination
 */
const fetchAccountHistory = async (
  accountType: AccountType, 
  accountId: number,
  page: number = 1,
  perPage: number = TRANSACTIONS_PER_PAGE
): Promise<AccountHistoryPaginatedData> => {
  const { data } = await apiClient.get<any>(
    `/accounts/${accountType}/${accountId}/history`,
    { params: { page, per_page: perPage } }
  );
  
  // Handle different response formats:
  // Format 1: { success: true, data: { transactions: [], pagination: {} } }
  // Format 2: { transactions: [], pagination: {} }
  
  // Check if it's wrapped in success/data
  if (data.success === false) {
    throw new Error(data.message || 'Failed to fetch account history');
  }

  // Try to extract transactions from various possible locations
  let transactions: any[] = [];
  let pagination: any = { total: 0, per_page: perPage, current_page: page, total_pages: 1, has_next: false, has_prev: false };
  let balance: number | undefined;
  let total_debits: number | undefined;
  let total_credits: number | undefined;

  if (data.data?.transactions) {
    // Format: { success: true, data: { transactions: [...], pagination: {...} } }
    transactions = data.data.transactions;
    pagination = data.data.pagination || pagination;
    balance = data.data.balance;
    total_debits = data.data.total_debits;
    total_credits = data.data.total_credits;
  } else if (data.data?.data) {
    // Format: { success: true, data: { data: [...], pagination: {...} } }
    transactions = data.data.data;
    pagination = data.data.pagination || pagination;
    balance = data.data.balance;
    total_debits = data.data.total_debits;
    total_credits = data.data.total_credits;
  } else if (data.transactions) {
    // Format: { transactions: [...], pagination: {...} }
    transactions = data.transactions;
    pagination = data.pagination || pagination;
    balance = data.balance;
    total_debits = data.total_debits;
    total_credits = data.total_credits;
  } else if (Array.isArray(data.data)) {
    // Format: { success: true, data: [...] }
    transactions = data.data;
  } else if (Array.isArray(data)) {
    // Format: [...]
    transactions = data;
  }
  
  return {
    transactions,
    pagination,
    balance,
    total_debits,
    total_credits,
  };
};

/**
 * Get paginated account history for infinite scroll
 */
const fetchPaginatedAccountHistory = async ({ 
  pageParam = 1, 
  accountType, 
  accountId 
}: { 
  pageParam?: number; 
  accountType: AccountType; 
  accountId: number; 
}): Promise<AccountHistoryPaginatedData> => {
  return fetchAccountHistory(accountType, accountId, pageParam);
};

/**
 * Get account statistics
 */
const fetchAccountStats = async (
  accountType: AccountType, 
  accountId: number
): Promise<AccountStats> => {
  const { data } = await apiClient.get<any>(
    `/accounts/${accountType}/${accountId}/stats`
  );
  
  if (data.success === false) {
    throw new Error(data.message || 'Failed to fetch account statistics');
  }

  // Handle both wrapped and unwrapped responses
  return data.data && typeof data.data === 'object' && !Array.isArray(data.data) ? data.data : data;
};

/**
 * Get transaction summary by type for an account
 */
const fetchAccountSummary = async (
  accountType: AccountType, 
  accountId: number
): Promise<TransactionSummary> => {
  const { data } = await apiClient.get<ApiResponse<TransactionSummary>>(
    `/accounts/${accountType}/${accountId}/summary`
  );
  
  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch account summary');
  }

  return data.data;
};

/**
 * Verify balance integrity for an account
 */
const verifyAccountBalance = async (
  accountType: AccountType, 
  accountId: number
): Promise<BalanceVerification> => {
  const { data } = await apiClient.post<ApiResponse<BalanceVerification>>(
    `/accounts/${accountType}/${accountId}/verify`
  );
  
  if (!data.success) {
    throw new Error(data.message || 'Failed to verify balance');
  }

  return data.data;
};

/**
 * Recalculate account balance (admin only)
 */
const recalculateAccountBalance = async (
  accountType: AccountType, 
  accountId: number
): Promise<BalanceRecalculation> => {
  const { data } = await apiClient.post<ApiResponse<BalanceRecalculation>>(
    `/accounts/${accountType}/${accountId}/recalculate`
  );
  
  if (!data.success) {
    throw new Error(data.message || 'Failed to recalculate balance');
  }

  return data.data;
};

/**
 * Get all account balances (optionally filtered by type)
 */
const fetchAllBalances = async (accountType?: AccountType): Promise<AccountBalance[]> => {
  const params: Record<string, any> = {};
  if (accountType) params.type = accountType;

  const { data } = await apiClient.get<ApiResponse<AccountBalance[]>>('/accounts/balances', { params });
  
  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch balances');
  }

  return data.data;
};

/**
 * Search transactions with multiple filters
 */
const searchTransactions = async (filters: TransactionFilters): Promise<AccountHistoryPaginatedData> => {
  const params: Record<string, any> = {
    page: filters.page || 1,
    per_page: filters.per_page || TRANSACTIONS_PER_PAGE,
  };
  
  if (filters.account_type) params.account_type = filters.account_type;
  if (filters.account_id) params.account_id = filters.account_id;
  if (filters.transaction_type) params.transaction_type = filters.transaction_type;
  if (filters.start_date) params.start_date = filters.start_date;
  if (filters.end_date) params.end_date = filters.end_date;

  const { data } = await apiClient.get<ApiResponse<TransactionHistoryResponse>>(
    '/accounts/transactions', 
    { params }
  );
  
  if (!data.success) {
    throw new Error(data.message || 'Failed to search transactions');
  }

  const transactions = data.data.transactions || data.data.data || [];
  
  return {
    transactions,
    pagination: data.data.pagination,
  };
};

/**
 * Get all clients with their current balances (paginated, searchable)
 */
const fetchClientBalances = async (filters: ClientBalancesFilters = {}): Promise<ClientBalancesPaginatedData> => {
  const params: Record<string, any> = {
    page: filters.page || 1,
    per_page: filters.per_page || CLIENTS_PER_PAGE,
  };
  
  if (filters.search) params.search = filters.search;
  if (filters.employee_user_id) params.employee_user_id = filters.employee_user_id;

  const { data } = await apiClient.get<ApiResponse<ClientBalancesResponse>>(
    '/accounts/clients/balances', 
    { params }
  );
  
  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch client balances');
  }

  const clients = data.data.clients || data.data.data || [];
  
  return {
    clients,
    pagination: data.data.pagination,
  };
};

/**
 * Get paginated client balances for infinite scroll
 */
const fetchPaginatedClientBalances = async ({ 
  pageParam = 1, 
  filters = {} 
}: { 
  pageParam?: number; 
  filters?: Omit<ClientBalancesFilters, 'page'>; 
}): Promise<ClientBalancesPaginatedData> => {
  return fetchClientBalances({ ...filters, page: pageParam });
};

/**
 * Get total balance statistics across all clients
 */
const fetchClientsTotals = async (employeeUserId?: number): Promise<ClientsTotalStats> => {
  const params: Record<string, any> = {};
  if (employeeUserId) params.employee_user_id = employeeUserId;

  const { data } = await apiClient.get<ApiResponse<ClientsTotalStats>>(
    '/accounts/clients/totals', 
    { params }
  );
  
  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch client totals');
  }

  return data.data;
};

/**
 * Get total unpaid amount across all clients
 */
const fetchTotalUnpaid = async (): Promise<TotalUnpaidStats> => {
  const { data } = await apiClient.get<ApiResponse<TotalUnpaidStats>>('/accounts/clients/total-unpaid');
  
  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch total unpaid');
  }

  return data.data;
};

/**
 * Get payment statistics by method for a date range
 */
const fetchPaymentStatsByMethod = async (
  dateFrom: string, 
  dateTo: string
): Promise<PaymentMethodStats> => {
  const { data } = await apiClient.get<ApiResponse<PaymentMethodStats>>(
    '/accounts/payments/stats-by-method',
    { params: { date_from: dateFrom, date_to: dateTo } }
  );
  
  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch payment statistics');
  }

  return data.data;
};

/**
 * Get daily payment totals for a date range
 */
const fetchDailyPaymentTotals = async (
  dateFrom: string, 
  dateTo: string
): Promise<DailyPaymentTotal[]> => {
  const { data } = await apiClient.get<ApiResponse<DailyPaymentTotal[]>>(
    '/accounts/payments/daily-totals',
    { params: { date_from: dateFrom, date_to: dateTo } }
  );
  
  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch daily payment totals');
  }

  return data.data;
};

/**
 * Record a commission transaction for an employee
 */
const recordEmployeeCommission = async ({ 
  employeeId, 
  amount, 
  description,
  relatedId,
  relatedType = 'task'
}: { 
  employeeId: number; 
  amount: number; 
  description?: string;
  relatedId?: number;
  relatedType?: string;
}): Promise<FinancialTransaction> => {
  const { data } = await apiClient.post<ApiResponse<FinancialTransaction>>(
    `/accounts/employee/${employeeId}/commission`,
    { amount, description, related_id: relatedId, related_type: relatedType }
  );
  
  if (!data.success) {
    throw new Error(data.message || 'Failed to record commission');
  }

  return data.data;
};

/**
 * Record a salary payment for an employee (admin only)
 */
const recordEmployeeSalary = async ({ 
  employeeId, 
  amount, 
  description,
  paymentDate
}: { 
  employeeId: number; 
  amount: number; 
  description?: string;
  paymentDate?: string;
}): Promise<FinancialTransaction> => {
  const { data } = await apiClient.post<ApiResponse<FinancialTransaction>>(
    `/accounts/employee/${employeeId}/salary`,
    { amount, description, payment_date: paymentDate }
  );
  
  if (!data.success) {
    throw new Error(data.message || 'Failed to record salary');
  }

  return data.data;
};

/**
 * Record a company expense (admin only)
 */
const recordCompanyExpense = async ({ 
  amount, 
  description,
  relatedType
}: { 
  amount: number; 
  description: string;
  relatedType?: string;
}): Promise<FinancialTransaction> => {
  const { data } = await apiClient.post<ApiResponse<FinancialTransaction>>(
    '/accounts/company/expense',
    { amount, description, related_type: relatedType }
  );
  
  if (!data.success) {
    throw new Error(data.message || 'Failed to record expense');
  }

  return data.data;
};

/**
 * Record company income (admin only)
 */
const recordCompanyIncome = async ({ 
  amount, 
  description
}: { 
  amount: number; 
  description: string;
}): Promise<FinancialTransaction> => {
  const { data } = await apiClient.post<ApiResponse<FinancialTransaction>>(
    '/accounts/company/income',
    { amount, description }
  );
  
  if (!data.success) {
    throw new Error(data.message || 'Failed to record income');
  }

  return data.data;
};

// --- React Query Hooks ---

/**
 * Get balance for a specific account
 */
export const useGetAccountBalance = (
  accountType: AccountType, 
  accountId: number, 
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: ['account', accountType, accountId, 'balance'],
    queryFn: () => fetchAccountBalance(accountType, accountId),
    enabled: !!accountId && enabled,
    staleTime: 30 * 1000,
  });
};

/**
 * Get transaction history for an account
 */
export const useGetAccountHistory = (
  accountType: AccountType, 
  accountId: number, 
  page: number = 1,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: ['account', accountType, accountId, 'history', page],
    queryFn: () => fetchAccountHistory(accountType, accountId, page),
    enabled: !!accountId && enabled,
    staleTime: 10 * 1000,
  });
};

/**
 * Get transaction history with infinite scroll
 */
export const useGetAccountHistoryInfinite = (
  accountType: AccountType, 
  accountId: number, 
  enabled: boolean = true
) => {
  return useInfiniteQuery({
    queryKey: ['account', accountType, accountId, 'history', 'infinite'],
    queryFn: ({ pageParam }) => fetchPaginatedAccountHistory({ pageParam, accountType, accountId }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.current_page < lastPage.pagination.total_pages) {
        return lastPage.pagination.current_page + 1;
      }
      return undefined;
    },
    enabled: !!accountId && enabled,
    staleTime: 10 * 1000,
  });
};

/**
 * Get account statistics
 */
export const useGetAccountStats = (
  accountType: AccountType, 
  accountId: number, 
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: ['account', accountType, accountId, 'stats'],
    queryFn: () => fetchAccountStats(accountType, accountId),
    enabled: !!accountId && enabled,
    staleTime: 60 * 1000,
  });
};

/**
 * Get transaction summary by type
 */
export const useGetAccountSummary = (
  accountType: AccountType, 
  accountId: number, 
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: ['account', accountType, accountId, 'summary'],
    queryFn: () => fetchAccountSummary(accountType, accountId),
    enabled: !!accountId && enabled,
    staleTime: 60 * 1000,
  });
};

/**
 * Get all account balances
 */
export const useGetAllBalances = (accountType?: AccountType, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['account', 'balances', accountType],
    queryFn: () => fetchAllBalances(accountType),
    enabled,
    staleTime: 30 * 1000,
  });
};

/**
 * Search transactions with filters
 */
export const useSearchTransactions = (filters: TransactionFilters, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['account', 'transactions', filters],
    queryFn: () => searchTransactions(filters),
    enabled,
    staleTime: 30 * 1000,
  });
};

/**
 * Get client balances with pagination
 */
export const useGetClientBalances = (filters: ClientBalancesFilters = {}, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['account', 'clients', 'balances', filters],
    queryFn: () => fetchClientBalances(filters),
    enabled,
    staleTime: 30 * 1000,
  });
};

/**
 * Get client balances with infinite scroll
 */
export const useGetClientBalancesInfinite = (
  filters: Omit<ClientBalancesFilters, 'page'> = {}, 
  enabled: boolean = true
) => {
  return useInfiniteQuery({
    queryKey: ['account', 'clients', 'balances', 'infinite', filters],
    queryFn: ({ pageParam }) => fetchPaginatedClientBalances({ pageParam, filters }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.current_page < lastPage.pagination.total_pages) {
        return lastPage.pagination.current_page + 1;
      }
      return undefined;
    },
    enabled,
    staleTime: 30 * 1000,
  });
};

/**
 * Get total statistics across all clients
 */
export const useGetClientsTotals = (employeeUserId?: number, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['account', 'clients', 'totals', employeeUserId],
    queryFn: () => fetchClientsTotals(employeeUserId),
    enabled,
    staleTime: 60 * 1000,
  });
};

/**
 * Get total unpaid across all clients
 */
export const useGetTotalUnpaid = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['account', 'clients', 'total-unpaid'],
    queryFn: fetchTotalUnpaid,
    enabled,
    staleTime: 60 * 1000,
  });
};

/**
 * Get payment statistics by method
 */
export const useGetPaymentStatsByMethod = (
  dateFrom: string, 
  dateTo: string, 
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: ['account', 'payments', 'stats-by-method', dateFrom, dateTo],
    queryFn: () => fetchPaymentStatsByMethod(dateFrom, dateTo),
    enabled: !!dateFrom && !!dateTo && enabled,
    staleTime: 60 * 1000,
  });
};

/**
 * Get daily payment totals
 */
export const useGetDailyPaymentTotals = (
  dateFrom: string, 
  dateTo: string, 
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: ['account', 'payments', 'daily-totals', dateFrom, dateTo],
    queryFn: () => fetchDailyPaymentTotals(dateFrom, dateTo),
    enabled: !!dateFrom && !!dateTo && enabled,
    staleTime: 60 * 1000,
  });
};

// --- Mutation Hooks ---

/**
 * Verify account balance integrity
 */
export const useVerifyAccountBalance = () => {
  return useMutation({
    mutationFn: ({ accountType, accountId }: { accountType: AccountType; accountId: number }) =>
      verifyAccountBalance(accountType, accountId),
  });
};

/**
 * Recalculate account balance (admin only)
 */
export const useRecalculateAccountBalance = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ accountType, accountId }: { accountType: AccountType; accountId: number }) =>
      recalculateAccountBalance(accountType, accountId),
    onSuccess: (_, { accountType, accountId }) => {
      // Invalidate the specific account's queries
      queryClient.invalidateQueries({ queryKey: ['account', accountType, accountId] });
      queryClient.invalidateQueries({ queryKey: ['account', 'balances'] });
      queryClient.invalidateQueries({ queryKey: ['account', 'clients'] });
    },
  });
};

/**
 * Record employee commission
 */
export const useRecordEmployeeCommission = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: recordEmployeeCommission,
    onSuccess: (_, { employeeId }) => {
      queryClient.invalidateQueries({ queryKey: ['account', 'employee', employeeId] });
      queryClient.invalidateQueries({ queryKey: ['account', 'balances'] });
      queryClient.invalidateQueries({ queryKey: ['employee'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
};

/**
 * Record employee salary (admin only)
 */
export const useRecordEmployeeSalary = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: recordEmployeeSalary,
    onSuccess: (_, { employeeId }) => {
      queryClient.invalidateQueries({ queryKey: ['account', 'employee', employeeId] });
      queryClient.invalidateQueries({ queryKey: ['account', 'balances'] });
      queryClient.invalidateQueries({ queryKey: ['employee'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
};

/**
 * Record company expense (admin only)
 */
export const useRecordCompanyExpense = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: recordCompanyExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account', 'company'] });
      queryClient.invalidateQueries({ queryKey: ['account', 'balances'] });
    },
  });
};

/**
 * Record company income (admin only)
 */
export const useRecordCompanyIncome = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: recordCompanyIncome,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account', 'company'] });
      queryClient.invalidateQueries({ queryKey: ['account', 'balances'] });
    },
  });
};

// --- Query Key Factories ---
// Useful for consistent query key patterns across the app

export const accountKeys = {
  all: ['account'] as const,
  balances: (type?: AccountType) => [...accountKeys.all, 'balances', type] as const,
  account: (type: AccountType, id: number) => [...accountKeys.all, type, id] as const,
  balance: (type: AccountType, id: number) => [...accountKeys.account(type, id), 'balance'] as const,
  history: (type: AccountType, id: number, page?: number) => 
    [...accountKeys.account(type, id), 'history', page] as const,
  historyInfinite: (type: AccountType, id: number) => 
    [...accountKeys.account(type, id), 'history', 'infinite'] as const,
  stats: (type: AccountType, id: number) => [...accountKeys.account(type, id), 'stats'] as const,
  summary: (type: AccountType, id: number) => [...accountKeys.account(type, id), 'summary'] as const,
  transactions: (filters?: TransactionFilters) => [...accountKeys.all, 'transactions', filters] as const,
  clientBalances: (filters?: ClientBalancesFilters) => [...accountKeys.all, 'clients', 'balances', filters] as const,
  clientsTotals: (employeeId?: number) => [...accountKeys.all, 'clients', 'totals', employeeId] as const,
  totalUnpaid: () => [...accountKeys.all, 'clients', 'total-unpaid'] as const,
  paymentStats: (dateFrom: string, dateTo: string) => 
    [...accountKeys.all, 'payments', 'stats-by-method', dateFrom, dateTo] as const,
  dailyTotals: (dateFrom: string, dateTo: string) => 
    [...accountKeys.all, 'payments', 'daily-totals', dateFrom, dateTo] as const,
};
