import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient, { publicApiClient } from '@/api/client';
import type {
  User,
  CreateUserRequest,
  UpdateUserCapabilitiesRequest,
  CreateEmployeeAccountRequest,
  UpdateUserProfileRequest,
  EmployeeCredentials,
  EmployeeAccount,
  RecoveryCodesResponse,
  AdminResetPasswordResponse,
  SetupPinPayload,
  RecoverPasswordPayload,
} from '@/api/types';

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
  const { data } = await publicApiClient.post('/auth/request-password-reset', { username });
  return data;
};

/**
 * NEW: Confirm password reset with token
 */
const confirmPasswordReset = async ({ token }: { token: string }) => {
  const { data } = await publicApiClient.post('/auth/confirm-password-reset', { token });
  return data;
};

/** Apply new password using email reset token */
const resetPasswordForgot = async ({ token, new_password }: { token: string; new_password: string }) => {
  const { data } = await publicApiClient.post(`/auth/reset-password`, { token, new_password });
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
      queryClient.invalidateQueries({ queryKey: ['employee-accounts'] });
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
      queryClient.invalidateQueries({ queryKey: ['employee-accounts'] });
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
      queryClient.invalidateQueries({ queryKey: ['employee-accounts'] });
    },
  });
};

/**
 * Fetch all employees with WordPress user data
 * Returns employee accounts for settings/account management
 */
export const useEmployeesList = () => {
  return useQuery({
    queryKey: ['employee-accounts'],
    queryFn: async (): Promise<EmployeeAccount[]> => {
      const response = await apiClient.get('/users/employees');
      return response.data.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Fetch a single employee account by ID
 */
export const useEmployeeAccount = (id: number) => {
  return useQuery({
    queryKey: ['employee-accounts', id],
    queryFn: async (): Promise<EmployeeAccount> => {
      const response = await apiClient.get(`/users/${id}`);
      return response.data.data;
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * Regenerate recovery codes for an employee
 */
export const useRegenerateCodes = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId }: { userId: number }): Promise<RecoveryCodesResponse> => {
      const response = await apiClient.post(`/users/${userId}/regenerate-codes`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-accounts'] });
    },
  });
};

/**
 * Admin reset password for an employee (generates new recovery codes)
 */
export const useAdminResetPassword = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, password }: { userId: number; password: string }): Promise<AdminResetPasswordResponse> => {
      const response = await apiClient.post(`/users/${userId}/admin-reset-password`, { new_password: password });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-accounts'] });
    },
  });
};

/**
 * Setup PIN for the current user
 */
export const useSetupPin = () => {
  return useMutation({
    mutationFn: async (data: SetupPinPayload) => {
      const response = await apiClient.post('/auth/setup-pin', data);
      return response.data;
    },
  });
};

/**
 * Verify phone number to initiate password recovery (public endpoint, no auth needed)
 */
export const useVerifyPhone = () => {
  return useMutation({
    mutationFn: async (data: { phone: string }) => {
      const response = await publicApiClient.post('/auth/verify-phone', data);
      return response.data;
    },
  });
};

/**
 * Recover password using recovery code (public endpoint, no auth needed)
 */
export const useRecoverPassword = () => {
  return useMutation({
    mutationFn: async (data: RecoverPasswordPayload) => {
      const response = await publicApiClient.post('/auth/recover-password', data);
      return response.data;
    },
  });
};

