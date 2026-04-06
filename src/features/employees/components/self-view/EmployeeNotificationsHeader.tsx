import React from 'react';
import { Card, CardContent } from '@/shared/ui/shadcn/card';
import Button from '@/shared/ui/primitives/Button';
import { Badge } from '@/shared/ui/shadcn/badge';
import { Bell, BellRing, CheckCheck } from 'lucide-react';
import { useMarkAllNotificationsAsRead } from '@/features/employees/api/employeeNotificationQueries';
import type { EmployeeNotification } from '@/features/employees/api/employeeNotificationQueries';

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
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {unreadCount > 0 ? (
                  <BellRing size={24} className="text-status-warning-text" />
                ) : (
                  <Bell size={24} className="text-text-primary" />
                )}
                <h4 className="mb-0 font-bold">الإشعارات</h4>
              </div>
              
              <div className="flex gap-2">
                <Badge variant={unreadCount > 0 ? 'secondary' : 'default'} className="px-3 py-2">
                  {totalCount} إجمالي
                </Badge>
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="px-3 py-2">
                    {unreadCount} غير مقروء
                  </Badge>
                )}
              </div>
            </div>
            
            <p className="text-text-primary mb-0 mt-2">
              تتبع جميع التحديثات المتعلقة بالمهام والرسائل والعمولات
            </p>
          </div>
          
          <div className="flex-shrink-0">
            {unreadCount > 0 && (
              <Button
                variant="outline-primary"
                onClick={handleMarkAllAsRead}
                disabled={markAllAsReadMutation.isPending || isLoading}
                className="flex items-center gap-2"
              >
                <CheckCheck size={16} />
                {markAllAsReadMutation.isPending ? 'جاري التحديث...' : 'تحديد الكل كمقروء'}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmployeeNotificationsHeader;
