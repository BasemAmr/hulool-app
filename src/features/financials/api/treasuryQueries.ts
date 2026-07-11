import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import type { ApiResponse, TreasuryCategory, TreasuryAccountPermission, TreasuryAccount, TreasuryCategoryMetadata, TreasuryAccountWithPermission } from '@/api/types';

export type { TreasuryAccount } from '@/api/types';

export interface CreateTreasuryAccountPayload {
  name: string;
  sub_type: string;
  normal_balance?: 'debit' | 'credit';
  metadata?: any;
  coa_section?: string;
}

const invalidateTreasury = (queryClient: any) => {
  queryClient.invalidateQueries({ queryKey: ['treasury-accounts'] });
  queryClient.invalidateQueries({ queryKey: ['treasury-accounts', 'categories'] });
  queryClient.invalidateQueries({ queryKey: ['accounts'] });
  queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  queryClient.invalidateQueries({ queryKey: ['coa-tree'] });
};

/**
 * Fetch all active treasury accounts
 */
export const useGetTreasuryAccounts = () => {
  return useQuery<TreasuryAccount[]>({
    queryKey: ['treasury-accounts'],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<TreasuryAccount[]>>('/treasury-accounts');
      return response.data.data;
    },
    staleTime: 30 * 1000,
  });
};

/**
 * Fetch a single treasury account by ID
 */
export const useGetTreasuryAccount = (id: number) => {
  return useQuery<TreasuryAccount>({
    queryKey: ['treasury-accounts', id],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<TreasuryAccount>>(`/treasury-accounts/${id}`);
      return response.data.data;
    },
    staleTime: 30 * 1000,
    enabled: !!id,
  });
};

/**
 * Fetch category summaries (count + total balance per sub_type)
 */
export const useGetTreasuryCategories = () => {
  return useQuery<TreasuryCategory[]>({
    queryKey: ['treasury-accounts', 'categories'],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<TreasuryCategory[]>>('/treasury-accounts/categories');
      return response.data.data;
    },
    staleTime: 30 * 1000,
  });
};

/**
 * Create a new treasury account
 */
export const useCreateTreasuryAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateTreasuryAccountPayload) => {
      const response = await apiClient.post<ApiResponse<TreasuryAccount>>('/treasury-accounts', payload);
      return response.data.data;
    },
    onSuccess: () => {
      invalidateTreasury(queryClient);
    },
  });
};

/**
 * Update an existing treasury account
 */
export const useUpdateTreasuryAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { name?: string; sub_type?: string; normal_balance?: string } }) => {
      const response = await apiClient.put<ApiResponse<TreasuryAccount>>(`/treasury-accounts/${id}`, data);
      return response.data.data;
    },
    onSuccess: () => {
      invalidateTreasury(queryClient);
    },
  });
};

/**
 * Deactivate a treasury account
 */
export const useDeactivateTreasuryAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.delete<ApiResponse<{ id: number }>>(`/treasury-accounts/${id}`);
      return response.data.data;
    },
    onSuccess: () => {
      invalidateTreasury(queryClient);
    },
  });
};

// ========================================
// TREASURY PERMISSION QUERIES
// ========================================

/**
 * Get permissions for a treasury account
 */
export const useGetTreasuryAccountPermissions = (accountId: number) => {
  return useQuery<TreasuryAccountPermission[]>({
    queryKey: ['treasury-accounts', accountId, 'permissions'],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<TreasuryAccountPermission[]>>(
        `/treasury-accounts/${accountId}/permissions`
      );
      return response.data.data;
    },
    enabled: !!accountId,
    staleTime: 30 * 1000,
  });
};

/**
 * Set (upsert) a permission for a treasury account
 */
export const useSetTreasuryAccountPermission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      accountId,
      data,
    }: {
      accountId: number;
      data: { employee_user_id: number; can_transact?: boolean; can_view?: boolean };
    }) => {
      const response = await apiClient.post<ApiResponse<TreasuryAccountPermission>>(
        `/treasury-accounts/${accountId}/permissions`,
        data
      );
      return response.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['treasury-accounts', variables.accountId, 'permissions'] });
    },
  });
};

/**
 * Remove a permission from a treasury account
 */
export const useRemoveTreasuryAccountPermission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (permissionId: number) => {
      const response = await apiClient.delete<ApiResponse<{ id: number }>>(
        `/treasury-accounts/permissions/${permissionId}`
      );
      return response.data.data;
    },
    onSuccess: () => {
      // Broad invalidation to refresh permission-dependent data
      invalidateTreasury(queryClient);
    },
  });
};

// ========================================
// TREASURY CATEGORY METADATA QUERIES
// ========================================

/**
 * Get all category metadata (for labels, sort order, active status)
 */
export const useGetCategoryMetadata = () => {
  return useQuery<TreasuryCategoryMetadata[]>({
    queryKey: ['treasury-categories'],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<TreasuryCategoryMetadata[]>>('/treasury-categories');
      return response.data.data;
    },
    staleTime: 60 * 1000, // categories change rarely
  });
};

/**
 * Create a new category
 */
export const useCreateTreasuryCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { slug: string; label: string; sort_order?: number; coa_section?: string }) => {
      const response = await apiClient.post<ApiResponse<any>>('/treasury-categories', payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treasury-categories'] });
      queryClient.invalidateQueries({ queryKey: ['treasury-accounts', 'categories'] });
    },
  });
};

/**
 * Update an existing category
 */
export const useUpdateTreasuryCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ slug, data }: { slug: string; data: { label?: string; sort_order?: number; is_active?: boolean } }) => {
      const response = await apiClient.put<ApiResponse<any>>(`/treasury-categories/${slug}`, data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treasury-categories'] });
      queryClient.invalidateQueries({ queryKey: ['treasury-accounts', 'categories'] });
    },
  });
};

/**
 * Delete (soft) a category
 */
export const useDeleteTreasuryCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (slug: string) => {
      const response = await apiClient.delete<ApiResponse<any>>(`/treasury-categories/${slug}`);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treasury-categories'] });
      queryClient.invalidateQueries({ queryKey: ['treasury-accounts', 'categories'] });
    },
  });
};

// ========================================
// EMPLOYEE TREASURY ACCOUNTS (MY PERMISSIONS)
// ========================================

/**
 * Get treasury accounts assigned to the current employee with permission info
 */
export const useGetMyTreasuryAccounts = () => {
  return useQuery<TreasuryAccountWithPermission[]>({
    queryKey: ['treasury-accounts', 'my-permissions'],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<TreasuryAccountWithPermission[]>>('/treasury-accounts/my-permissions');
      return response.data.data;
    },
    staleTime: 30 * 1000,
  });
};
