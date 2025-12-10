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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="rounded-lg border border-border bg-card shadow-sm p-6 text-center">
                        <div className="w-16 h-16 rounded-full bg-muted/30 animate-pulse mx-auto mb-3"></div>
                        <div className="h-9 w-20 bg-muted/30 animate-pulse rounded mx-auto mb-2"></div>
                        <div className="h-4 w-24 bg-muted/30 animate-pulse rounded mx-auto"></div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {cardData.map(card => (
                <Link to={card.to} key={card.label} className="no-underline hover:-translate-y-1 transition-transform duration-200">
                    <div className={`rounded-lg border-2 shadow-lg h-full ${card.className}`} style={{boxShadow: '0 4px 15px rgba(59, 130, 246, 0.15)'}}>
                        <div className="text-center p-6">
                            <div className="mb-3">
                                <card.icon className={card.iconClass} size={48} strokeWidth={1.5} />
                            </div>
                            <h2 className={`text-4xl font-bold mb-1 ${card.textClass}`}>{card.value}</h2>
                            <p className="text-black mb-0">{card.label}</p>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    );
};

export default ClientTaskSummaryCards;
