// Employee Management Queries - Temporary Page
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/apiClient';
import type { Task, Client } from '../api/types';

export interface ClientWithTasksAndStats {
  client: Client;
  tasks: Task[];
}

export interface EmployeeTasksFilters {
  page?: number;
  per_page?: number;
  status?: string; // Comma-separated statuses
  type?: string;
  date_from?: string;
  date_to?: string;
}

// Get employee dashboard clients with active tasks (Admin view)
export const useGetAdminEmployeeDashboardClients = (employeeId: number) => {
  return useQuery<ClientWithTasksAndStats[]>({
    queryKey: ['dashboard', 'admin', 'employee', employeeId, 'clientsWithActiveTasks'],
    queryFn: async () => {
      const response = await apiClient.get(`/dashboard/admin/employee/${employeeId}/clients-with-active-tasks`);
      // Handle WordPress API response structure: {success: true, data: [...]}
      return response.data?.data || response.data || [];
    },
    enabled: !!employeeId
  });
};

// Get employee tasks with filters (Admin view)
export const useGetAdminEmployeeTasks = (employeeId: number, filters: EmployeeTasksFilters = {}) => {
  return useQuery({
    queryKey: ['tasks', 'admin', 'employee', employeeId, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.per_page) params.append('per_page', filters.per_page.toString());
      if (filters.status) params.append('status', filters.status);
      if (filters.type) params.append('type', filters.type);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      
      const response = await apiClient.get(`/tasks/employee/${employeeId}?${params.toString()}`);
      // Handle WordPress API response structure: {success: true, data: {tasks: [...], pagination: {...}}}
      return response.data?.data || response.data || { tasks: [], pagination: {} };
    },
    enabled: !!employeeId
  });
};

// Submit task for review (Admin can use this)
export const useAdminSubmitTaskForReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: number) => {
      // Use admin endpoint to bypass permission check
      const response = await apiClient.post(`/tasks/admin/${taskId}/submit-for-review`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      // Also invalidate employee transactions so the pending commission shows up immediately
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    }
  });
};

// Approve task (Admin only)
export const useAdminApproveTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: number; expense_amount: number; notes?: string }) => {
      const response = await apiClient.post(`/tasks/${data.id}/approve`, {
        expense_amount: data.expense_amount,
        notes: data.notes
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });
};

// Reject task (Admin only)
export const useAdminRejectTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: number; rejection_reason: string }) => {
      const response = await apiClient.post(`/tasks/${data.id}/reject`, {
        rejection_reason: data.rejection_reason
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });
};
