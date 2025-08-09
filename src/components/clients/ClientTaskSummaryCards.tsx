import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Clock, PauseCircle, CheckCircle, DollarSign } from 'lucide-react';
import type { Task } from '../../api/types';

interface ClientTaskSummaryCardsProps {
  tasks: Task[];
  isLoading: boolean;
  clientId: number;
}

const ClientTaskSummaryCards = ({ tasks, isLoading, clientId }: ClientTaskSummaryCardsProps) => {
    const { t } = useTranslation();
    
    const stats = useMemo(() => {
        if (!tasks?.length) {
            return {
                newTasks: 0,
                deferredTasks: 0,
                completedTasks: 0,
                totalAmount: 0
            };
        }

        return {
            newTasks: tasks.filter(task => task.status === 'New').length,
            deferredTasks: tasks.filter(task => task.status === 'Deferred').length,
            completedTasks: tasks.filter(task => task.status === 'Completed').length,
            totalAmount: tasks.reduce((sum, task) => sum + task.amount, 0)
        };
    }, [tasks]);
    
    const cardData = [
        { 
            to: `/tasks?client_id=${clientId}&status=New`, 
            icon: Clock, 
            label: t('status.New'), 
            value: stats.newTasks, 
            className: 'border-gold-dark',
            iconClass: 'text-gradient-gold',
            textClass: 'text-gradient-gold-dark'
        },
        { 
            to: `/tasks?client_id=${clientId}&status=Deferred`, 
            icon: PauseCircle, 
            label: t('status.Deferred'), 
            value: stats.deferredTasks, 
            className: 'border-red-gold',
            iconClass: 'text-gradient-red-gold',
            textClass: 'text-gradient-red-gold'
        },
        { 
            to: `/tasks?client_id=${clientId}&status=Completed`, 
            icon: CheckCircle, 
            label: t('status.Completed'), 
            value: stats.completedTasks, 
            className: 'border-green-gold',
            iconClass: 'text-gradient-green-gold',
            textClass: 'text-gradient-green-gold'
        },
        { 
            to: `/clients/${clientId}?mode=tasks`, 
            icon: DollarSign, 
            label: t('clientProfile.totalTasksValue'), 
            value: `${stats.totalAmount.toLocaleString()}`, 
            className: 'border-gold-dark-main',
            iconClass: 'text-gradient-gold-dark',
            textClass: 'text-gradient-gold-dark'
        }
    ];

    if (isLoading) {
        return (
            <div className="row g-3 mb-4">
                {[1, 2, 3, 4].map(i => (
                    <div className="col-md-3" key={i}>
                        <div className="card card-body border-0 shadow-sm p-4 text-center">
                            <div className="skeleton skeleton-title mx-auto mb-3" style={{ width: '60px', height: '60px', borderRadius: '50%' }}></div>
                            <div className="skeleton skeleton-title mx-auto" style={{ width: '70px', height: '36px' }}></div>
                            <div className="skeleton skeleton-text mx-auto" style={{ width: '100px' }}></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="row g-3 mb-4">
            {cardData.map(card => (
                <div className="col-md-3" key={card.label}>
                    <Link to={card.to} className="text-decoration-none">
                        <div className={`card border-2 shadow-lg hover-shadow h-100 ${card.className}`} style={{boxShadow: '0 4px 15px rgba(212, 175, 55, 0.2)'}}>
                            <div className="card-body text-center p-4">
                                <div className="stats-icon mb-3">
                                    <card.icon className={card.iconClass} size={40} strokeWidth={1.5} />
                                </div>
                                <h2 className={`stats-number mb-1 ${card.textClass}`}>{card.value}</h2>
                                <p className="stats-label text-muted mb-0">{card.label}</p>
                            </div>
                        </div>
                    </Link>
                </div>
            ))}
        </div>
    );
};

export default ClientTaskSummaryCards;
