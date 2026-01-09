/**
 * Financial Center Queries
 * 
 * Queries and mutations for the Financial Center admin pages:
 * - Accounts Overview
 * - Pending Approvals
 * - Manual Transactions
 * - Invoice Aging Analysis
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/apiClient';
import type {
  ApiResponse,
  PendingItem,
  PendingItemsResponse,
  PendingItemsSummary,
  CreatePendingItemPayload,
  UnifiedAccountsResponse,
  CreateManualTransactionPayload,
  InvoiceAgingAnalysis,
  PendingItemType,
  PendingItemStatus,
} from '../api/types';

// ========================================
// PENDING ITEMS QUERIES
// ========================================

/**
 * Fetch pending items with optional filters
 */
export const useGetPendingItems = (filters?: {
  type?: PendingItemType;
  status?: PendingItemStatus;
  account_type?: string;
  account_id?: number;
}) => {
  return useQuery({
    queryKey: ['pending-items', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.type) params.append('type', filters.type);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.account_type) params.append('account_type', filters.account_type);
      if (filters?.account_id) params.append('account_id', String(filters.account_id));

      const { data } = await apiClient.get<PendingItemsResponse>(
        `/pending-items${params.toString() ? `?${params.toString()}` : ''}`
      );
      return data;
    },
  });
};

/**
 * Fetch pending items summary (counts by status and type)
 */
export const useGetPendingItemsSummary = () => {
  return useQuery({
    queryKey: ['pending-items', 'summary'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<PendingItemsSummary>>(
        '/pending-items/summary'
      );
      return data.data;
    },
  });
};

/**
 * Fetch pending items for current employee
 */
export const useGetMyPendingItems = () => {
  return useQuery({
    queryKey: ['pending-items', 'me'],
    queryFn: async () => {
      const { data } = await apiClient.get<PendingItemsResponse>(
        '/pending-items/employee/me'
      );
      return data;
    },
  });
};

/**
 * Create a new pending item
 */
export const useCreatePendingItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreatePendingItemPayload) => {
      const { data } = await apiClient.post<ApiResponse<PendingItem>>(
        '/pending-items',
        payload
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-items'] });
    },
  });
};

/**
 * Approve a pending item
 */
export const useApprovePendingItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, finalAmount }: { id: number; finalAmount?: number }) => {
      const { data } = await apiClient.post<ApiResponse<PendingItem>>(
        `/pending-items/${id}/approve`,
        finalAmount !== undefined ? { final_amount: finalAmount } : {}
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-items'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
};

/**
 * Reject a pending item
 */
export const useRejectPendingItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason?: string }) => {
      const { data } = await apiClient.post<ApiResponse<PendingItem>>(
        `/pending-items/${id}/reject`,
        reason ? { reason } : {}
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-items'] });
    },
  });
};

/**
 * Bulk approve pending items
 */
export const useBulkApprovePendingItems = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: number[]) => {
      const { data } = await apiClient.post<ApiResponse<{ approved: number; failed: number }>>(
        '/pending-items/bulk-approve',
        { ids }
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-items'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
};

// ========================================
// UNIFIED ACCOUNTS QUERIES
// ========================================

/**
 * Fetch accounts by type (employee, company, or client)
 * Optimized for dropdowns - doesn't fetch ALL accounts
 */
export const useGetAccountsByType = (
  type: 'employee' | 'company' | 'client',
  filters?: {
    search?: string;
    page?: number;
    per_page?: number;
  },
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: ['accounts', 'by-type', type, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('type', type);
      if (filters?.search) params.append('search', filters.search);
      if (filters?.page) params.append('page', String(filters.page));
      if (filters?.per_page) params.append('per_page', String(filters.per_page));

      const { data } = await apiClient.get<UnifiedAccountsResponse>(
        `/accounts?${params.toString()}`
      );
      return data;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Fetch unified accounts list with summary and pagination
 */
export const useGetUnifiedAccounts = (filters?: {
  type?: string;
  search?: string;
  page?: number;
  per_page?: number;
}) => {
  return useQuery({
    queryKey: ['accounts', 'unified', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.type) params.append('type', filters.type);
      if (filters?.search) params.append('search', filters.search);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.per_page) params.append('per_page', filters.per_page.toString());

      const { data } = await apiClient.get<UnifiedAccountsResponse>(
        `/accounts${params.toString() ? `?${params.toString()}` : ''}`
      );
      return data;
    },
  });
};

// ========================================
// MANUAL TRANSACTION MUTATIONS
// ========================================

/**
 * Create a manual transaction (adjustment or transfer)
 */
export const useCreateManualTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateManualTransactionPayload) => {
      const { data } = await apiClient.post<ApiResponse<any>>(
        '/accounts/transactions',
        payload
      );
      return data.data;
    },
    onSuccess: () => {
      // Invalidate all account-related queries
      queryClient.invalidateQueries({ queryKey: ['account'] }); // ← CRITICAL: AccountLedgerTable uses ['account', 'client', id, 'history']
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

// ========================================
// INVOICE AGING QUERIES
// ========================================

/**
 * Fetch invoice aging analysis
 */
export const useGetInvoiceAgingAnalysis = (filters?: {
  start_date?: string;
  end_date?: string;
  client_id?: number;
}) => {
  return useQuery({
    queryKey: ['invoices', 'aging-analysis', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.start_date) params.append('start_date', filters.start_date);
      if (filters?.end_date) params.append('end_date', filters.end_date);
      if (filters?.client_id) params.append('client_id', String(filters.client_id));

      const { data } = await apiClient.get<ApiResponse<InvoiceAgingAnalysis>>(
        `/invoices/aging-analysis${params.toString() ? `?${params.toString()}` : ''}`
      );
      return data.data;
    },
  });
};
