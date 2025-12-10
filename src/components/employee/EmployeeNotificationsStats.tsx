import React from 'react';
import { Card, CardContent } from '../ui/card';
import { MessageSquare, CheckCircle, DollarSign, Bell } from 'lucide-react';
import type { EmployeeNotification } from '../../queries/employeeNotificationQueries';

interface EmployeeNotificationsStatsProps {
  notifications: EmployeeNotification[];
}

const EmployeeNotificationsStats: React.FC<EmployeeNotificationsStatsProps> = ({
  notifications
}) => {
  // Calculate stats
  const taskNotifications = notifications.filter(n => 
    ['TaskAssigned', 'TaskUnassigned', 'TaskReassigned', 'TaskApproved'].includes(n.event_type)
  );
  
  const messageNotifications = notifications.filter(n => 
    n.event_type === 'NewMessage'
  );
  
  const financialNotifications = notifications.filter(n => 
    n.event_type === 'CommissionEarned'
  );
  
  const unreadNotifications = notifications.filter(n => !n.is_read);

  const stats = [
    {
      title: 'إشعارات المهام',
      count: taskNotifications.length,
      unread: taskNotifications.filter(n => !n.is_read).length,
      icon: CheckCircle,
      color: 'primary',
      bgColor: 'rgba(13, 110, 253, 0.1)'
    },
    {
      title: 'إشعارات الرسائل',
      count: messageNotifications.length,
      unread: messageNotifications.filter(n => !n.is_read).length,
      icon: MessageSquare,
      color: 'blue-500',
      bgColor: 'rgba(13, 202, 240, 0.1)'
    },
    {
      title: 'إشعارات مالية',
      count: financialNotifications.length,
      unread: financialNotifications.filter(n => !n.is_read).length,
      icon: DollarSign,
      color: 'green-600',
      bgColor: 'rgba(25, 135, 84, 0.1)'
    },
    {
      title: 'غير المقروءة',
      count: unreadNotifications.length,
      unread: unreadNotifications.length,
      icon: Bell,
      color: 'yellow-600',
      bgColor: 'rgba(255, 193, 7, 0.1)'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
      {stats.map((stat, index) => {
        const IconComponent = stat.icon;
        return (
          <div key={index}>
            <Card 
              className="border-0 shadow-sm h-full"
              style={{ backgroundColor: stat.bgColor }}
            >
              <CardContent className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <IconComponent 
                    size={24} 
                    className={`text-${stat.color}`} 
                  />
                </div>
                <h5 className="mb-1 font-bold">{stat.count}</h5>
                <p className="text-muted-foreground mb-1 text-sm">{stat.title}</p>
                {stat.unread > 0 && (
                  <div className="mt-2">
                    <span className={`inline-block px-2.5 py-1 bg-${stat.color} text-white rounded text-xs`}>
                      {stat.unread} جديد
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
};

export default EmployeeNotificationsStats;
