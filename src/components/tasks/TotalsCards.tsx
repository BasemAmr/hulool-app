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
      className: 'border-start border-4 border-info',
      bgClass: 'bg-info bg-opacity-10',
      textClass: 'text-info'
    },
    {
      label: t('status.Deferred'),
      value: deferredTasks,
      className: 'border-start border-4 border-warning',
      bgClass: 'bg-warning bg-opacity-10',
      textClass: 'text-warning'
    },
    {
      label: t('status.Completed'),
      value: completedTasks,
      className: 'border-start border-4 border-success',
      bgClass: 'bg-success bg-opacity-10',
      textClass: 'text-success'
    },
    {
      label: t('dashboard.totalClients'),
      value: totalClients,
      className: 'border-start border-4 border-primary',
      bgClass: 'bg-primary bg-opacity-10',
      textClass: 'text-primary'
    }
  ];

  if (isLoading) {
    return (
      <div className="d-flex gap-3">
        {[1, 2, 3, 4].map(i => (
          <div className="flex-fill" key={i}>
            <div className="d-flex align-items-center p-2 rounded-3 border" style={{ minHeight: '60px' }}>
              <div className="flex-grow-1 text-center">
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
    <div className="d-flex gap-3">
      {cardData.map((card, index) => (
        <div className="flex-fill" key={index}>
          <div className={`d-flex align-items-center p-2 rounded-3 ${card.className} ${card.bgClass}`} style={{ minHeight: '60px' }}>
            <div className="flex-grow-1 text-center">
              <h5 className={`mb-0 fw-bold ${card.textClass}`} style={{ fontSize: '1.2rem' }}>{card.value}</h5>
              <p className="text-muted mb-0" style={{ fontSize: '0.75rem' }}>{card.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TotalsCards;
