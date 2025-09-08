import React from 'react';
import { ChevronDown, Check, X } from 'lucide-react';
import { 
  useGetNotifications, 
  useMarkNotificationAsRead, 
  useMarkAllNotificationsAsRead,
  type Notification 
} from '../../queries/notificationQueries';
import { useToast } from '../../hooks/useToast';

interface NotificationDropdownProps {
  onNotificationClick: (taskId: number, eventId?: number | null) => void;
  onClose: () => void;
}

interface NotificationItemProps {
  notification: Notification;
  onNotificationClick: (taskId: number, eventId?: number | null) => void;
  onMarkAsRead: (id: number) => void;
  isMarkingAsRead: boolean;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onNotificationClick,
  onMarkAsRead,
  isMarkingAsRead
}) => {
  const handleClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    onNotificationClick(notification.task_id, notification.event_id);
  };

  const handleMarkAsReadOnly = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkAsRead(notification.id);
  };

  // Simple time ago calculation
  const timeAgo = (() => {
    const now = new Date();
    const created = new Date(notification.created_at);
    const diffInMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'الآن';
    if (diffInMinutes < 60) return `قبل ${diffInMinutes} دقيقة`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `قبل ${diffInHours} ساعة`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `قبل ${diffInDays} يوم`;
  })();

  return (
    <div
      className={`position-relative px-3 py-3 border-bottom cursor-pointer notification-item ${
        !notification.is_read ? 'bg-light unread' : 'bg-white'
      }`}
      style={{
        transition: 'all 0.2s ease-in-out',
        cursor: 'pointer'
      }}
      onClick={handleClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#f8f9fa';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = !notification.is_read ? '#f8f9fa' : '#ffffff';
      }}
    >
      {/* Unread indicator */}
      {!notification.is_read && (
        <div 
          className="position-absolute bg-primary rounded-circle"
          style={{
            top: '12px',
            right: '12px',
            width: '8px',
            height: '8px'
          }}
        />
      )}

      {/* Mark as read button */}
      {!notification.is_read && (
        <button
          onClick={handleMarkAsReadOnly}
          disabled={isMarkingAsRead}
          className="btn btn-sm btn-outline-light position-absolute p-1 border-0"
          style={{
            top: '8px',
            left: '8px',
            width: '24px',
            height: '24px',
            transition: 'all 0.2s ease'
          }}
          title="وضع علامة كمقروء"
        >
          {isMarkingAsRead ? (
            <div 
              className="spinner-border text-primary"
              style={{ width: '12px', height: '12px' }}
              role="status"
            >
              <span className="visually-hidden">Loading...</span>
            </div>
          ) : (
            <Check size={12} className="text-muted" />
          )}
        </button>
      )}

      <div className="pe-4 ps-5">
        {/* Notification content */}
        <p className="small text-dark mb-1 lh-sm">
          {notification.content}
        </p>

        {/* Task and client info */}
        <div className="d-flex align-items-center gap-2 small text-muted mb-1">
          <span className="fw-medium">{notification.task_name}</span>
          {notification.client_name && (
            <>
              <span>•</span>
              <span>{notification.client_name}</span>
            </>
          )}
        </div>

        {/* Timestamp */}
        <div className="small text-muted">
          {timeAgo}
        </div>
      </div>
    </div>
  );
};

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  onNotificationClick
}) => {
  const { success, error: showError } = useToast();
  
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useGetNotifications();

  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();

  // Flatten all pages into a single notifications array
  const notifications = data?.pages.flatMap(page => page.notifications) || [];
  const hasUnreadNotifications = notifications.some(n => !n.is_read);

  const handleMarkAsRead = (notificationId: number) => {
    markAsReadMutation.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  // Track toast shown state to prevent spam
  const toastShownRef = React.useRef<{ markAll: boolean }>({ markAll: false });

  // Show success/error toasts for mutations
  React.useEffect(() => {
    if (markAsReadMutation.isError) {
      showError('فشل في وضع علامة للإشعار كمقروء');
    }
  }, [markAsReadMutation.isError, showError]);

  React.useEffect(() => {
    if (markAllAsReadMutation.isSuccess && !toastShownRef.current.markAll) {
      success('تم وضع علامة لجميع الإشعارات كمقروءة');
      toastShownRef.current.markAll = true;
    } else if (markAllAsReadMutation.isError && !toastShownRef.current.markAll) {
      showError('فشل في وضع علامة لجميع الإشعارات كمقروءة');
      toastShownRef.current.markAll = true;
    }
    
    // Reset the flag when mutation is idle for next time
    if (markAllAsReadMutation.isIdle) {
      toastShownRef.current.markAll = false;
    }
  }, [markAllAsReadMutation.isSuccess, markAllAsReadMutation.isError, markAllAsReadMutation.isIdle, success, showError]);

  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };


  if (isLoading) {
    return (
      <div className="p-4">
        <div className="d-flex align-items-center justify-content-center py-5">
          <div 
            className="spinner-border text-primary me-2"
            style={{ width: '20px', height: '20px' }}
            role="status"
          >
            <span className="visually-hidden">Loading...</span>
          </div>
          <span className="text-muted">جاري التحميل...</span>
        </div>
      </div>
    );
  }

  if (error && !isLoading) {
    return (
      <div className="p-4">
        <div className="d-flex align-items-center justify-content-center py-5 text-danger">
          <X size={18} className="me-2" />
          <span>فشل في تحميل الإشعارات</span>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex flex-column h-100">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between p-3 border-bottom bg-light">
        <h6 className="mb-0 fw-semibold text-dark">
          الإشعارات
        </h6>
        
        {hasUnreadNotifications && (
          <button
            onClick={handleMarkAllAsRead}
            disabled={markAllAsReadMutation.isPending}
            className="btn btn-link btn-sm text-primary p-0 text-decoration-none"
            style={{ fontSize: '12px' }}
          >
            {markAllAsReadMutation.isPending ? (
              <div className="d-flex align-items-center gap-2">
                <div 
                  className="spinner-border text-primary"
                  style={{ width: '12px', height: '12px' }}
                  role="status"
                >
                  <span className="visually-hidden">Loading...</span>
                </div>
                <span>جاري الحفظ...</span>
              </div>
            ) : (
              'وضع علامة للكل كمقروء'
            )}
          </button>
        )}
      </div>

      {/* Notifications list */}
      {notifications.length === 0 ? (
        <div className="d-flex align-items-center justify-content-center py-5 text-muted">
          <span>لا توجد إشعارات</span>
        </div>
      ) : (
        <div className="flex-grow-1 overflow-hidden">
          <div 
            className="overflow-auto"
            style={{ maxHeight: '350px' }}
          >
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onNotificationClick={onNotificationClick}
                onMarkAsRead={handleMarkAsRead}
                isMarkingAsRead={markAsReadMutation.isPending}
              />
            ))}
          </div>
          
          {/* Load more button */}
          {hasNextPage && (
            <div className="p-3 border-top bg-light">
              <button
                onClick={loadMore}
                disabled={isFetchingNextPage}
                className="btn btn-outline-primary btn-sm w-100 d-flex align-items-center justify-content-center gap-2"
                style={{ transition: 'all 0.2s ease' }}
              >
                {isFetchingNextPage ? (
                  <>
                    <div 
                      className="spinner-border text-primary"
                      style={{ width: '12px', height: '12px' }}
                      role="status"
                    >
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <span>جاري التحميل...</span>
                  </>
                ) : (
                  <>
                    <ChevronDown size={14} />
                    <span>تحميل المزيد</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
