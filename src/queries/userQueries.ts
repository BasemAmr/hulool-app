import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/apiClient';
import type {
  User,
  CreateUserRequest,
  UpdateUserCapabilitiesRequest,
  CreateEmployeeAccountRequest,
  UpdateUserProfileRequest,
  EmployeeCredentials,
  EmployeeAccount
} from '../api/types';

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

      // Employee-related invalidations
      queryClient.invalidateQueries({ queryKey: ['employee'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
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

      // Employee-related invalidations
      queryClient.invalidateQueries({ queryKey: ['employee'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
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

/**
 * NEW: For admin to reset another user's password
 */
const setEmployeePassword = async ({ userId, new_password }: { userId: number; new_password: string }) => {
  const { data } = await apiClient.post(`/users/${userId}/set-password`, { new_password });
  return data;
};

/**
 * NEW: For an employee to change their own password
 */
const setMyPassword = async ({ current_password, new_password }: { current_password: string; new_password: string }) => {
  const { data } = await apiClient.post(`/users/me/set-password`, { current_password, new_password });
  return data;
};

/**
 * NEW: Update own profile (username and display_name)
 */
const updateMyProfile = async ({ username, display_name }: { username?: string; display_name?: string }) => {
  const { data } = await apiClient.put('/users/me/profile', { username, display_name });
  return data;
};

/**
 * NEW: Request password reset email
 */
const requestPasswordReset = async ({ username }: { username: string }) => {
  const { data } = await apiClient.post('/auth/request-password-reset', { username });
  return data;
};

/**
 * NEW: Confirm password reset with token
 */
const confirmPasswordReset = async ({ token, new_password }: { token: string; new_password: string }) => {
  const { data } = await apiClient.post('/auth/confirm-password-reset', { token, new_password });
  return data;
};

/**
 * NEW: Forgot password - reset password without authentication
 */
const resetPasswordForgot = async ({ username, new_password }: { username: string; new_password: string }) => {
  const { data } = await apiClient.post(`/auth/reset-password`, { username, new_password });
  return data;
};

export const useSetEmployeePassword = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setEmployeePassword,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const useSetMyPassword = () => {
  return useMutation({ mutationFn: setMyPassword });
};

export const useUpdateMyProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateMyProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
    },
  });
};

export const useRequestPasswordReset = () => {
  return useMutation({ mutationFn: requestPasswordReset });
};

export const useConfirmPasswordReset = () => {
  return useMutation({ mutationFn: confirmPasswordReset });
};

export const useResetPasswordForgot = () => {
  return useMutation({ mutationFn: resetPasswordForgot });
};

// ========================================
// EMPLOYEE ACCOUNT MANAGEMENT HOOKS
// ========================================

/**
 * Create a new employee account with auto-generated credentials
 */
export const useCreateEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (employeeData: CreateEmployeeAccountRequest): Promise<EmployeeCredentials> => {
      const response = await apiClient.post('/users/employee', employeeData);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
};

/**
 * Update user profile (username and display_name)
 */
export const useUpdateUserProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateUserProfileRequest): Promise<User> => {
      const { userId, ...updateData } = data;
      const response = await apiClient.put(`/users/${userId}`, updateData);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
};

/**
 * Delete/deactivate an employee
 */
export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId }: { userId: number }): Promise<void> => {
      await apiClient.delete(`/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
};

/**
 * Fetch all employees with WordPress user data
 * Returns employee accounts for settings/account management
 */
export const useEmployeesList = () => {
  return useQuery({
    queryKey: ['employees'],
    queryFn: async (): Promise<EmployeeAccount[]> => {
      const response = await apiClient.get('/users/employees');
      return response.data.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

