import React from 'react';
import { Check, CheckCheck, X, Inbox } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import {
  useGetGroupedNotifications,
  useMarkNotificationAsRead,
  useMarkGroupAsRead,
  useMarkAllNotificationsAsRead,
  type NotificationGroup,
  type GroupedNotification,
} from '../../queries/notificationQueries';
import { useToast } from '../../hooks/useToast';

interface NotificationDropdownProps {
  onNotificationClick: (entityId: number, entityType?: string) => void;
  onClose: () => void;
}

// Tab configuration with icons
const TAB_CONFIG: { key: NotificationGroup; icon?: string }[] = [
  { key: 'task_submissions' },
  { key: 'messages' },
  { key: 'task_approvals' },
  { key: 'task_rejections' },
  { key: 'assignments' },
];

// Time ago helper - database stores timestamps in UTC
const getTimeAgo = (dateString: string): string => {
  const now = new Date();
  // Parse as UTC by replacing space with T and adding Z suffix
  const utcDateString = dateString.replace(' ', 'T') + 'Z';
  const created = new Date(utcDateString);
  const diffInMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) return 'الآن';
  if (diffInMinutes < 60) return `${diffInMinutes} د`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} س`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} ي`;
};

interface NotificationItemProps {
  notification: GroupedNotification;
  onNotificationClick: (entityId: number, entityType?: string) => void;
  onMarkAsRead: (id: number) => void;
  isMarkingAsRead: boolean;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onNotificationClick,
  onMarkAsRead,
  isMarkingAsRead,
}) => {
  const handleClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    onNotificationClick(notification.related_entity_id, notification.related_entity_type);
  };

  const handleMarkAsReadOnly = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkAsRead(notification.id);
  };

  return (
    <div
      dir="rtl"
      className={`relative flex items-start gap-3 px-3 py-2.5 border-b border-border/30 cursor-pointer transition-colors ${
        !notification.is_read ? 'bg-primary/5' : 'bg-transparent hover:bg-muted/50'
      }`}
      onClick={handleClick}
    >
      {/* Unread indicator */}
      {!notification.is_read && (
        <span className="absolute top-3 right-2 w-1.5 h-1.5 rounded-full bg-primary" />
      )}

      <div className="flex-1 min-w-0 pr-2">
        {/* Message - main content */}
        <p className="text-sm text-foreground leading-relaxed line-clamp-2 text-right">
          {notification.message}
        </p>

        {/* Time */}
        <span className="text-xs text-muted-foreground mt-1 block text-right">
          {getTimeAgo(notification.created_at)}
        </span>
      </div>

      {/* Mark as read button */}
      {!notification.is_read && (
        <button
          onClick={handleMarkAsReadOnly}
          disabled={isMarkingAsRead}
          className="shrink-0 p-1 rounded hover:bg-muted transition-colors"
          title="وضع علامة كمقروء"
        >
          {isMarkingAsRead ? (
            <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : (
            <Check size={12} className="text-muted-foreground" />
          )}
        </button>
      )}
    </div>
  );
};

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  onNotificationClick,
}) => {
  const { error: showError } = useToast();
  const { data, isLoading, error } = useGetGroupedNotifications();
  const markAsReadMutation = useMarkNotificationAsRead();
  const markGroupMutation = useMarkGroupAsRead();
  const markAllMutation = useMarkAllNotificationsAsRead();

  const handleMarkAsRead = (notificationId: number) => {
    markAsReadMutation.mutate(notificationId);
  };

  const handleMarkGroupAsRead = (group: NotificationGroup) => {
    markGroupMutation.mutate(group);
  };

  const handleMarkAllAsRead = () => {
    markAllMutation.mutate();
  };

  // Error toast
  React.useEffect(() => {
    if (markAsReadMutation.isError || markGroupMutation.isError || markAllMutation.isError) {
      showError('حدث خطأ أثناء تحديث الإشعارات');
    }
  }, [markAsReadMutation.isError, markGroupMutation.isError, markAllMutation.isError, showError]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-destructive gap-2">
        <X size={20} />
        <span className="text-sm">فشل في تحميل الإشعارات</span>
      </div>
    );
  }

  if (!data) return null;

  const { groups, total_unread, group_labels } = data;

  // Find first tab with notifications
  const firstActiveTab = TAB_CONFIG.find(tab => groups[tab.key]?.total_count > 0)?.key || 'task_submissions';

  return (
    <div dir="rtl" className="flex flex-col w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
        <h3 className="text-sm font-semibold text-foreground">الإشعارات</h3>
        {total_unread > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            disabled={markAllMutation.isPending}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
          >
            {markAllMutation.isPending ? (
              <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <CheckCheck size={14} />
            )}
            <span>قراءة الكل</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue={firstActiveTab} className="w-full">
        <TabsList className="w-full h-auto p-1 bg-muted/50 rounded-none border-b border-border/30 flex justify-start gap-0.5 overflow-x-auto">
          {TAB_CONFIG.map(({ key }) => {
            const groupData = groups[key];
            const unreadCount = groupData?.unread_count || 0;
            const label = group_labels[key];

            return (
              <TabsTrigger
                key={key}
                value={key}
                className="relative text-xs px-2 py-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm whitespace-nowrap"
              >
                {label}
                {unreadCount > 0 && (
                  <span className="mr-1 px-1 py-0.5 text-[10px] font-medium bg-primary text-primary-foreground rounded-full min-w-[16px] text-center">
                    {unreadCount}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {TAB_CONFIG.map(({ key }) => {
          const groupData = groups[key];
          const notifications = groupData?.notifications || [];
          const unreadCount = groupData?.unread_count || 0;

          return (
            <TabsContent key={key} value={key} className="mt-0">
              {/* Group mark as read button */}
              {unreadCount > 0 && (
                <div className="px-3 py-1.5 border-b border-border/30 bg-muted/30">
                  <button
                    onClick={() => handleMarkGroupAsRead(key)}
                    disabled={markGroupMutation.isPending}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    <Check size={12} />
                    <span>قراءة الكل في هذه المجموعة</span>
                  </button>
                </div>
              )}

              {/* Notifications list */}
              <div className="max-h-[280px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
                    <Inbox size={24} />
                    <span className="text-sm">لا توجد إشعارات</span>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onNotificationClick={onNotificationClick}
                      onMarkAsRead={handleMarkAsRead}
                      isMarkingAsRead={markAsReadMutation.isPending}
                    />
                  ))
                )}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};

export default NotificationDropdown;
