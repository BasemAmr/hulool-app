import type { Task } from '../../api/types';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Button from '../ui/Button';
import { Edit, Pause, Play, CheckCircle, ExternalLink, MessageCircle, DollarSign, Trash2, FileText } from 'lucide-react';
import { useDeferTask, useResumeTask } from '../../queries/taskQueries';
import { useToast } from '../../hooks/useToast';
import {useCurrentUserCapabilities } from '../../queries/userQueries';

interface AllTasksTableProps {
  tasks: Task[];
  isLoading: boolean;
  onEdit: (task: Task) => void;
  onComplete: (task: Task) => void;
  onViewAmountDetails?: (task: Task) => void;
  onDelete: (task: Task) => void;
  onShowRequirements?: (task: Task) => void;
}

const AllTasksTable = ({ tasks, isLoading, onEdit, onComplete, onViewAmountDetails, onDelete, onShowRequirements }: AllTasksTableProps) => {
  const { t } = useTranslation();
  const deferTaskMutation = useDeferTask();
  const resumeTaskMutation = useResumeTask();
  const { data: currentCapabilities } = useCurrentUserCapabilities();
  const { success, error } = useToast();
  
  if (isLoading) {
    return <div className="p-4 text-center">Loading tasks...</div>;
  }
  
  if (!tasks.length) {
    return <div className="p-4 text-center text-muted">{t('common.noResults')}</div>;
  }
  const canDeleteTasks = currentCapabilities?.tm_delete_any_task || false;

  // Sort tasks: Newest Urgent first, then Urgent, then newest normal tasks
  const sortedTasks = [...tasks].sort((a, b) => {
    const aIsUrgent = a.tags?.some(tag => tag.name === 'قصوى') || false;
    const bIsUrgent = b.tags?.some(tag => tag.name === 'قصوى') || false;
    const aDate = new Date(a.created_at || a.start_date).getTime();
    const bDate = new Date(b.created_at || b.start_date).getTime();

    // If both urgent or both normal, sort by newest first
    if (aIsUrgent && bIsUrgent) {
      return bDate - aDate; // Newest urgent first
    }
    if (!aIsUrgent && !bIsUrgent) {
      return bDate - aDate; // Newest normal first
    }
    
    // Urgent tasks always come first
    return aIsUrgent ? -1 : 1;
  });

  // Handle defer task
  const handleDefer = (task: Task) => {
    deferTaskMutation.mutate({ id: task.id }, {
      onSuccess: () => {
        success(t('tasks.deferSuccess'), t('tasks.deferSuccessMessage', {
          taskName: task.task_name || t(`type.${task.type}`)
        }));
      },
      onError: (err: any) => {
        error(t('common.error'), err.message || t('tasks.deferError'));
      }
    });
  };

  // Handle resume task
  const handleResume = (task: Task) => {
    resumeTaskMutation.mutate({ id: task.id }, {
      onSuccess: () => {
        success(t('tasks.resumeSuccess'), t('tasks.resumeSuccessMessage', {
          taskName: task.task_name || t(`type.${task.type}`)
        }));
      },
      onError: (err: any) => {
        error(t('common.error'), err.message || t('tasks.resumeError'));
      }
    });
  };

  // Helper function to get type background color
  const getTypeRowStyle = (type: string) => {
    switch (type) {
      case 'Government':
        return { backgroundColor: 'rgba(74, 162, 255, 0.01)' }; // bright blue - increased opacity
      case 'RealEstate':
        return { backgroundColor: 'rgba(90, 175, 110, 0.1)' }; // bright green - increased opacity
      case 'Accounting':
        return { backgroundColor: 'rgba(248, 220, 61, 0.1)' }; // bright yellow - increased opacity
      default:
        return { backgroundColor: 'rgba(206, 208, 209, 0.1)' }; // bright grey - increased opacity
    }
  };

  // Helper function to get status badge style
  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'New':
        return { backgroundColor: 'rgba(255, 215, 0, 0.2)', color: '#B8860B', border: '1px solid rgba(255, 215, 0, 0.3)' }; // bright faint gold
      case 'Deferred':
        return { backgroundColor: 'rgba(220, 53, 69, 0.2)', color: '#DC3545', border: '1px solid rgba(220, 53, 69, 0.3)' }; // bright faint red
      case 'Completed':
        return { backgroundColor: 'rgba(40, 167, 69, 0.2)', color: '#28A745', border: '1px solid rgba(40, 167, 69, 0.3)' }; // bright faint green
      default:
        return { backgroundColor: 'rgba(108, 117, 125, 0.2)', color: '#6C757D', border: '1px solid rgba(108, 117, 125, 0.3)' };
    }
  };

  // Helper function to format WhatsApp URL
  const getWhatsAppUrl = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? `966${cleanPhone.substring(1)}` : `966${cleanPhone}`;
    return `https://wa.me/${formattedPhone}`;
  };

  return (
    <div className="table-responsive">
      <table className="table table-hover mb-0" style={{ '--bs-table-hover-bg': 'transparent' } as React.CSSProperties}>
        <thead>
          <tr>
            <th>{t('tasks.tableHeaderClient')}</th>
            <th>{t('tasks.tableHeaderClientPhone')}</th>
            <th>{t('tasks.tableHeaderService')}</th>
            <th>{t('tasks.tableHeaderType')}</th>
            <th>{t('tasks.tableHeaderNotes')}</th>
            <th>{t('tasks.tableHeaderStatus')}</th>
            <th className="text-end">{t('tasks.tableHeaderActions')}</th>
          </tr>
        </thead>
        <tbody>
          {sortedTasks.map((task) => {
            const isUrgent = task.tags?.some(tag => tag.name === 'قصوى');
            const typeStyle = getTypeRowStyle(task.type);
            const statusStyle = getStatusBadgeStyle(task.status);
            
            return (
              <tr 
                key={task.id} 
                style={{
                  ...typeStyle,
                  backgroundColor: `${typeStyle.backgroundColor} !important` // Force the background color
                }} 
                className={`task-row-${task.type.toLowerCase()} ${isUrgent ? 'border-danger border-2' : ''}`}
              >
                {/* العميل - Client with phone and WhatsApp */}
                <td>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <Link 
                        to={`/clients/${task.client.id}?mode=tasks`} 
                        className="fw-bold text-primary text-decoration-none"
                      >
                        {task.client.name}
                      </Link>
                    </div>
                  </div>
                </td>

                <td className='text-center'>
                  <div className="d-flex align-items-center justify-content-center gap-1">
                      <span className="small text-muted">{task.client.phone}</span>
                      <a 
                        href={getWhatsAppUrl(task.client.phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm p-1 text-success"
                        title="فتح واتساب"
                        style={{ fontSize: '12px' }}
                      >
                        <MessageCircle size={14} />
                      </a>
                    </div>
                </td>

                {/* الخدمة المقدمة - Service/Task name */}
                <td>
                  <div className="fw-medium">
                    {task.task_name || t(`type.${task.type}`)}
                  </div>
                </td>

                {/* النوع - Type */}
                <td>
                  <span className="fw-medium">{t(`type.${task.type}`)}</span>
                </td>

                {/* الملاحظات - Notes */}
                <td>
                  <div className="small text-muted" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {task.notes || '—'}
                  </div>
                </td>

                {/* الحالة - Status */}
                <td>
                  <span 
                    className="badge rounded-pill px-3 py-1"
                    style={statusStyle}
                  >
                    {t(`status.${task.status}`)}
                  </span>
                </td>

                {/* الاجراءات - Actions */}
                <td className="text-end">
                  <div className="d-flex justify-content-end gap-1">
                    {/* Google Drive Link */}
                    {task.client.google_drive_link && (
                      <a
                        href={task.client.google_drive_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline-primary btn-sm"
                        title="فتح Google Drive"
                      >
                        <ExternalLink size={16} />
                      </a>
                    )}

                    {/* Amount Details Button */}
                    {task.amount_details && task.amount_details.length > 0 && (
                      <Button 
                        variant="outline-primary" 
                        size="sm" 
                        onClick={() => onViewAmountDetails && onViewAmountDetails(task)} 
                        title="عرض تفاصيل المبلغ"
                        style={{ 
                          borderColor: '#17a2b8', 
                          color: '#17a2b8' 
                        }}
                      >
                        <DollarSign size={16} />
                      </Button>
                    )}

                    {/* Status Actions */}
                    {task.status === 'New' && (
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => handleDefer(task)} 
                        title="تأجيل"
                        style={{ 
                          backgroundColor: 'rgba(255, 193, 7, 0.9)', 
                          borderColor: 'rgba(255, 193, 7, 0.9)', 
                          color: '#000',
                          fontWeight: 'bold'
                        }}
                      >
                        <Pause size={16} />
                      </Button>
                    )}
                    
                    {task.status === 'Deferred' && (
                      <Button 
                        variant="primary" 
                        size="sm" 
                        onClick={() => handleResume(task)} 
                        title="استئناف"
                        style={{ 
                          backgroundColor: 'rgba(23, 162, 184, 0.9)', 
                          borderColor: 'rgba(23, 162, 184, 0.9)',
                          color: '#fff',
                          fontWeight: 'bold'
                        }}
                      >
                        <Play size={16} />
                      </Button>
                    )}

                    {task.status !== 'Completed' && (
                      <Button 
                        variant="primary" 
                        size="sm" 
                        onClick={() => onComplete(task)} 
                        title="إكمال"
                        style={{ 
                          backgroundColor: 'rgba(40, 167, 69, 0.9)', 
                          borderColor: 'rgba(40, 167, 69, 0.9)',
                          color: '#fff',
                          fontWeight: 'bold'
                        }}
                      >
                        <CheckCircle size={16} />
                      </Button>
                    )}

                    {/* Edit Action */}
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      onClick={() => onEdit(task)} 
                      title="تعديل"
                    >
                      <Edit size={16} />
                    </Button>

                    {/* Requirements Action */}
                    {onShowRequirements && (
                      <Button 
                        variant="outline-primary" 
                        size="sm" 
                        onClick={() => onShowRequirements(task)} 
                        title="عرض المتطلبات"
                        style={{ 
                          borderColor: '#17a2b8', 
                          color: '#17a2b8' 
                        }}
                      >
                        <FileText size={16} />
                      </Button>
                    )}

                    {/* Delete Action */}

                    {canDeleteTasks && (
                      <Button 
                        variant="danger" 
                        size="sm" 
                        onClick={() => onDelete(task)} 
                        title="حذف"
                      >
                        <Trash2 size={16} />
                      </Button>
                    )}

                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {/* Custom styles to override Bootstrap table hover effects */}
      <style>{`
        .table tbody tr.task-row-government:hover {
          background-color: rgba(0, 123, 255, 0.15) !important;
        }
        .table tbody tr.task-row-realestate:hover {
          background-color: rgba(40, 167, 69, 0.15) !important;
        }
        .table tbody tr.task-row-accounting:hover {
          background-color: rgba(255, 215, 0, 0.15) !important;
        }
        .table tbody tr.task-row-other:hover {
          background-color: rgba(173, 181, 189, 0.15) !important;
        }
        
        /* Ensure the background colors are applied to all cells */
        .table tbody tr.task-row-government > td {
          background-color: rgba(0, 123, 255, 0.1) !important;
        }
        .table tbody tr.task-row-realestate > td {
          background-color: rgba(40, 167, 69, 0.1) !important;
        }
        .table tbody tr.task-row-accounting > td {
          background-color: rgba(255, 215, 0, 0.1) !important;
        }
        .table tbody tr.task-row-other > td {
          background-color: rgba(173, 181, 189, 0.1) !important;
        }
        
        /* Override Bootstrap's table hover variables */
        .table {
          --bs-table-hover-bg: transparent !important;
          --bs-table-accent-bg: transparent !important;
        }
      `}</style>
    </div>
  );
};

export default AllTasksTable;