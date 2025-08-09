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
  });
};

/**
 * Create a new user
 */
export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userData: CreateUserRequest): Promise<User> => {
      const response = await apiClient.post('/users', userData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

/**
 * Update user capabilities
 */
export const useUpdateUserCapabilities = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateUserCapabilitiesRequest): Promise<User> => {
      const { userId, capabilities } = data;
      const response = await apiClient.put(`/users/${userId}/capabilities`, { capabilities });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

/**
 * Get current user capabilities
 */
export const useCurrentUserCapabilities = () => {
  return useQuery({
    queryKey: ['current-user-capabilities'],
    queryFn: async (): Promise<{ tm_manage_users: boolean; tm_delete_any_task: boolean; tm_delete_any_receivable: boolean; tm_delete_any_payment: boolean }> => {
      const response = await apiClient.get('/users/current/capabilities');
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
