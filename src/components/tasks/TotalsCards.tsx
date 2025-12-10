import { useTranslation } from 'react-i18next';
import type { Task } from '../../api/types';

interface TotalsCardsProps {
  tasks: Task[];
  isLoading: boolean;
}

const TotalsCards = ({ tasks, isLoading }: TotalsCardsProps) => {
  const { t } = useTranslation();

  // Calculate counts from filtered tasks
  const newTasks = tasks.filter(task => task.status === 'New').length;
  const deferredTasks = tasks.filter(task => task.status === 'Deferred').length;
  const completedTasks = tasks.filter(task => task.status === 'Completed').length;
  const totalClients = new Set(tasks.map(task => task.client.id)).size;

  const cardData = [
    {
      label: t('status.New'),
      value: newTasks,
      borderClass: 'border-l-4 border-blue-500',
      bgClass: 'bg-blue-500/10',
      textClass: 'text-blue-600'
    },
    {
      label: t('status.Deferred'),
      value: deferredTasks,
      borderClass: 'border-l-4 border-yellow-500',
      bgClass: 'bg-yellow-500/10',
      textClass: 'text-yellow-600'
    },
    {
      label: t('status.Completed'),
      value: completedTasks,
      borderClass: 'border-l-4 border-green-500',
      bgClass: 'bg-green-500/10',
      textClass: 'text-green-600'
    },
    {
      label: t('dashboard.totalClients'),
      value: totalClients,
      borderClass: 'border-l-4 border-primary',
      bgClass: 'bg-primary/10',
      textClass: 'text-primary'
    }
  ];

  if (isLoading) {
    return (
      <div className="flex gap-3">
        {[1, 2, 3, 4].map(i => (
          <div className="flex-1" key={i}>
            <div className="flex items-center p-2 rounded-lg border border-border" style={{ minHeight: '60px' }}>
              <div className="flex-grow text-center">
                <div className="skeleton mx-auto mb-1" style={{ width: '32px', height: '20px', borderRadius: '4px' }}></div>
                <div className="skeleton mx-auto" style={{ width: '60px', height: '12px', borderRadius: '4px' }}></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      {cardData.map((card, index) => (
        <div className="flex-1" key={index}>
          <div className={`flex items-center p-2 rounded-lg ${card.borderClass} ${card.bgClass}`} style={{ minHeight: '60px' }}>
            <div className="flex-grow text-center">
              <h5 className={`mb-0 font-bold ${card.textClass}`} style={{ fontSize: '1.2rem' }}>{card.value}</h5>
              <p className="text-black mb-0" style={{ fontSize: '0.75rem' }}>{card.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TotalsCards;
