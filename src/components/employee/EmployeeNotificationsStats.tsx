import React from 'react';
import { Card, Row, Col } from 'react-bootstrap';
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
      color: 'info',
      bgColor: 'rgba(13, 202, 240, 0.1)'
    },
    {
      title: 'إشعارات مالية',
      count: financialNotifications.length,
      unread: financialNotifications.filter(n => !n.is_read).length,
      icon: DollarSign,
      color: 'success',
      bgColor: 'rgba(25, 135, 84, 0.1)'
    },
    {
      title: 'غير المقروءة',
      count: unreadNotifications.length,
      unread: unreadNotifications.length,
      icon: Bell,
      color: 'warning',
      bgColor: 'rgba(255, 193, 7, 0.1)'
    }
  ];

  return (
    <Row className="mb-4">
      {stats.map((stat, index) => {
        const IconComponent = stat.icon;
        return (
          <Col key={index} md={3} className="mb-3">
            <Card 
              className="border-0 shadow-sm h-100"
              style={{ backgroundColor: stat.bgColor }}
            >
              <Card.Body className="text-center">
                <div className="d-flex align-items-center justify-content-center mb-2">
                  <IconComponent 
                    size={24} 
                    className={`text-${stat.color}`} 
                  />
                </div>
                <h5 className="mb-1 fw-bold">{stat.count}</h5>
                <p className="text-muted mb-1 small">{stat.title}</p>
                {stat.unread > 0 && (
                  <div className="mt-2">
                    <span className={`badge bg-${stat.color} small`}>
                      {stat.unread} جديد
                    </span>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        );
      })}
    </Row>
  );
};

export default EmployeeNotificationsStats;
