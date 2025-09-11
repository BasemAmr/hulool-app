import React from 'react';
import { Card, Button, Badge } from 'react-bootstrap';
import { Bell, BellRing, CheckCheck } from 'lucide-react';
import { useMarkAllNotificationsAsRead } from '../../queries/employeeNotificationQueries';
import type { EmployeeNotification } from '../../queries/employeeNotificationQueries';

interface EmployeeNotificationsHeaderProps {
  notifications: EmployeeNotification[];
  totalCount: number;
  isLoading: boolean;
}

const EmployeeNotificationsHeader: React.FC<EmployeeNotificationsHeaderProps> = ({
  notifications,
  totalCount,
  isLoading
}) => {
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    
    try {
      await markAllAsReadMutation.mutateAsync();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  return (
    <Card className="border-0 shadow-sm mb-4">
      <Card.Body>
        <div className="row align-items-center">
          <div className="col-md-8">
            <div className="d-flex align-items-center gap-3">
              <div className="d-flex align-items-center gap-2">
                {unreadCount > 0 ? (
                  <BellRing size={24} className="text-warning" />
                ) : (
                  <Bell size={24} className="text-muted" />
                )}
                <h4 className="mb-0 fw-bold">الإشعارات</h4>
              </div>
              
              <div className="d-flex gap-2">
                <Badge bg={unreadCount > 0 ? 'warning' : 'success'} className="px-3 py-2">
                  {totalCount} إجمالي
                </Badge>
                {unreadCount > 0 && (
                  <Badge bg="danger" className="px-3 py-2">
                    {unreadCount} غير مقروء
                  </Badge>
                )}
              </div>
            </div>
            
            <p className="text-muted mb-0 mt-2">
              تتبع جميع التحديثات المتعلقة بالمهام والرسائل والعمولات
            </p>
          </div>
          
          <div className="col-md-4 text-end">
            {unreadCount > 0 && (
              <Button
                variant="outline-primary"
                onClick={handleMarkAllAsRead}
                disabled={markAllAsReadMutation.isPending || isLoading}
                className="d-flex align-items-center gap-2 ms-auto"
              >
                <CheckCheck size={16} />
                {markAllAsReadMutation.isPending ? 'جاري التحديث...' : 'تحديد الكل كمقروء'}
              </Button>
            )}
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default EmployeeNotificationsHeader;
