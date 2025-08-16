import { Link } from 'react-router-dom';
import { Clock, PauseCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import SaudiRiyalIcon from '../ui/SaudiRiyalIcon';
import { useReceivablesPermissions } from '../../hooks/useReceivablesPermissions';

interface TaskStatusCardsProps {
  stats: {
    new_tasks: number;
    deferred_tasks: number;
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
            <div className="row g-3">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div className="col-md-2" key={i}>
                        <div 
                            className="card border-0 shadow-sm h-100"
                            style={{ 
                                backgroundColor: '#f8fafc',
                                borderRadius: '8px'
                            }}
                        >
                            <div className="card-body text-center p-3">
                                <div 
                                    className="skeleton mx-auto mb-2" 
                                    style={{ 
                                        width: '24px', 
                                        height: '24px', 
                                        borderRadius: '4px',
                                        backgroundColor: '#e2e8f0'
                                    }}
                                ></div>
                                <div 
                                    className="skeleton mx-auto mb-1" 
                                    style={{ 
                                        width: '32px', 
                                        height: '24px',
                                        backgroundColor: '#e2e8f0',
                                        borderRadius: '4px'
                                    }}
                                ></div>
                                <div 
                                    className="skeleton mx-auto" 
                                    style={{ 
                                        width: '60px', 
                                        height: '14px',
                                        backgroundColor: '#e2e8f0',
                                        borderRadius: '4px'
                                    }}
                                ></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="row g-3 mb-4">
            {cardData.map(card => {
                const CardContent = (
                    <div 
                        className="card border-0 shadow-sm h-100"
                        style={{ 
                            backgroundColor: card.bgColor,
                            borderLeft: `3px solid ${card.borderColor}`,
                            borderRadius: '8px',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <div className="card-body text-center p-3">
                            <div className="d-flex align-items-center justify-content-center mb-2">
                                {card.icon === SaudiRiyalIcon ? (
                                    <SaudiRiyalIcon 
                                        size={24} 
                                        style={{ color: card.iconColor }}
                                    />
                                ) : (
                                    <card.icon 
                                        size={24} 
                                        strokeWidth={1.5} 
                                        style={{ color: card.iconColor }}
                                    />
                                )}
                            </div>
                            <h4 
                                className="mb-1 fw-semibold" 
                                style={{ 
                                    color: card.textColor,
                                    fontSize: '1.5rem',
                                    lineHeight: '1.2'
                                }}
                            >
                                {(card.label === 'مستحقات مسددة' || card.label === 'مستحقات متأخرة') 
                                    ? (typeof card.value === 'number' ? card.value.toLocaleString('ar-SA') : card.value)
                                    : card.value}
                            </h4>
                            <p 
                                className="mb-0" 
                                style={{ 
                                    color: card.textColor,
                                    fontSize: '0.75rem',
                                    fontWeight: '500',
                                    opacity: '0.8'
                                }}
                            >
                                {card.label}
                            </p>
                        </div>
                    </div>
                );

                if (card.isClickable === false) {
                    return (
                        <div className="col-md-2" key={card.label}>
                            {CardContent}
                        </div>
                    );
                }

                return (
                    <div className="col-md-2" key={card.label}>
                        <Link 
                            to={card.to} 
                            className="text-decoration-none"
                            style={{
                                display: 'block',
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
                    </div>
                );
            })}
        </div>
    );
};

export default TaskStatusCards;