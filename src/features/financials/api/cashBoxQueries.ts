import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import type { CashBox, CashBoxVoucher, CashBoxVoucherPayload, ApiResponse } from '@/api/types';

/**
 * Fetch all cash boxes (Admin gets all, Employee gets their assigned box)
 */
export const useGetCashBoxes = () => {
  return useQuery<CashBox[]>({
    queryKey: ['cash-boxes'],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<CashBox[]>>('/cash-boxes');
      return response.data.data;
    },
    staleTime: 30 * 1000, // 30 seconds
  });
};

/**
 * Fetch a single cash box by ID
 */
export const useGetCashBox = (id: number) => {
  return useQuery<CashBox>({
    queryKey: ['cash-boxes', id],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<CashBox>>(`/cash-boxes/${id}`);
      return response.data.data;
    },
    staleTime: 30 * 1000,
    enabled: !!id,
  });
};

/**
 * Fetch vouchers (statement) for a specific cash box
 */
export const useGetCashBoxVouchers = (id: number) => {
  return useQuery<CashBoxVoucher[]>({
    queryKey: ['cash-boxes', id, 'vouchers'],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<CashBoxVoucher[]>>(`/cash-boxes/${id}/vouchers`);
      return response.data.data;
    },
    staleTime: 10 * 1000,
    enabled: !!id,
  });
};

/**
 * Fetch available voucher categories (recent categories used)
 */
export const useRecentCashBoxCategories = () => {
  return useQuery<string[]>({
    queryKey: ['cash-box-categories'],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<string[]>>('/cash-boxes/categories');
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Helper to invalidate all financial queries
 */
const invalidateFinancials = (queryClient: any) => {
  queryClient.invalidateQueries({ queryKey: ['cash-boxes'] });
  queryClient.invalidateQueries({ queryKey: ['accounts'] });
  queryClient.invalidateQueries({ queryKey: ['account'] });
  queryClient.invalidateQueries({ queryKey: ['dashboard'] });
};

/**
 * Record a receipt or payment voucher in a specific cash box
 */
export const useRecordVoucher = (boxId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CashBoxVoucherPayload) => {
      const response = await apiClient.post(`/cash-boxes/${boxId}/vouchers`, payload);
      return response.data;
    },
    onSuccess: () => {
      invalidateFinancials(queryClient);
    },
  });
};

/**
 * Update an existing cash box voucher
 */
export const useUpdateVoucher = (boxId: number, voucherId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Partial<CashBoxVoucherPayload>) => {
      const response = await apiClient.put(`/cash-boxes/${boxId}/vouchers/${voucherId}`, payload);
      return response.data;
    },
    onSuccess: () => {
      invalidateFinancials(queryClient);
    },
  });
};

/**
 * Void a voucher (soft-delete)
 */
export const useVoidVoucher = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (voucherId: number) => {
      const response = await apiClient.delete(`/cash-boxes/vouchers/${voucherId}`);
      return response.data;
    },
    onSuccess: () => {
      invalidateFinancials(queryClient);
    },
  });
};

/**
 * Create a new cash box (includes opening balance)
 */
export const useCreateCashBox = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { name: string; employee_id: number; opening_balance?: number }) => {
      const { data } = await apiClient.post<ApiResponse<CashBox>>('/cash-boxes', payload);
      return data.data;
    },
    onSuccess: () => {
      invalidateFinancials(queryClient);
    },
  });
};

/**
 * Close a cash box
 */
export const useCloseCashBox = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (boxId: number) => {
      const response = await apiClient.post(`/cash-boxes/${boxId}/close`);
      return response.data;
    },
    onSuccess: () => {
      invalidateFinancials(queryClient);
    },
  });
};

/**
 * Fetch all cash boxes export data (Admin only)
 */
export const getCashBoxesExport = async (startDate?: string, endDate?: string) => {
  const params: any = {};
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  const response = await apiClient.get<ApiResponse<any[]>>('/cash-boxes/export', { params });
  return response.data.data;
};

/**
 * Fetch single cash box export data
 */
export const getSingleCashBoxExport = async (id: number, startDate?: string, endDate?: string) => {
  const params: any = {};
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  const response = await apiClient.get<ApiResponse<any[]>>(`/cash-boxes/${id}/export`, { params });
  return response.data.data;
};