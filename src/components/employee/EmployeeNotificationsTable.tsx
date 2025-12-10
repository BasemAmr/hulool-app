import React from 'react';
import { formatDate } from '../../utils/dateUtils';
import { useStickyHeader } from '../../hooks/useStickyHeader';
import { Bell, MessageSquare, CheckCircle, UserCheck, UserX, RotateCcw, DollarSign } from 'lucide-react';
import { Badge } from '../ui/badge';
import { useNavigate } from 'react-router-dom';
import { useMarkNotificationAsRead } from '../../queries/employeeNotificationQueries';
import { useDrawerStore } from '../../stores/drawerStore';
import type { EmployeeNotification } from '../../queries/employeeNotificationQueries';

interface EmployeeNotificationsTableProps {
  notifications: EmployeeNotification[];
  isLoading: boolean;
}

const EmployeeNotificationsTable: React.FC<EmployeeNotificationsTableProps> = ({ 
  notifications, 
  isLoading 
}) => {
  const { sentinelRef, isSticky } = useStickyHeader();
  const navigate = useNavigate();
  const markAsReadMutation = useMarkNotificationAsRead();
  const { openDrawer } = useDrawerStore();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">جاري التحميل...</span>
        </div>
      </div>
    );
  }

  if (!notifications.length) {
    return (
      <div className="text-center p-5 text-muted-foreground">
        <Bell size={48} className="mb-3 opacity-50" />
        <p className="mb-0">لا توجد إشعارات</p>
      </div>
    );
  }

  const getNotificationIcon = (eventType: string) => {
    switch (eventType) {
      case 'TaskAssigned':
        return <UserCheck size={16} className="text-primary" />;
      case 'TaskUnassigned':
        return <UserX size={16} className="text-danger" />;
      case 'TaskReassigned':
        return <RotateCcw size={16} className="text-warning" />;
      case 'TaskApproved':
        return <CheckCircle size={16} className="text-success" />;
      case 'NewMessage':
        return <MessageSquare size={16} className="text-info" />;
      case 'CommissionEarned':
        return <DollarSign size={16} className="text-success" />;
      default:
        return <Bell size={16} className="text-muted" />;
    }
  };

  const getEventTypeBadge = (eventType: string) => {
    switch (eventType) {
      case 'TaskAssigned':
        return <Badge variant="default">تكليف مهمة</Badge>;
      case 'TaskUnassigned':
        return <Badge variant="destructive">إلغاء تكليف</Badge>;
      case 'TaskReassigned':
        return <Badge variant="secondary">إعادة تكليف</Badge>;
      case 'TaskApproved':
        return <Badge variant="default">موافقة على مهمة</Badge>;
      case 'NewMessage':
        return <Badge variant="secondary">رسالة جديدة</Badge>;
      case 'CommissionEarned':
        return <Badge variant="default">عمولة مكتسبة</Badge>;
      default:
        return <Badge variant="outline">{eventType}</Badge>;
    }
  };

  const handleNotificationClick = async (notification: EmployeeNotification) => {
    // Mark as read if not already read
    if (!notification.is_read) {
      try {
        await markAsReadMutation.mutateAsync(notification.id);
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }

    // Navigate based on event type
    switch (notification.event_type) {
      case 'TaskAssigned':
      case 'TaskUnassigned':
      case 'TaskReassigned':
      case 'TaskApproved':
        // Navigate to employee tasks page and highlight the task
        navigate(`/employee/tasks?highlight=${notification.task_id}`);
        break;
      case 'NewMessage':
        // Open task messaging drawer and highlight the message
        openDrawer('taskFollowUp', {
          taskId: notification.task_id,
          taskName: notification.task_name,
          clientName: notification.client_name,
          highlightMessage: notification.event_id || undefined
        });
        // Also navigate to tasks page in background
        navigate('/employee/tasks');
        break;
      case 'CommissionEarned':
        // Navigate to employee transactions and highlight the transaction
        if (notification.event_id) {
          navigate(`/employee/financials?mode=Employee&highlight=${notification.event_id}`);
        } else {
          navigate('/employee/financials?mode=Employee');
        }
        break;
      default:
        // Default to tasks page
        navigate('/employee/tasks');
        break;
    }
  };

  return (
    <div className="w-full overflow-x-auto" dir="rtl">
      {/* Sentinel element for sticky header detection */}
      <div ref={sentinelRef}></div>
      
      <table className="w-full">
        <thead className={`bg-blue-500 text-white ${isSticky ? 'is-sticky' : ''}`}>
          <tr className="font-bold">
            <th scope="col" className="text-center py-3 px-2" style={{ width: '5%' }}>النوع</th>
            <th scope="col" className="text-center py-3 px-2" style={{ width: '50%' }}>المحتوى</th>
            <th scope="col" className="text-center py-3 px-2" style={{ width: '15%' }}>اسم المهمة</th>
            <th scope="col" className="text-center py-3 px-2" style={{ width: '15%' }}>العميل</th>
            <th scope="col" className="text-center py-3 px-2" style={{ width: '10%' }}>التاريخ</th>
            <th scope="col" className="text-center py-3 px-2" style={{ width: '5%' }}>الحالة</th>
          </tr>
        </thead>
        <tbody>
          {notifications.map((notification) => (
            <tr
              key={notification.id}
              className={`${!notification.is_read ? 'bg-yellow-100/50' : ''} cursor-pointer hover:bg-muted/50 transition-colors`}
              style={{ cursor: 'pointer' }}
              onClick={() => handleNotificationClick(notification)}
            >
              <td className="text-center py-3 px-2">
                <div className="flex flex-col items-center gap-1">
                  {getNotificationIcon(notification.event_type)}
                  {getEventTypeBadge(notification.event_type)}
                </div>
              </td>
              <td className="py-3 px-2">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <p className="mb-1 font-medium" style={{ lineHeight: '1.4' }}>
                      {notification.content}
                    </p>
                    {!notification.is_read && (
                      <div className="flex items-center gap-1">
                        <div 
                          className="bg-primary rounded-full" 
                          style={{ width: '6px', height: '6px' }}
                        ></div>
                        <small className="text-primary font-bold">جديد</small>
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td className="text-center py-3 px-2">
                <span className="font-medium">
                  {notification.task_name || '—'}
                </span>
              </td>
              <td className="text-center py-3 px-2">
                <span className="text-muted-foreground">
                  {notification.client_name || '—'}
                </span>
              </td>
              <td className="text-center py-3 px-2">
                <div className="flex flex-col items-center">
                  <span className="text-muted-foreground text-sm">
                    {formatDate(notification.created_at)}
                  </span>
                  {notification.read_at && (
                    <span className="text-green-600 text-sm">
                      قُرئ: {formatDate(notification.read_at)}
                    </span>
                  )}
                </div>
              </td>
              <td className="text-center py-3 px-2">
                {notification.is_read ? (
                  <Badge variant="default" className="text-sm">مقروء</Badge>
                ) : (
                  <Badge variant="secondary" className="text-sm">غير مقروء</Badge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default EmployeeNotificationsTable;
