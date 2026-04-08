import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { User, Check, Pause, ListChecks, Phone } from 'lucide-react';
import { useModalStore } from '@/shared/stores/modalStore';
import { useToast } from '@/shared/hooks/useToast';
import { useDeferTask } from '@/features/tasks/api/taskQueries';
import type { TagTaskCardProps } from '@/features/tags/types/tagTypes';
import { formatDate } from '@/shared/utils/dateUtils';

const TagTaskCard = ({ task, index = 0 }: TagTaskCardProps) => {
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
                queryClient.invalidateQueries({ queryKey: ['tags'] });
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
    const backgroundColor = index % 2 === 0 ? 'var(--primitive-gray-50)' : 'var(--token-bg-surface)';
    
    // Professional color scheme
    const borderColor = isUrgent ? 'var(--token-status-danger-border)' : 'var(--token-border-default)';
    const borderWidth = isUrgent ? '2px' : '1px';

    // Safety check - if client data is missing, return null or loading state
    if (!task.client) {
        console.warn('Task missing client data:', task);
        return null;
    }

    return (
        <div 
            className="tag-task-card"
            style={{ 
                backgroundColor,
                border: `${borderWidth} solid ${borderColor}`,
                borderRadius: '8px',
                fontSize: '13px',
                transition: 'all 0.2s ease',
                margin: '8px 0'
            }}
        >
            {/* Header - Client Info */}
            <div className="task-header p-2 border-b" style={{ borderColor: 'var(--token-border-default)' }}>
                <div className="flex justify-between items-center">
                    <div className="client-info flex-1">
                        <h6 className="client-name mb-1 font-semibold" style={{ 
                            fontSize: '14px',
                            color: 'var(--token-text-primary)'
                        }}>
                            {task.client.name}
                        </h6>
                        <div className="flex items-center gap-2">
                            <span style={{ 
                                fontSize: '11px',
                                color: 'var(--token-text-primary)'
                            }}>
                                {task.client.phone}
                            </span>
                        </div>
                    </div>
                    <div className="client-actions flex gap-1">
                        <Link 
                            to={`/clients/${task.client.id}`} 
                            className="p-1 rounded hover:bg-status-info-bg transition-colors"
                            style={{ 
                                fontSize: '10px',
                                backgroundColor: 'var(--token-status-info-bg)',
                                color: 'var(--token-status-info-text)',
                                border: '1px solid var(--token-status-info-border)'
                            }}
                            title="ملف العميل"
                        >
                            <User size={12} />
                        </Link>
                        {task.client.phone && (
                            <a 
                                href={getWhatsAppLink(task.client.phone)} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="p-1 rounded hover:bg-status-success-bg transition-colors"
                                style={{ 
                                    fontSize: '10px',
                                    backgroundColor: 'var(--token-status-info-bg)',
                                    color: 'var(--color-whatsapp)',
                                    border: '1px solid var(--token-status-info-border)'
                                }}
                                title="واتساب"
                            >
                                <Phone size={12} />
                            </a>
                        )}
                    </div>
                </div>
            </div>

            {/* Body - Task Details */}
            <div className="task-body p-2 border-b" style={{ borderColor: 'var(--token-border-default)' }}>
                <h6 className="task-title mb-1 font-medium" style={{ 
                    fontSize: '13px',
                    color: 'var(--token-text-primary)'
                }}>
                    {task.task_name || t(`type.${task.type}`)}
                </h6>
                <div className="task-meta flex items-center gap-2 mb-1">
                    <span style={{ 
                        fontSize: '11px',
                        color: 'var(--token-text-primary)'
                    }}>
                        {formatDate(task.start_date)}
                    </span>
                    <span style={{ 
                        fontSize: '11px',
                        color: 'var(--token-text-primary)'
                    }}>
                        {task.amount} ر.س
                    </span>
                    {isUrgent && (
                        <span className="px-2 py-0.5 rounded bg-red-600 text-white text-xs">
                            عاجل
                        </span>
                    )}
                </div>
                {task.notes && (
                    <p className="task-notes mb-0 p-1 rounded" style={{ 
                        backgroundColor: 'var(--token-bg-surface-muted)',
                        border: '1px solid var(--token-border-default)',
                        fontSize: '11px',
                        lineHeight: '1.3',
                        color: 'var(--token-text-primary)'
                    }}>
                        {task.notes}
                    </p>
                )}
            </div>

            {/* Footer - Actions */}
            <div className="task-footer p-2">
                <div className="flex gap-1">
                    <button
                        onClick={handleComplete}
                        className="flex-1 flex items-center justify-center gap-1 rounded hover:bg-status-success-bg transition-colors"
                        style={{ 
                            fontSize: '11px', 
                            padding: '6px 8px',
                            backgroundColor: 'var(--token-status-success-bg)',
                            color: 'var(--token-status-success-text)',
                            border: '1px solid var(--token-status-success-border)'
                        }}
                        title="إكمال المهمة"
                    >
                        <Check size={12} />
                        <span>إكمال</span>
                    </button>
                    <button
                        onClick={handleDefer}
                        className="flex-1 flex items-center justify-center gap-1 rounded hover:bg-bg-surface-muted transition-colors"
                        style={{ 
                            fontSize: '11px', 
                            padding: '6px 8px',
                            backgroundColor: 'var(--token-status-neutral-bg)',
                            color: 'var(--token-status-neutral-text)',
                            border: '1px solid var(--token-status-neutral-border)'
                        }}
                        title="تأجيل المهمة"
                    >
                        <Pause size={12} />
                        <span>تأجيل</span>
                    </button>
                    <button
                        onClick={handleShowRequirements}
                        className="rounded hover:bg-status-warning-bg transition-colors"
                        style={{ 
                            fontSize: '11px',
                            padding: '6px 8px',
                            backgroundColor: 'var(--token-status-warning-bg)',
                            color: 'var(--token-status-warning-text)',
                            border: '1px solid var(--token-status-warning-border)'
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

export default TagTaskCard;
