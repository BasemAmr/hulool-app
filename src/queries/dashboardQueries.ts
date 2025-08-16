import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/apiClient';
import type { ApiResponse, Task } from '../api/types';

// --- Types for dashboard-specific data ---
interface DashboardStats {
  total_clients: number;
  total_tasks: number;
  new_tasks: number;
  deferred_tasks: number;
  completed_tasks: number;
  late_tasks: number; // New field for late tasks (30+ days)
  late_receivables: number; // New field for late receivables (30+ days)
  total_unpaid_amount: number; // Total unpaid amount across all clients
  total_paid_amount: number; // Total paid amount across all clients
  total_amount: number; // Total amount across all clients
}



// --- API Functions ---
const fetchDashboardStats = async (): Promise<DashboardStats> => {
  // This endpoint aggregates stats from clients and tasks
  const { data } = await apiClient.get<ApiResponse<DashboardStats>>('/clients/stats');
  if (!data.success) throw new Error(data.message || 'Failed to fetch dashboard stats.');
  return data.data;
};

const fetchRecentTasks = async (): Promise<Task[]> => {
    // This endpoint gets the latest tasks across all types
    const { data } = await apiClient.get<ApiResponse<Task[]>>('/tasks/recent', { params: { limit: 10 } });
    if (!data.success) throw new Error(data.message || 'Failed to fetch recent tasks.');
    return data.data;
}

const fetchTotalPaidAmount = async (): Promise<number> => {
    // This endpoint gets the total paid amount across all payments
    const { data } = await apiClient.get<ApiResponse<{ total_paid: number }>>('/payments/total-paid');
    if (!data.success) throw new Error(data.message || 'Failed to fetch total paid amount.');
    return data.data.total_paid;
}

// --- React Query Hooks ---

export const useGetDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: fetchDashboardStats,
    staleTime: 30 * 1000, // Keep fresh for 30 seconds
    // refetchOnWindowFocus: false (inherited)
  });
};

export const useGetRecentTasks = () => {
    return useQuery({
        queryKey: ['dashboard', 'recentTasks'],
        queryFn: fetchRecentTasks,
        staleTime: 30 * 1000, // Keep fresh for 30 seconds
        // refetchOnWindowFocus: false (inherited)
    });
};

export const useGetTotalPaidAmount = () => {
    return useQuery({
        queryKey: ['dashboard', 'totalPaidAmount'],
        queryFn: fetchTotalPaidAmount,
        staleTime: 30 * 1000, // Keep fresh for 30 seconds
        // refetchOnWindowFocus: false (inherited)
    });
};