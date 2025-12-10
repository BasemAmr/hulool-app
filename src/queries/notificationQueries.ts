import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/apiClient';

// Types - New grouped notification structure

export type NotificationGroup = 'task_submissions' | 'messages' | 'task_approvals' | 'task_rejections' | 'assignments';

export interface GroupedNotification {
  id: number;
  event_type: string;
  title: string;
  message: string;
  related_entity_type: string;
  related_entity_id: number;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

export interface NotificationGroupData {
  notifications: GroupedNotification[];
  unread_count: number;
  total_count: number;
}

export interface GroupedNotificationsResponse {
  groups: Record<NotificationGroup, NotificationGroupData>;
  total_unread: number;
  group_labels: Record<NotificationGroup, string>;
}

export interface NotificationCountData {
  count: number;
}

// ============================================
// API Functions
// ============================================

/**
 * Get notifications grouped by type
 */
export const getGroupedNotifications = async (): Promise<GroupedNotificationsResponse> => {
  const response = await apiClient.get('/notifications/grouped');
  return response.data.data;
};

/**
 * Get unread notification count
 */
export const getUnreadNotificationCount = async (): Promise<NotificationCountData> => {
  const response = await apiClient.get('/notifications/unread-count');
  return response.data.data;
};

/**
 * Mark a single notification as read
 */
export const markNotificationAsRead = async (notificationId: number): Promise<{ message: string }> => {
  const response = await apiClient.post(`/notifications/${notificationId}/mark-read`);
  return response.data.data;
};

/**
 * Mark all notifications in a group as read
 */
export const markGroupAsRead = async (group: NotificationGroup): Promise<{ message: string; marked_count: number }> => {
  const response = await apiClient.post(`/notifications/group/${group}/mark-read`);
  return response.data.data;
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = async (): Promise<{ message: string }> => {
  const response = await apiClient.post('/notifications/mark-all-read');
  return response.data.data;
};

// ============================================
// React Query Hooks
// ============================================

/**
 * Hook to get grouped notifications
 */
export const useGetGroupedNotifications = () => {
  return useQuery({
    queryKey: ['groupedNotifications'],
    queryFn: getGroupedNotifications,
    staleTime: 15000,
    refetchInterval: 30000, // Poll every 30 seconds
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook to get unread notification count with polling
 */
export const useGetUnreadNotificationCount = () => {
  return useQuery({
    queryKey: ['notificationCount'],
    queryFn: getUnreadNotificationCount,
    refetchInterval: (query) => {
      if (query.state.error) {
        const failureCount = query.state.fetchFailureCount || 0;
        return Math.min(20000 * Math.pow(2, failureCount), 60000);
      }
      return 20000;
    },
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 15000,
    retry: (failureCount, error: unknown) => {
      if (failureCount >= 3) return false;
      const err = error as { response?: { status?: number } };
      if (err?.response?.status && err.response.status >= 400 && err.response.status < 500) return false;
      return true;
    },
  });
};

/**
 * Hook to mark a single notification as read
 */
export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groupedNotifications'] });
      queryClient.invalidateQueries({ queryKey: ['notificationCount'] });
    },
  });
};

/**
 * Hook to mark all notifications in a group as read
 */
export const useMarkGroupAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markGroupAsRead,
    onMutate: async (group: NotificationGroup) => {
      await queryClient.cancelQueries({ queryKey: ['groupedNotifications'] });
      await queryClient.cancelQueries({ queryKey: ['notificationCount'] });

      const previousData = queryClient.getQueryData<GroupedNotificationsResponse>(['groupedNotifications']);
      const previousCount = queryClient.getQueryData<NotificationCountData>(['notificationCount']);

      // Optimistically update
      if (previousData) {
        const groupUnreadCount = previousData.groups[group]?.unread_count || 0;
        queryClient.setQueryData<GroupedNotificationsResponse>(['groupedNotifications'], {
          ...previousData,
          groups: {
            ...previousData.groups,
            [group]: {
              ...previousData.groups[group],
              notifications: previousData.groups[group].notifications.map(n => ({
                ...n,
                is_read: true,
                read_at: n.read_at || new Date().toISOString()
              })),
              unread_count: 0
            }
          },
          total_unread: previousData.total_unread - groupUnreadCount
        });

        queryClient.setQueryData<NotificationCountData>(['notificationCount'], {
          count: Math.max(0, (previousCount?.count || 0) - groupUnreadCount)
        });
      }

      return { previousData, previousCount };
    },
    onError: (_err, _group, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['groupedNotifications'], context.previousData);
      }
      if (context?.previousCount) {
        queryClient.setQueryData(['notificationCount'], context.previousCount);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['groupedNotifications'] });
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
      await queryClient.cancelQueries({ queryKey: ['groupedNotifications'] });
      await queryClient.cancelQueries({ queryKey: ['notificationCount'] });

      const previousData = queryClient.getQueryData<GroupedNotificationsResponse>(['groupedNotifications']);
      const previousCount = queryClient.getQueryData<NotificationCountData>(['notificationCount']);

      // Optimistically mark all as read
      if (previousData) {
        const updatedGroups = Object.fromEntries(
          Object.entries(previousData.groups).map(([key, group]) => [
            key,
            {
              ...group,
              notifications: group.notifications.map(n => ({
                ...n,
                is_read: true,
                read_at: n.read_at || new Date().toISOString()
              })),
              unread_count: 0
            }
          ])
        ) as Record<NotificationGroup, NotificationGroupData>;

        queryClient.setQueryData<GroupedNotificationsResponse>(['groupedNotifications'], {
          ...previousData,
          groups: updatedGroups,
          total_unread: 0
        });
      }

      queryClient.setQueryData<NotificationCountData>(['notificationCount'], { count: 0 });

      return { previousData, previousCount };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['groupedNotifications'], context.previousData);
      }
      if (context?.previousCount) {
        queryClient.setQueryData(['notificationCount'], context.previousCount);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['groupedNotifications'] });
      queryClient.invalidateQueries({ queryKey: ['notificationCount'] });
    },
  });
};
