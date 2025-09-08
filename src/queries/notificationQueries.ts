import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import  apiClient  from '../api/apiClient';

// Types
export interface Notification {
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

export interface NotificationPaginatedData {
  notifications: Notification[];
  pagination: {
    current_page: number;
    per_page: number;
    total_items: number;
    total_pages: number;
    has_more: boolean;
  };
}

export interface NotificationCountData {
  count: number;
}

// API Functions
export const getUnreadNotificationCount = async (): Promise<NotificationCountData> => {
  const response = await apiClient.get('/notifications/unread-count');
  return response.data.data; // Strip the wrapper like other API calls
};

export const getNotifications = async ({ pageParam = 1 }): Promise<NotificationPaginatedData> => {
  const response = await apiClient.get(`/notifications?page=${pageParam}&per_page=20`);
  return response.data.data;
};

export const markNotificationAsRead = async (notificationId: number): Promise<{ message: string }> => {
  const response = await apiClient.post(`/notifications/${notificationId}/mark-read`);
  return response.data.data;
};

export const markAllNotificationsAsRead = async (): Promise<{ message: string }> => {
  const response = await apiClient.post('/notifications/mark-all-read');
  return response.data.data;
};

// React Query Hooks

/**
 * Hook to get unread notification count with polling
 * Polls every 20 seconds with exponential backoff on errors
 */
export const useGetUnreadNotificationCount = () => {
  return useQuery({
    queryKey: ['notificationCount'],
    queryFn: getUnreadNotificationCount,
    refetchInterval: (query) => {
      // Exponential backoff on error: 20s -> 40s -> 60s -> 60s...
      if (query.state.error) {
        const failureCount = query.state.fetchFailureCount || 0;
        return Math.min(20000 * Math.pow(2, failureCount), 60000);
      }
      return 20000; // 20 seconds
    },
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 15000, // Consider data stale after 15 seconds
    retry: (failureCount, error: any) => {
      // Stop retrying after 3 attempts or on 4xx errors
      if (failureCount >= 3) return false;
      if (error?.response?.status >= 400 && error?.response?.status < 500) return false;
      return true;
    },
  });
};

/**
 * Hook to get paginated notifications with infinite scroll
 */
export const useGetNotifications = () => {
  return useInfiniteQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (!lastPage?.pagination) {
        return undefined;
      }
      const { current_page, has_more } = lastPage.pagination;
      return has_more ? current_page + 1 : undefined;
    },
    staleTime: 30000, // Consider data stale after 30 seconds
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook to mark a single notification as read
 */
export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markNotificationAsRead,
    onMutate: async (notificationId: number) => {
      // Cancel any outgoing refetches for notifications
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      await queryClient.cancelQueries({ queryKey: ['notificationCount'] });

      // Snapshot the previous values
      const previousNotifications = queryClient.getQueryData(['notifications']);
      const previousCount = queryClient.getQueryData(['notificationCount']);

      // Optimistically update notifications
      queryClient.setQueryData(['notifications'], (old: any) => {
        if (!old) return old;

        return {
          ...old,
          pages: old.pages.map((page: NotificationPaginatedData) => ({
            ...page,
            notifications: page.notifications.map((notification: Notification) =>
              notification.id === notificationId
                ? { ...notification, is_read: true, read_at: new Date().toISOString() }
                : notification
            ),
          })),
        };
      });

      // Optimistically update count
      queryClient.setQueryData(['notificationCount'], (old: NotificationCountData | undefined) => {
        if (!old) return old;
        return { count: Math.max(0, old.count - 1) };
      });

      return { previousNotifications, previousCount };
    },
    onError: (_err, _notificationId, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousNotifications) {
        queryClient.setQueryData(['notifications'], context.previousNotifications);
      }
      if (context?.previousCount) {
        queryClient.setQueryData(['notificationCount'], context.previousCount);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have correct data
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notificationCount'] });
    },
  });
};

/**
 * Hook to mark all notifications as read
 */
export const useMarkAllNotificationsAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsAsRead,
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      await queryClient.cancelQueries({ queryKey: ['notificationCount'] });

      // Snapshot the previous values
      const previousNotifications = queryClient.getQueryData(['notifications']);
      const previousCount = queryClient.getQueryData(['notificationCount']);

      // Optimistically update all notifications as read
      queryClient.setQueryData(['notifications'], (old: any) => {
        if (!old) return old;

        return {
          ...old,
          pages: old.pages.map((page: NotificationPaginatedData) => ({
            ...page,
            notifications: page.notifications.map((notification: Notification) => ({
              ...notification,
              is_read: true,
              read_at: notification.read_at || new Date().toISOString(),
            })),
          })),
        };
      });

      // Optimistically update count to 0
      queryClient.setQueryData(['notificationCount'], { count: 0 });

      return { previousNotifications, previousCount };
    },
    onError: (_err, _variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousNotifications) {
        queryClient.setQueryData(['notifications'], context.previousNotifications);
      }
      if (context?.previousCount) {
        queryClient.setQueryData(['notificationCount'], context.previousCount);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notificationCount'] });
    },
  });
};
