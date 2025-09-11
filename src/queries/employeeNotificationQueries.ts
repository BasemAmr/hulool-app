import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/apiClient';

// Type definitions
export interface EmployeeNotification {
  id: number;
  task_id: number;
  task_name: string;
  client_name: string;
  content: string;
  event_type: string;
  event_id: number | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

export interface EmployeeNotificationsResponse {
  success: boolean;
  data: {
    notifications: EmployeeNotification[];
    pagination: {
      current_page: number;
      per_page: number;
      total_items: number;
      total_pages: number;
      has_more: boolean;
    };
  };
}

// Queries
export const useGetEmployeeNotificationsInfinite = () => {
  return useInfiniteQuery({
    queryKey: ['employee-notifications'],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await apiClient.get<EmployeeNotificationsResponse>(
        `/notifications?page=${pageParam}&per_page=20`
      );
      return response.data;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.data.pagination.has_more) {
        return lastPage.data.pagination.current_page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });
};

// Mark notification as read mutation
export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await apiClient.patch(`/employees/me/notifications/${notificationId}/read`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-notifications'] });
    },
  });
};

// Mark all notifications as read mutation
export const useMarkAllNotificationsAsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.patch('/employees/me/notifications/read-all');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-notifications'] });
    },
  });
};
