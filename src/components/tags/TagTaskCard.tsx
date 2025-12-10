import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { User, Check, Pause, ListChecks, Phone } from 'lucide-react';
import { useModalStore } from '../../stores/modalStore';
import { useToast } from '../../hooks/useToast';
import { useDeferTask } from '../../queries/taskQueries';
import type { TagTaskCardProps } from '../../types/tagTypes';
import { formatDate } from '../../utils/dateUtils';

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
    const backgroundColor = index % 2 === 0 ? '#f8fafc' : '#ffffff';
    
    // Professional color scheme
    const borderColor = isUrgent ? '#f87171' : '#e2e8f0';
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
            <div className="task-header p-2 border-b" style={{ borderColor: '#e5e7eb' }}>
                <div className="flex justify-between items-center">
                    <div className="client-info flex-1">
                        <h6 className="client-name mb-1 font-semibold" style={{ 
                            fontSize: '14px',
                            color: '#374151'
                        }}>
                            {task.client.name}
                        </h6>
                        <div className="flex items-center gap-2">
                            <span style={{ 
                                fontSize: '11px',
                                color: '#6b7280'
                            }}>
                                {task.client.phone}
                            </span>
                        </div>
                    </div>
                    <div className="client-actions flex gap-1">
                        <Link 
                            to={`/clients/${task.client.id}`} 
                            className="p-1 rounded hover:bg-blue-50 transition-colors"
                            style={{ 
                                fontSize: '10px',
                                backgroundColor: '#f0f9ff',
                                color: '#3b82f6',
                                border: '1px solid #e0f2fe'
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
                                className="p-1 rounded hover:bg-green-50 transition-colors"
                                style={{ 
                                    fontSize: '10px',
                                    backgroundColor: '#f0f9ff',
                                    color: '#25D366',
                                    border: '1px solid #e0f2fe'
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
            <div className="task-body p-2 border-b" style={{ borderColor: '#e5e7eb' }}>
                <h6 className="task-title mb-1 font-medium" style={{ 
                    fontSize: '13px',
                    color: '#374151'
                }}>
                    {task.task_name || t(`type.${task.type}`)}
                </h6>
                <div className="task-meta flex items-center gap-2 mb-1">
                    <span style={{ 
                        fontSize: '11px',
                        color: '#6b7280'
                    }}>
                        {formatDate(task.start_date)}
                    </span>
                    <span style={{ 
                        fontSize: '11px',
                        color: '#6b7280'
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
                <div className="flex gap-1">
                    <button
                        onClick={handleComplete}
                        className="flex-1 flex items-center justify-center gap-1 rounded hover:bg-green-100 transition-colors"
                        style={{ 
                            fontSize: '11px', 
                            padding: '6px 8px',
                            backgroundColor: '#f0fdf7',
                            color: '#22c55e',
                            border: '1px solid #d1fae5'
                        }}
                        title="إكمال المهمة"
                    >
                        <Check size={12} />
                        <span>إكمال</span>
                    </button>
                    <button
                        onClick={handleDefer}
                        className="flex-1 flex items-center justify-center gap-1 rounded hover:bg-gray-100 transition-colors"
                        style={{ 
                            fontSize: '11px', 
                            padding: '6px 8px',
                            backgroundColor: '#fafafa',
                            color: '#71717a',
                            border: '1px solid #e4e4e7'
                        }}
                        title="تأجيل المهمة"
                    >
                        <Pause size={12} />
                        <span>تأجيل</span>
                    </button>
                    <button
                        onClick={handleShowRequirements}
                        className="rounded hover:bg-yellow-100 transition-colors"
                        style={{ 
                            fontSize: '11px',
                            padding: '6px 8px',
                            backgroundColor: '#fffbeb',
                            color: '#f59e0b',
                            border: '1px solid #fde68a'
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
