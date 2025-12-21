import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/apiClient';
import type {
  ApiResponse,
  UpdateTransactionPayload,
  TransactionValidationResult,
  CascadeResult
} from '../api/types';

// --- Transaction Hooks ---

export const useGetTransaction = (id: number) => {
  return useQuery({
    queryKey: ['transaction', id],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<any>>(`/transactions/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
};

export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: UpdateTransactionPayload }) => {
      const { data } = await apiClient.put<ApiResponse<any>>(`/transactions/${id}`, payload);
      return data.data;
    },
    onSuccess: (data) => {
      // Handle both old and new response formats
      const transactionId = data?.transaction_id || data?.transaction?.id || data?.id;
      const mainTransaction = data?.original?.main || data?.transaction;

      // Core transaction invalidations
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      if (transactionId) {
        queryClient.invalidateQueries({ queryKey: ['transaction', transactionId] });
      }

      // Invalidate accounts affected by recalculation
      if (data?.recalc_results) {
        Object.keys(data.recalc_results).forEach((key) => {
          const match = key.match(/^(\w+)_(\d+)$/);
          if (match) {
            const [, accountType, accountId] = match;
            queryClient.invalidateQueries({ queryKey: ['account', accountType, accountId] });
          }
        });
      }

      // Step 15: Enhanced query invalidation
      // Invalidate all account-related queries
      queryClient.invalidateQueries({ queryKey: ['account'] });

      // Invalidate related entities
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });

      // Summary/Dashboard data
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['employee'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });

      // Specific refetch for active views
      queryClient.refetchQueries({ queryKey: ['account'], type: 'active' });
    },
  });
};

export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const { data } = await apiClient.delete<ApiResponse<any>>(`/transactions/${id}`, {
        data: { reason }
      });
      return data.data;
    },
    onSuccess: () => {
      // Step 15: Comprehensive invalidation for transaction delete
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['account'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['employee'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });

      // Refetch active views
      queryClient.refetchQueries({ queryKey: ['account'], type: 'active' });
    },
  });
};

export const useValidateTransactionEdit = () => {
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: Partial<UpdateTransactionPayload> }) => {
      const { data } = await apiClient.post<ApiResponse<TransactionValidationResult>>(`/transactions/${id}/validate`, payload);
      return data.data;
    },
  });
};

export const useCascadeTaskAmount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: { new_amount: number; reason?: string } }) => {
      const { data } = await apiClient.post<ApiResponse<CascadeResult>>(`/cascade/task/${id}/amount`, payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['account'] });
    },
  });
};

export const useCascadeTaskPrepaid = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: { new_prepaid: number; reason?: string } }) => {
      const { data } = await apiClient.post<ApiResponse<CascadeResult>>(`/cascade/task/${id}/prepaid`, payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['account'] });
    },
  });
};

export const useCascadeInvoiceAmount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: { new_amount: number; reason?: string } }) => {
      const { data } = await apiClient.post<ApiResponse<CascadeResult>>(`/cascade/invoice/${id}/amount`, payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['account'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
};

export const useRecalculateBalance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ type, id, from_date }: { type: string; id: number; from_date?: string }) => {
      const { data } = await apiClient.post<ApiResponse<any>>(`/transactions/recalculate/${type}/${id}`, { from_date });
      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['account', variables.type, variables.id] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
};

export const useGetTransactionHistory = (id: number) => {
  return useQuery({
    queryKey: ['transaction', id, 'history'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<any>>(`/transactions/${id}/history`);
      return data.data;
    },
    enabled: !!id,
  });
};
