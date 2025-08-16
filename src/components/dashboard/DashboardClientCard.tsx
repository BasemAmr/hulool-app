// src/components/dashboard/DashboardClientCard.tsx
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useModalStore } from '../../stores/modalStore';
import { useToast } from '../../hooks/useToast';
import { useDeferTask, useResumeTask } from '../../queries/taskQueries';
import type {  Task } from '../../api/types';
import { formatDate } from '../../utils/dateUtils';
import { formatTimeElapsed } from '../../utils/timeUtils';
import { Dropdown } from 'react-bootstrap';
import { MessageSquare, Plus, Receipt, Check, Pause, Play, ListChecks, MoreVertical, AlertTriangle } from 'lucide-react';
// import Button from '../ui/Button';
import type { ClientWithTasksAndStats } from '../../queries/dashboardQueries';

interface DashboardClientCardProps {
  data: ClientWithTasksAndStats;
}

const DashboardClientCard = ({ data }: DashboardClientCardProps) => {
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
  const borderColor = isClientUrgent ? 'var(--color-danger)' : 'var(--color-gray-200)';

  return (
    <div className="card h-100 shadow-sm" style={{ borderTop: `4px solid ${borderColor}` }}>
      <div className="card-header d-flex justify-content-between align-items-center bg-light p-2">
        <div className="d-flex align-items-center gap-2">
          <Link to={`/clients/${client.id}?mode=receivables`} className="text-decoration-none text-primary fw-bold">
            {client.name}
          </Link>
          <span className="text-muted small">{client.phone}</span>
          <a href={`https://wa.me/966${client.phone}`} target="_blank" rel="noopener noreferrer" className="text-success"><MessageSquare size={16} /></a>
        </div>
        <Dropdown>
          <Dropdown.Toggle as="button" className="btn btn-sm btn-light border-0 p-1">
            <MoreVertical size={18} />
          </Dropdown.Toggle>
          <Dropdown.Menu align="start">
            <Dropdown.Item onClick={handleAddTask}><Plus size={14} className="me-2" /> {t('clientProfile.addTask')}</Dropdown.Item>
            <Dropdown.Item onClick={handleAddReceivable}><Receipt size={14} className="me-2" /> {t('clientProfile.addReceivable')}</Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </div>

      <div className="card-body p-0">
        <div className="table-responsive" style={{ maxHeight: '250px', overflowY: 'auto' }}>
          <table className="table table-sm table-hover mb-0">
            <tbody>
              {tasks.map(task => {
                const isTaskLate = new Date(task.end_date || '') < new Date();
                return (
                  <tr key={task.id}>
                    <td>
                      <div className="d-flex align-items-center">
                        {isTaskLate && (
                          <AlertTriangle size={14} className="text-danger me-2">
                            <title>مهمة متأخرة</title>
                          </AlertTriangle>
                        )}
                        {task.task_name || t(`type.${task.type}`)}
                      </div>
                    </td>
                    <td className="text-muted small">{formatDate(task.start_date)}</td>
                    <td className="text-muted small">{formatTimeElapsed(task.start_date)}</td>
                    <td className="text-center">{task.amount.toLocaleString()}</td>
                    <td>
                      <Dropdown>
                        <Dropdown.Toggle as="button" className="btn btn-sm btn-light border-0 py-0 px-1">
                          <MoreVertical size={16} />
                        </Dropdown.Toggle>
                        <Dropdown.Menu align="start">
                          <Dropdown.Item onClick={() => handleShowDetails(task)}>تفاصيل</Dropdown.Item>
                          <Dropdown.Item onClick={() => handleComplete(task)}><Check size={14} className="me-2"/> إكمال</Dropdown.Item>
                          {task.status === 'New' && <Dropdown.Item onClick={() => handleDefer(task)}><Pause size={14} className="me-2"/> تأجيل</Dropdown.Item>}
                          {task.status === 'Deferred' && <Dropdown.Item onClick={() => handleResume(task)}><Play size={14} className="me-2"/> استئناف</Dropdown.Item>}
                          <Dropdown.Item onClick={() => handleShowRequirements(task)}><ListChecks size={14} className="me-2"/> المتطلبات</Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card-footer p-2 bg-light">
        <div className="d-flex justify-content-around text-center small">
          <Link to={`/tasks?client_id=${client.id}&status=New`} className="text-decoration-none text-info">
            <div><strong>{stats.new_tasks_count}</strong></div>
            <div>جديدة</div>
          </Link>
          <Link to={`/tasks?client_id=${client.id}&status=Deferred`} className="text-decoration-none text-secondary">
            <div><strong>{stats.deferred_tasks_count}</strong></div>
            <div>مؤجلة</div>
          </Link>
          <Link to={`/tasks?client_id=${client.id}&status=Completed`} className="text-decoration-none text-success">
            <div><strong>{stats.completed_tasks_count}</strong></div>
            <div>مكتملة</div>
          </Link>
          <Link to={`/clients/${client.id}?mode=receivables`} className="text-decoration-none text-danger">
            <div><strong>{stats.total_outstanding.toLocaleString()}</strong></div>
            <div>مستحق</div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DashboardClientCard;