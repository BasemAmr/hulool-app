import { Link } from 'react-router-dom';
import { Clock, PauseCircle, CheckCircle, AlertTriangle, ClipboardCheck } from 'lucide-react';
import SaudiRiyalIcon from '@/shared/ui/icons/SaudiRiyalIcon';
import { useReceivablesPermissions } from '@/shared/hooks/useReceivablesPermissions';

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

interface CardConfig {
  to: string;
  icon: React.ComponentType<any>;
  label: string;
  value: number | string;
  bgClass: string;
  borderClass: string;
  iconClass: string;
  textClass: string;
  isClickable?: boolean;
}

const TaskStatusCards = ({ stats, totalPaidAmount = 0, isLoading }: TaskStatusCardsProps) => {
  const { hasViewAmountsPermission, hasViewPaidReceivablesPermission, hasViewOverdueReceivablesPermission } = useReceivablesPermissions();

  const cardData: CardConfig[] = [
    {
      to: '/tasks?status=New',
      icon: Clock,
      label: 'مهام جديدة',
      value: stats.new_tasks,
      bgClass: 'bg-card',
      borderClass: 'border-border',
      iconClass: 'text-text-primary',
      textClass: 'text-text-primary',
    },
    {
      to: '/tasks?status=Deferred',
      icon: PauseCircle,
      label: 'مهام مؤجلة',
      value: stats.deferred_tasks,
      bgClass: 'bg-card',
      borderClass: 'border-border',
      iconClass: 'text-text-primary',
      textClass: 'text-text-primary',
    },
    {
      to: '/tasks?status=Pending Review',
      icon: ClipboardCheck,
      label: 'مهام قيد المراجعة',
      value: stats.pending_review_tasks || 0,
      bgClass: 'bg-card',
      borderClass: 'border-border',
      iconClass: 'text-text-primary',
      textClass: 'text-text-primary',
    },
    {
      to: '/tasks?status=Completed',
      icon: CheckCircle,
      label: 'مهام مكتملة',
      value: stats.completed_tasks,
      bgClass: 'bg-card',
      borderClass: 'border-border',
      iconClass: 'text-text-primary',
      textClass: 'text-text-primary',
    },
    {
      to: '/tasks?status=Late',
      icon: AlertTriangle,
      label: 'مهام متأخرة',
      value: stats.late_tasks,
      bgClass: 'bg-card',
      borderClass: 'border-border',
      iconClass: 'text-text-primary',
      textClass: 'text-text-primary',
      isClickable: true,
    },
    {
      to: '/financial-center/invoices?status=paid',
      icon: SaudiRiyalIcon,
      label: 'مستحقات مسددة',
      value: hasViewAmountsPermission ? totalPaidAmount : '***',
      bgClass: 'bg-card',
      borderClass: 'border-border',
      iconClass: 'text-text-primary',
      textClass: 'text-text-primary',
      isClickable: hasViewPaidReceivablesPermission,
    },
    {
      to: '/financial-center/invoices?status=overdue',
      icon: SaudiRiyalIcon,
      label: 'مستحقات متأخرة',
      value: hasViewAmountsPermission ? (stats.total_unpaid_amount || 0) : '***',
      bgClass: 'bg-card',
      borderClass: 'border-border',
      iconClass: 'text-text-primary',
      textClass: 'text-text-primary',
      isClickable: hasViewOverdueReceivablesPermission,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex gap-3 flex-wrap">
        {[1, 2, 3, 4, 5, 6, 7].map(i => (
          <div
            key={i}
            className="rounded-lg shadow-sm bg-card border border-border min-w-[140px] flex-1"
          >
            <div className="p-2">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-border-default animate-pulse"></div>
                <div className="flex-1">
                  <div className="h-2.5 w-12 bg-border-default rounded mb-1 animate-pulse"></div>
                  <div className="h-4 w-8 bg-border-default rounded animate-pulse"></div>
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
            className={`rounded-lg shadow-sm border-l-4 border-l-primary transition-colors duration-150 min-w-[140px] flex-1 ${card.bgClass} ${card.borderClass}`}
          >
            <div className="p-2">
              <div className="flex items-center gap-2">
                <div className="flex-shrink-0">
                  {card.icon === SaudiRiyalIcon ? (
                    <SaudiRiyalIcon
                      size={20}
                      className={card.iconClass}
                    />
                  ) : (
                    <card.icon
                      size={20}
                      strokeWidth={1.5}
                      className={card.iconClass}
                    />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`mb-0 text-[0.7rem] font-semibold leading-tight ${card.textClass}`}>
                    {card.label}
                  </p>
                  <h6 className={`mb-0 font-bold text-base leading-tight ${card.textClass}`}>
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
          return <div key={card.label} className="flex-1 min-w-[140px]">{CardContent}</div>;
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
