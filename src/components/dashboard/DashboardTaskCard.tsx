import type { Task } from '../../api/types';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useModalStore } from '../../stores/modalStore';
import { useDeferTask } from '../../queries/taskQueries';
import { useToast } from '../../hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Pause, ListChecks, User, DollarSign, MessageCircle } from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';
import { formatTimeElapsed } from '../../utils/timeUtils';


interface DashboardTaskCardProps {
    task: Task;
    index?: number; // For alternating background colors
}

const DashboardTaskCard = ({ task, index = 0 }: DashboardTaskCardProps) => {
    const { t } = useTranslation();
    const openModal = useModalStore(state => state.openModal);
    const { success, error } = useToast();
    const queryClient = useQueryClient();
    const deferTaskMutation = useDeferTask();

    const getWhatsAppLink = (phone: string) => `https://wa.me/+966${phone}`;

    const handleComplete = () => {
        openModal('taskCompletion', { task });
    };

    const handleDefer = () => {
        deferTaskMutation.mutate({ id: task.id }, {
            onSuccess: () => {
                success(t('tasks.deferSuccess'), t('tasks.deferSuccessMessage', {
                    taskName: task.task_name || t(`type.${task.type}`)
                }));
                queryClient.invalidateQueries({ queryKey: ['dashboard'] });
                queryClient.invalidateQueries({ queryKey: ['tasks'] });
            },
            onError: (err: any) => {
                error(t('common.error'), err.message || t('tasks.deferError'));
            }
        });
    };

    const handleShowRequirements = () => {
        openModal('requirements', { task });
    };

    // Check if task has urgent tag
    const isUrgent = task.tags?.some(tag => tag.name === 'قصوى' && tag.is_system);

    // Alternating background colors - more subtle
    const backgroundColor = index % 2 === 0 ? '#f8fafc' : '#ffffff';

    // Professional color scheme
    const borderColor = isUrgent ? '#f87171' : '#e2e8f0';
    const borderWidth = isUrgent ? '2px' : '1px';

    return (
        <div
            className="dashboard-task-card"
            style={{
                backgroundColor,
                border: `${borderWidth} solid ${borderColor}`,
                borderRadius: '0',
                fontSize: '13px',
                transition: 'all 0.2s ease'
            }}
        >
            {/* Header - Client Info */}
            <div className="task-header p-2 border-bottom" style={{ borderColor: '#e5e7eb' }}>
                <div className="d-flex justify-content-between align-items-center">
                    <div className="client-info flex-1">
                        <h6 className="client-name mb-1 fw-semibold" style={{
                            fontSize: '14px',
                            color: '#374151'
                        }}>
                            {task.client.name}
                        </h6>
                        <div className="d-flex align-items-center gap-2">
                            <span style={{
                                fontSize: '12px',
                                color: '#6b7280'
                            }}>
                                {task.client.phone}
                            </span>
                            <a
                                href={getWhatsAppLink(task.client.phone)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-sm p-1"
                                style={{
                                    backgroundColor: '#f0fdf7',
                                    color: '#22c55e',
                                    border: '1px solid #d1fae5',
                                    borderRadius: '6px',
                                    fontSize: '10px'
                                }}
                                title="WhatsApp"
                            >
                                <MessageCircle size={12} />
                            </a>
                        </div>
                    </div>
                    <div className="client-actions d-flex gap-1">
                        <Link
                            to={`/clients/${task.client.id}`}
                            className="btn btn-sm p-1"
                            style={{
                                fontSize: '10px',
                                backgroundColor: '#f0f9ff',
                                color: '#3b82f6',
                                border: '1px solid #e0f2fe',
                                borderRadius: '6px'
                            }}
                            title="ملف العميل"
                        >
                            <User size={12} />
                        </Link>
                        <Link
                            to={`/clients/${task.client.id}?mode=receivables`}
                            className="btn btn-sm p-1"
                            style={{
                                fontSize: '10px',
                                backgroundColor: '#f0fdf7',
                                color: '#22c55e',
                                border: '1px solid #d1fae5',
                                borderRadius: '6px'
                            }}
                            title="المستحقات"
                        >
                            <DollarSign size={12} />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Body - Task Details */}
            <div className="task-body p-2 border-bottom" style={{ borderColor: '#e5e7eb' }}>
                <div className="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 className="task-title mb-1 fw-medium" style={{
                            fontSize: '13px',
                            color: '#374151'
                        }}>
                            {task.task_name || t(`type.${task.type}`)}
                        </h6>
                    </div>
                    {typeof task.amount === 'number' && (
                        <span
                            className="badge"
                            style={{
                                fontSize: '11px',
                                backgroundColor: '#f0f9ff',
                                color: '#0ea5e9',
                                border: '1px solid #bae6fd',
                                borderRadius: '4px',
                                padding: '2px 8px',
                                marginLeft: '8px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                            }}
                            title={t('tasks.amount')}
                        >
                            <span>{task.amount.toLocaleString()}</span>
                            <svg
                                width={13}
                                height={13}
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
                        </span>
                    )}
                </div>
                <div className="task-meta d-flex align-items-center gap-2 mb-1">
                    <span style={{
                        fontSize: '11px',
                        color: '#6b7280'
                    }}>
                        <i className="fas fa-calendar-alt me-1" style={{ color: '#fbbf24' }}></i>
                        {formatDate(task.start_date)}
                    </span>
                    <span style={{
                        fontSize: '11px',
                        color: '#6b7280'
                    }}>
                        {formatTimeElapsed(task.start_date)}
                    </span>
                    {isUrgent && (
                        <span
                            className="badge"
                            style={{
                                fontSize: '9px',
                                backgroundColor: '#fef7f7',
                                color: '#f43f5e',
                                border: '1px solid #fecdd3',
                                borderRadius: '4px',
                                padding: '2px 6px'
                            }}
                        >
                            عاجل
                        </span>
                    )}
                </div>
                {task.notes && (
                    <p className="task-notes mb-0 p-1 rounded" style={{
                        backgroundColor: '#f9fafb',
                        border: '1px solid #f3f4f6',
                        fontSize: '11px',
                        lineHeight: '1.3',
                        color: '#4b5563'
                    }}>
                        {task.notes}
                    </p>
                )}
            </div>

            {/* Footer - Actions */}
            <div className="task-footer p-2">
                <div className="d-flex gap-1">
                    <button
                        onClick={handleComplete}
                        className="flex-1 d-flex align-items-center justify-content-center gap-1"
                        style={{
                            fontSize: '11px',
                            padding: '6px 8px',
                            backgroundColor: '#f0fdf7',
                            color: '#22c55e',
                            border: '1px solid #d1fae5',
                            borderRadius: '6px'
                        }}
                        title="إكمال المهمة"
                    >
                        <Check size={12} />
                        <span>إكمال</span>
                    </button>
                    <button
                        onClick={handleDefer}
                        className="flex-1 d-flex align-items-center justify-content-center gap-1"
                        style={{
                            fontSize: '11px',
                            padding: '6px 8px',
                            backgroundColor: '#fafafa',
                            color: '#71717a',
                            border: '1px solid #e4e4e7',
                            borderRadius: '6px'
                        }}
                        title="تأجيل المهمة"
                    >
                        <Pause size={12} />
                        <span>تأجيل</span>
                    </button>
                    <button
                        onClick={handleShowRequirements}
                        className=""
                        style={{
                            fontSize: '11px',
                            padding: '6px 8px',
                            backgroundColor: '#fffbeb',
                            color: '#f59e0b',
                            border: '1px solid #fde68a',
                            borderRadius: '6px'
                        }}
                        title="المتطلبات"
                    >
                        <ListChecks size={12} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DashboardTaskCard;