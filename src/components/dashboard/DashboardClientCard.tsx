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
  Phone,
  Eye,
  Calendar,
  Clock,
  DollarSign
} from 'lucide-react';
import type { ClientWithTasksAndStats } from '../../queries/dashboardQueries';

interface DashboardClientCardProps {
  data: ClientWithTasksAndStats;
  index: number; // For alternating backgrounds
}

const DashboardClientCard = ({ data, index }: DashboardClientCardProps) => {
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
  const cardBackground = index % 2 === 0 ? '#f8f9fa' : '#e3f2fd'; // Light grey and light blue alternating
  const borderColor = isClientUrgent ? 'var(--color-danger)' : 'var(--color-gray-200)';

  const openWhatsApp = () => {
    const phoneNumber = client.phone.replace(/[^0-9]/g, '');
    const whatsappUrl = `https://wa.me/${phoneNumber}`;
    window.open(whatsappUrl, '_blank');
  };

  const callPhone = () => {
    window.open(`tel:${client.phone}`, '_self');
  };

  return (
    <div 
      className="card h-100 shadow-sm"
      style={{ 
        backgroundColor: cardBackground,
        borderLeft: `4px solid ${borderColor}`
      }}
    >
      {/* Header */}
      <div className="card-header bg-transparent border-bottom">
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <Link 
              to={`/clients/${client.id}`}
              className="text-decoration-none fw-bold text-primary"
              style={{ fontSize: '1.1em' }}
            >
              {client.name}
            </Link>
            {isClientUrgent && (
              <AlertTriangle size={16} className="text-danger" />
            )}
          </div>
          
          <div className="d-flex align-items-center gap-2">
            {/* Phone & WhatsApp */}
            <button 
              onClick={callPhone}
              className="btn btn-sm btn-outline-secondary p-1"
              title="اتصال"
            >
              <Phone size={14} />
            </button>
            <button 
              onClick={openWhatsApp}
              className="btn btn-sm btn-outline-success p-1"
              title="واتساب"
            >
              <MessageSquare size={14} />
            </button>
            
            {/* Actions Dropdown */}
            <Dropdown>
              <Dropdown.Toggle 
                variant="outline-secondary" 
                size="sm"
                className="p-1 border-0"
              >
                <MoreVertical size={14} />
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item onClick={handleAddTask}>
                  <Plus size={16} className="me-2" />
                  إضافة مهمة
                </Dropdown.Item>
                <Dropdown.Item onClick={handleAddReceivable}>
                  <Receipt size={16} className="me-2" />
                  إضافة مستحق
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </div>
        
        <div className="mt-1">
          <small className="text-muted">{client.phone}</small>
        </div>
      </div>

      {/* Body - Tasks Table */}
      <div className="card-body p-3">
        <div className="table-responsive">
          <table className="table table-sm table-borderless">
            <thead>
              <tr className="border-bottom">
                <th style={{ fontSize: '0.8em' }}>المهمة</th>
                <th style={{ fontSize: '0.8em' }}>تاريخ البدء</th>
                <th style={{ fontSize: '0.8em' }}>المدة</th>
                <th style={{ fontSize: '0.8em' }}>المبلغ</th>
                <th style={{ fontSize: '0.8em' }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td style={{ fontSize: '0.85em' }}>
                    <div className="d-flex align-items-center gap-1">
                      {task.task_name || t(`type.${task.type}`)}
                      {task.tags?.some(tag => tag.name === 'قصوى') && (
                        <AlertTriangle size={12} className="text-danger" />
                      )}
                    </div>
                  </td>
                  <td style={{ fontSize: '0.8em' }} className="text-muted">
                    <Calendar size={12} className="me-1" />
                    {formatDate(task.start_date)}
                  </td>
                  <td style={{ fontSize: '0.8em' }} className="text-muted">
                    <Clock size={12} className="me-1" />
                    {formatTimeElapsed(task.start_date)}
                  </td>
                  <td style={{ fontSize: '0.8em' }} className="text-success fw-bold">
                    <DollarSign size={12} className="me-1" />
                    {task.amount?.toLocaleString()} ر.س
                  </td>
                  <td>
                    <div className="d-flex gap-1">
                      <button
                        onClick={() => handleShowDetails(task)}
                        className="btn btn-outline-info btn-sm p-1"
                        title="تفاصيل"
                      >
                        <Eye size={12} />
                      </button>
                      
                      <Dropdown>
                        <Dropdown.Toggle 
                          variant="outline-secondary" 
                          size="sm"
                          className="p-1"
                        >
                          <MoreVertical size={12} />
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                          <Dropdown.Item onClick={() => handleComplete(task)}>
                            <Check size={14} className="me-2" />
                            إكمال
                          </Dropdown.Item>
                          {task.status === 'New' ? (
                            <Dropdown.Item onClick={() => handleDefer(task)}>
                              <Pause size={14} className="me-2" />
                              تأجيل
                            </Dropdown.Item>
                          ) : (
                            <Dropdown.Item onClick={() => handleResume(task)}>
                              <Play size={14} className="me-2" />
                              استئناف
                            </Dropdown.Item>
                          )}
                          <Dropdown.Item onClick={() => handleShowRequirements(task)}>
                            <ListChecks size={14} className="me-2" />
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
      <div className="card-footer bg-transparent border-top">
        <div className="row text-center">
          <div className="col-3">
            <Link 
              to={`/tasks?client_id=${client.id}&status=New`}
              className="text-decoration-none text-primary"
            >
              <div style={{ fontSize: '0.9em' }} className="fw-bold">
                {stats.new_tasks_count}
              </div>
              <div style={{ fontSize: '0.7em' }} className="text-muted">
                جديدة
              </div>
            </Link>
          </div>
          <div className="col-3">
            <Link 
              to={`/tasks?client_id=${client.id}&status=Completed`}
              className="text-decoration-none text-success"
            >
              <div style={{ fontSize: '0.9em' }} className="fw-bold">
                {stats.completed_tasks_count}
              </div>
              <div style={{ fontSize: '0.7em' }} className="text-muted">
                مكتملة
              </div>
            </Link>
          </div>
          <div className="col-3">
            <Link 
              to={`/tasks?client_id=${client.id}&status=Deferred`}
              className="text-decoration-none text-warning"
            >
              <div style={{ fontSize: '0.9em' }} className="fw-bold">
                {stats.deferred_tasks_count}
              </div>
              <div style={{ fontSize: '0.7em' }} className="text-muted">
                مؤجلة
              </div>
            </Link>
          </div>
          <div className="col-3">
            <Link 
              to={`/receivables?client_id=${client.id}`}
              className="text-decoration-none text-danger"
            >
              <div style={{ fontSize: '0.8em' }} className="fw-bold">
                {Number(stats.total_outstanding ?? 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.7em' }} className="text-muted">
                مستحق
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardClientCard;
