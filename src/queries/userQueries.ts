import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import  apiClient  from '../api/apiClient';
import type { User, CreateUserRequest, UpdateUserCapabilitiesRequest } from '../api/types';

/**
 * Fetch all users
 */
export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async (): Promise<User[]> => {
      const response = await apiClient.get('/users');
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000, // Keep fresh for 5 minutes
    // refetchOnWindowFocus: false (inherited)
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userData: CreateUserRequest): Promise<User> => {
      const response = await apiClient.post('/users', userData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] }); // Invalidate all users lists
    },
  });
};

export const useUpdateUserCapabilities = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateUserCapabilitiesRequest): Promise<User> => {
      const { userId, capabilities } = data;
      const response = await apiClient.put(`/users/${userId}/capabilities`, { capabilities });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] }); // Invalidate all users lists
      // If the current user's capabilities changed, invalidate their own capabilities too
      queryClient.invalidateQueries({ queryKey: ['current-user-capabilities'] });
    },
  });
};

export const useCurrentUserCapabilities = () => {
  return useQuery({
    queryKey: ['current-user-capabilities'],
    queryFn: async (): Promise<{
      manage_options: boolean;
      tm_manage_users: boolean;
      tm_delete_any_task: boolean;
      tm_delete_any_receivable: boolean;
      tm_delete_any_payment: boolean;
      tm_view_receivables_amounts: boolean;
      tm_view_paid_receivables: boolean;
      tm_view_overdue_receivables: boolean;
      tm_view_all_receivables: boolean;
    }> => {
      const response = await apiClient.get('/users/current/capabilities');
      return response.data.data;
    },
    staleTime: Infinity, // Capabilities are session-bound, no need to refetch unless logout/login or manual invalidate
    refetchOnWindowFocus: false, // Don't refetch on focus
    refetchOnMount: false, // Don't refetch on mount either
  });
};