// src/components/dashboard/DashboardClientCard.tsx
// import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useModalStore } from '../../stores/modalStore';
import { useToast } from '../../hooks/useToast';
import { useDeferTask, useResumeTask } from '../../queries/taskQueries';
import type { Task } from '../../api/types';
import { formatDate } from '../../utils/dateUtils';
import { formatTimeElapsed } from '../../utils/timeUtils';
import { Dropdown } from 'react-bootstrap';
import { 
  MessageSquare, 
  Plus, 
  Receipt, 
  Check, 
  Pause, 
  Play, 
  ListChecks, 
  MoreVertical, 
  AlertTriangle,
  Eye,
  Calendar,
  Clock
} from 'lucide-react';
import type { ClientWithTasksAndStats } from '../../queries/dashboardQueries';

interface DashboardClientCardProps {
  data: ClientWithTasksAndStats;
  index?: number; // optional: used to subtly vary styling
}

const DashboardClientCard = ({ data, index = 0 }: DashboardClientCardProps) => {
  const { client, tasks, stats } = data;
  const { t } = useTranslation();
  const openModal = useModalStore(state => state.openModal);
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  const deferTaskMutation = useDeferTask();
  const resumeTaskMutation = useResumeTask();
  
  const handleAction = (mutation: any, task: Task, successKey: string, successMessageKey: string, errorKey: string) => {
    mutation.mutate({ id: task.id }, {
      onSuccess: () => {
        success(t(successKey), t(successMessageKey, { taskName: task.task_name || t(`type.${task.type}`) }));
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'clientsWithActiveTasks'] });
      },
      onError: (err: any) => {
        error(t('common.error'), err.message || t(errorKey));
      }
    });
  };

  const handleDefer = (task: Task) => handleAction(deferTaskMutation, task, 'tasks.deferSuccess', 'tasks.deferSuccessMessage', 'tasks.deferError');
  const handleResume = (task: Task) => handleAction(resumeTaskMutation, task, 'tasks.resumeSuccess', 'tasks.resumeSuccessMessage', 'tasks.resumeError');
  const handleComplete = (task: Task) => openModal('taskCompletion', { task });
  const handleShowRequirements = (task: Task) => openModal('requirements', { task });
  const handleShowDetails = (task: Task) => openModal('taskDetails', { task });
  const handleAddTask = () => openModal('taskForm', { client });
  const handleAddReceivable = () => openModal('manualReceivable', { client_id: client.id });

  const isClientUrgent = tasks.some(task => task.tags?.some(tag => tag.name === 'قصوى'));
  const cardBackground = index % 2 === 0 ? '#f8f9fa' : '#e3f2fd'; // Light grey / Light blue alternating
  const borderColor = isClientUrgent ? 'var(--color-danger)' : '#dee2e6';

  const openGoogleDrive = () => {
    if (client.google_drive_link) {
      window.open(client.google_drive_link, '_blank');
    }
  };

  const openWhatsApp = () => {
    const phoneNumber = client.phone.replace(/[^0-9]/g, '');
    const whatsappUrl = `https://wa.me/+966${phoneNumber}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div 
      className="card h-100 shadow-sm dashboard-client-card"
      style={{ 
        backgroundColor: cardBackground,
        borderLeft: `${1 + (index % 2)}px solid ${borderColor}`,
        border: `1px solid ${borderColor}`,
        borderRadius: '4px',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
  <div className="card-header bg-light border-bottom py-1 px-2">
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            {/* WhatsApp Button */}
            <button 
              onClick={openWhatsApp}
              className="btn btn-sm btn-outline-success p-1"
              title="واتساب"
              style={{ fontSize: '11px', lineHeight: 1 }}
            >
              <MessageSquare size={10} />
            </button>
            
            {/* Google Drive Button */}
            <button 
              onClick={openGoogleDrive}
              className="btn btn-sm btn-outline-primary p-1"
              title="Google Drive"
              style={{ fontSize: '11px', lineHeight: 1 }}
              disabled={!client.google_drive_link}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.5 12.1l1.2-2.1h4.6l1.2 2.1H8.5zM7.2 12.1L4 6.8L1.5 11l2.3 4h3.4zM18.5 11L16 6.8l-3.2 5.3h5.7zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 7.8l-1.68 2.88 1.68 2.92H8.36l1.68-2.92L8.36 9.8h8.28z"/>
              </svg>
            </button>
            
            {/* Client Name */}
            <Link 
              to={`/clients/${client.id}`}
              className="text-decoration-none fw-bold text-primary"
              style={{ fontSize: '0.85em' }}
            >
              {client.name}
            </Link>
            {isClientUrgent && (
              <AlertTriangle size={12} className="text-danger" />
            )}
          </div>
          
          {/* Actions Dropdown */}
          <Dropdown>
            <Dropdown.Toggle 
              variant="outline-secondary" 
              size="sm"
              className="p-1 border-0"
              style={{ fontSize: '11px' }}
            >
              <MoreVertical size={10} />
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item onClick={handleAddTask}>
                <Plus size={14} className="me-2" />
                إضافة مهمة
              </Dropdown.Item>
              <Dropdown.Item onClick={handleAddReceivable}>
                <Receipt size={14} className="me-2" />
                إضافة مستحق
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>
      </div>

      {/* Body - Tasks Table */}
      <div className="card-body p-1">
        <div className="table-responsive" style={{ maxHeight: '200px', overflowY: 'auto' }}>
          <table className="table table-sm table-borderless mb-0">
            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 1 }}>
              <tr className="border-bottom">
                <th style={{ fontSize: '0.7em', padding: '4px 3px' }}>المهمة</th>
                <th style={{ fontSize: '0.7em', padding: '4px 3px' }}>تاريخ</th>
                <th style={{ fontSize: '0.7em', padding: '4px 3px' }}>المدة</th>
                <th style={{ fontSize: '0.7em', padding: '4px 3px' }}>المبلغ</th>
                <th style={{ fontSize: '0.7em', padding: '4px 3px', width: '54px' }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td style={{ fontSize: '0.75em', padding: '3px' }}>
                    <div className="d-flex align-items-center gap-1">
                      <span className="text-truncate" style={{ maxWidth: 160, display: 'inline-block' }}>
                        {task.task_name || t(`type.${task.type}`)}
                      </span>
                      {task.tags?.some(tag => tag.name === 'قصوى') && (
                        <AlertTriangle size={9} className="text-danger" />
                      )}
                    </div>
                  </td>
                  <td style={{ fontSize: '0.7em', padding: '3px' }} className="text-muted">
                    <Calendar size={9} className="me-1" />
                    {formatDate(task.start_date)}
                  </td>
                  <td style={{ fontSize: '0.7em', padding: '3px' }} className="text-muted">
                    <Clock size={9} className="me-1" />
                    {formatTimeElapsed(task.start_date)}
                  </td>
                  <td style={{ fontSize: '0.7em', padding: '3px' }} className="text-success fw-bold">
                    <div className="d-flex align-items-center">
                      <svg
                        width={10}
                        height={10}
                        viewBox="0 0 1124.14 1256.39"
                        style={{
                          marginLeft: '2px',
                          verticalAlign: 'middle'
                        }}
                      >
                        <path
                          d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z"
                          fill="#16a34a"
                        />
                        <path
                          d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z"
                          fill="#16a34a"
                        />
                      </svg>
                      {task.amount?.toLocaleString()}
                    </div>
                  </td>
                  <td style={{ padding: '3px', position: 'relative' }}>
                    <div className="d-flex gap-1">
                      <button
                        onClick={() => handleShowDetails(task)}
                        className="btn btn-outline-info btn-sm p-1"
                        title="تفاصيل"
                        style={{ fontSize: '9px', lineHeight: 1 }}
                      >
                        <Eye size={9} />
                      </button>
                      
                      <Dropdown>
                        <Dropdown.Toggle 
                          variant="outline-secondary" 
                          size="sm"
                          className="p-1"
                          style={{ fontSize: '9px' }}
                        >
                          <MoreVertical size={9} />
                        </Dropdown.Toggle>
                        <Dropdown.Menu 
                          style={{ 
                            position: 'fixed',
                            zIndex: 1050,
                            minWidth: '120px',
                            fontSize: '0.78em'
                          }}
                        >
                          <Dropdown.Item onClick={() => handleComplete(task)}>
                            <Check size={11} className="me-2" />
                            إكمال
                          </Dropdown.Item>
                          {task.status === 'New' ? (
                            <Dropdown.Item onClick={() => handleDefer(task)}>
                              <Pause size={11} className="me-2" />
                              تأجيل
                            </Dropdown.Item>
                          ) : (
                            <Dropdown.Item onClick={() => handleResume(task)}>
                              <Play size={11} className="me-2" />
                              استئناف
                            </Dropdown.Item>
                          )}
                          <Dropdown.Item onClick={() => handleShowRequirements(task)}>
                            <ListChecks size={11} className="me-2" />
                            المتطلبات
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer - Stats */}
      <div className="card-footer bg-light border-top py-1 px-2">
        <div className="row text-center g-1">
          <div className="col-3">
            <Link 
              to={`/tasks?client_id=${client.id}&status=New`}
              className="btn btn-outline-primary btn-sm w-100 py-1"
              style={{ fontSize: '0.7em', borderRadius: '3px' }}
            >
              <div className="fw-bold">{stats.new_tasks_count}</div>
              <div style={{ fontSize: '0.85em' }}>جديدة</div>
            </Link>
          </div>
          <div className="col-3">
            <Link 
              to={`/tasks?client_id=${client.id}&status=Completed`}
              className="btn btn-outline-success btn-sm w-100 py-1"
              style={{ fontSize: '0.7em', borderRadius: '3px' }}
            >
              <div className="fw-bold">{stats.completed_tasks_count}</div>
              <div style={{ fontSize: '0.85em' }}>مكتملة</div>
            </Link>
          </div>
          <div className="col-3">
            <Link 
              to={`/tasks?client_id=${client.id}&status=Deferred`}
              className="btn btn-outline-warning btn-sm w-100 py-1"
              style={{ fontSize: '0.7em', borderRadius: '3px' }}
            >
              <div className="fw-bold">{stats.deferred_tasks_count}</div>
              <div style={{ fontSize: '0.85em' }}>مؤجلة</div>
            </Link>
          </div>
          <div className="col-3">
            <Link 
              to={`/clients/${client.id}?tab=receivables`}
              className="btn btn-outline-danger btn-sm w-100 py-1"
              style={{ fontSize: '0.7em', borderRadius: '3px' }}
            >
              <div className="fw-bold" style={{ fontSize: '0.9em' }}>
                {Number(stats.total_outstanding ?? 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.85em' }}>مستحق</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardClientCard;
