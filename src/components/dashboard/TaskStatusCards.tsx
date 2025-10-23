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
            to: '/receivables/paid', 
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
            to: '/receivables/overdue', 
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
            <div className="d-flex gap-2 flex-wrap">
                {[1, 2, 3, 4, 5, 6, 7].map(i => (
                    <div 
                        key={i} 
                        className="card border-0 shadow-sm"
                        style={{ 
                            backgroundColor: '#f8fafc',
                            borderRadius: '8px',
                            minWidth: '140px',
                            flex: '1 1 auto'
                        }}
                    >
                        <div className="card-body p-2">
                            <div className="d-flex align-items-center gap-2">
                                <div 
                                    className="skeleton" 
                                    style={{ 
                                        width: '20px', 
                                        height: '20px', 
                                        borderRadius: '4px',
                                        backgroundColor: '#e2e8f0'
                                    }}
                                ></div>
                                <div className="flex-grow-1">
                                    <div 
                                        className="skeleton mb-1" 
                                        style={{ 
                                            width: '50px', 
                                            height: '10px',
                                            backgroundColor: '#e2e8f0',
                                            borderRadius: '4px'
                                        }}
                                    ></div>
                                    <div 
                                        className="skeleton" 
                                        style={{ 
                                            width: '30px', 
                                            height: '16px',
                                            backgroundColor: '#e2e8f0',
                                            borderRadius: '4px'
                                        }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="d-flex gap-2 flex-wrap">
            {cardData.map(card => {
                const CardContent = (
                    <div 
                        className="card border-0 shadow-sm"
                        style={{ 
                            backgroundColor: card.bgColor,
                            borderLeft: `3px solid ${card.borderColor}`,
                            borderRadius: '8px',
                            transition: 'all 0.2s ease',
                            minWidth: '140px',
                            flex: '1 1 auto'
                        }}
                    >
                        <div className="card-body p-2">
                            <div className="d-flex align-items-center gap-2">
                                <div className="icon-wrapper">
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
                                <div className="content-wrapper flex-grow-1">
                                    <p 
                                        className="mb-0" 
                                        style={{ 
                                            color: card.textColor,
                                            fontSize: '0.7rem',
                                            fontWeight: '600',
                                            opacity: '0.9',
                                            lineHeight: '1.1'
                                        }}
                                    >
                                        {card.label}
                                    </p>
                                    <h6 
                                        className="mb-0 fw-bold" 
                                        style={{ 
                                            color: card.textColor,
                                            fontSize: '1rem',
                                            lineHeight: '1.2'
                                        }}
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
                        className="text-decoration-none"
                        style={{
                            flex: '1 1 auto',
                            minWidth: '140px',
                            transition: 'transform 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}
                    >
                        {CardContent}
                    </Link>
                );
            })}
        </div>
    );
};

export default TaskStatusCards;