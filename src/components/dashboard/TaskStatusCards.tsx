import { Link } from 'react-router-dom';
import { Clock, PauseCircle, CheckCircle, AlertTriangle, ClipboardCheck } from 'lucide-react';
import SaudiRiyalIcon from '../ui/SaudiRiyalIcon';
import { useReceivablesPermissions } from '../../hooks/useReceivablesPermissions';

interface TaskStatusCardsProps {
  stats: {
    new_tasks: number;
    deferred_tasks: number;
    pending_review_tasks?: number;
    completed_tasks: number;
    late_tasks: number;
    late_receivables: number;
    total_unpaid_amount?: number;
  };
  totalPaidAmount?: number;
  isLoading: boolean;
}

const TaskStatusCards = ({ stats, totalPaidAmount = 0, isLoading }: TaskStatusCardsProps) => {
    const { hasViewAmountsPermission, hasViewPaidReceivablesPermission, hasViewOverdueReceivablesPermission } = useReceivablesPermissions();
    const cardData = [
        { 
            to: '/tasks?status=New', 
            icon: Clock, 
            label: 'مهام جديدة', 
            value: stats.new_tasks, 
            bgColor: '#FCE7D4', // Light brown/beige like in the image
            borderColor: '#ff4444',
            iconColor: '#c21818a8',
            textColor: '#c21818a8'
        },
        { 
            to: '/tasks?status=Deferred', 
            icon: PauseCircle, 
            label: 'مهام مؤجلة', 
            bgColor: '#EECECF', // Bright red like in the image
            value: stats.deferred_tasks, 
            borderColor: '#22c55e',
            iconColor: '#c21818a8',
            textColor: '#c21818a8'
        },
        { 
            to: '/tasks?status=Pending Review', 
            icon: ClipboardCheck, 
            label: 'مهام قيد المراجعة', 
            bgColor: '#FFF4E6', // Light orange
            value: stats.pending_review_tasks || 0, 
            borderColor: '#FF8C00',
            iconColor: '#FF8C00',
            textColor: '#FF8C00'
        },
        { 
            to: '/tasks?status=Completed', 
            icon: CheckCircle, 
            label: 'مهام مكتملة', 
            value: stats.completed_tasks, 
            borderColor: '#22c55e',
            bgColor: '#E1EED2', // Bright green like in the image
            iconColor: '#c21818a8',
            textColor: '#c21818a8'
        },
        { 
            to: '/tasks?status=Late', 
            icon: AlertTriangle, 
            label: 'مهام متأخرة', 
            value: stats.late_tasks, 
            bgColor: '#DA9E9E', // Light pink like in the image
            borderColor: '#ffb5b5',
            iconColor: '#c21818a8',
            textColor: '#991b1b',
            isClickable: true
        },
        { 
            to: '/financial-center/invoices?status=paid', 
            icon: SaudiRiyalIcon, 
            label: 'مستحقات مسددة', 
            value: hasViewAmountsPermission ? totalPaidAmount : '***', 
                        bgColor: '#19AA41', // Orange/yellow like in the image

            borderColor: '#f0a500',
            iconColor: '#ffffff',
            textColor: '#ffffff',
            isClickable: hasViewPaidReceivablesPermission
        },
        { 
            to: '/financial-center/invoices?status=overdue', 
            icon: SaudiRiyalIcon, 
            label: 'مستحقات متأخرة', 
            value: hasViewAmountsPermission ? (stats.total_unpaid_amount || 0) : '***', 
            bgColor: '#F80000', // Light cream/beige like in the image
            borderColor: '#ffe4b5',
            iconColor: '#ffffff',
            textColor: '#ffffff',
            isClickable: hasViewOverdueReceivablesPermission
        }
    ];
    
    if (isLoading) {
        return (
            <div className="flex gap-3 flex-wrap">
                {[1, 2, 3, 4, 5, 6, 7].map(i => (
                    <div 
                        key={i} 
                        className="rounded-lg shadow-md bg-muted/30 min-w-[140px] flex-1"
                    >
                        <div className="p-2">
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded bg-muted-foreground/20 animate-pulse"></div>
                                <div className="flex-1">
                                    <div className="h-2.5 w-12 bg-muted-foreground/20 rounded mb-1 animate-pulse"></div>
                                    <div className="h-4 w-8 bg-muted-foreground/20 rounded animate-pulse"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="flex gap-3 mb-4 flex-wrap">
            {cardData.map(card => {
                const CardContent = (
                    <div 
                        className="rounded-lg shadow-md border-l-4 transition-all duration-200 min-w-[140px] flex-1"
                        style={{ 
                            backgroundColor: card.bgColor,
                            borderLeftColor: card.borderColor,
                        }}
                    >
                        <div className="p-2">
                            <div className="flex items-center gap-2">
                                <div className="flex-shrink-0">
                                    {card.icon === SaudiRiyalIcon ? (
                                        <SaudiRiyalIcon 
                                            size={20} 
                                            style={{ color: card.iconColor }}
                                        />
                                    ) : (
                                        <card.icon 
                                            size={20} 
                                            strokeWidth={1.5} 
                                            style={{ color: card.iconColor }}
                                        />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <p 
                                        className="mb-0 text-[0.7rem] font-semibold opacity-90 leading-tight" 
                                        style={{ color: card.textColor }}
                                    >
                                        {card.label}
                                    </p>
                                    <h6 
                                        className="mb-0 font-bold text-base leading-tight" 
                                        style={{ color: card.textColor }}
                                    >
                                        {(card.label === 'مستحقات مسددة' || card.label === 'مستحقات متأخرة') 
                                            ? (typeof card.value === 'number' ? card.value.toLocaleString('ar-SA') : card.value)
                                            : card.value}
                                    </h6>
                                </div>
                            </div>
                        </div>
                    </div>
                );

                if (card.isClickable === false) {
                    return CardContent;
                }

                return (
                    <Link 
                        key={card.label}
                        to={card.to} 
                        className="no-underline flex-1 min-w-[140px] transition-transform duration-200 hover:-translate-y-0.5"
                    >
                        {CardContent}
                    </Link>
                );
            })}
        </div>
    );
};

export default TaskStatusCards;