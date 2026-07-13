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
  isHighlighted?: boolean;
}

const TaskStatusCards = ({ stats, totalPaidAmount = 0, isLoading }: TaskStatusCardsProps) => {
  const { hasViewAmountsPermission, hasViewPaidReceivablesPermission, hasViewOverdueReceivablesPermission } = useReceivablesPermissions();

  const cardData: CardConfig[] = [
    {
      to: '/tasks?status=New',
      icon: Clock,
      label: 'مهام جديدة',
      value: stats.new_tasks,
      bgClass: 'bg-[var(--token-status-info-bg)]',
      borderClass: 'border-[var(--token-status-info-border)]',
      iconClass: 'text-[var(--token-status-info-text)]',
      textClass: 'text-[var(--token-status-info-text)]',
    },
    {
      to: '/tasks?status=Deferred',
      icon: PauseCircle,
      label: 'مهام مؤجلة',
      value: stats.deferred_tasks,
      bgClass: 'bg-[var(--token-status-neutral-bg)]',
      borderClass: 'border-[var(--token-status-neutral-border)]',
      iconClass: 'text-[var(--token-status-neutral-text)]',
      textClass: 'text-[var(--token-status-neutral-text)]',
    },
    {
      to: '/tasks?status=Pending Review',
      icon: ClipboardCheck,
      label: 'مهام قيد المراجعة',
      value: stats.pending_review_tasks || 0,
      bgClass: 'bg-[var(--token-status-warning-bg)]',
      borderClass: 'border-[var(--token-status-warning-border)]',
      iconClass: 'text-[var(--token-status-warning-text)]',
      textClass: 'text-[var(--token-status-warning-text)]',
      isHighlighted: true,
    },
    {
      to: '/tasks?status=Completed',
      icon: CheckCircle,
      label: 'مهام مكتملة',
      value: stats.completed_tasks,
      bgClass: 'bg-[var(--token-status-success-bg)]',
      borderClass: 'border-[var(--token-status-success-border)]',
      iconClass: 'text-[var(--token-status-success-text)]',
      textClass: 'text-[var(--token-status-success-text)]',
    },
    {
      to: '/tasks?status=Late',
      icon: AlertTriangle,
      label: 'مهام متأخرة',
      value: stats.late_tasks,
      bgClass: 'bg-[var(--token-status-danger-bg)]',
      borderClass: 'border-[var(--token-status-danger-border)]',
      iconClass: 'text-[var(--token-status-danger-text)]',
      textClass: 'text-[var(--token-status-danger-text)]',
      isClickable: true,
    },
    {
      to: '/financial-center/invoices?status=paid',
      icon: SaudiRiyalIcon,
      label: 'مستحقات مسددة',
      value: hasViewAmountsPermission ? totalPaidAmount : '***',
      bgClass: 'bg-[var(--token-status-success-bg)]',
      borderClass: 'border-[var(--token-status-success-border)]',
      iconClass: 'text-[var(--token-status-success-text)]',
      textClass: 'text-[var(--token-status-success-text)]',
      isClickable: hasViewPaidReceivablesPermission,
    },
    {
      to: '/financial-center/invoices?status=overdue',
      icon: SaudiRiyalIcon,
      label: 'مستحقات متأخرة',
      value: hasViewAmountsPermission ? (stats.total_unpaid_amount || 0) : '***',
      bgClass: 'bg-[var(--token-status-danger-bg)]',
      borderClass: 'border-[var(--token-status-danger-border)]',
      iconClass: 'text-[var(--token-status-danger-text)]',
      textClass: 'text-[var(--token-status-danger-text)]',
      isClickable: hasViewOverdueReceivablesPermission,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex gap-3 flex-wrap">
        {[1, 2, 3, 4, 5, 6, 7].map(i => (
          <div
            key={i}
            className="rounded-lg shadow-sm bg-card border-2 border-border min-w-[140px] flex-1"
          >
            <div className="p-3">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded bg-border-default animate-pulse"></div>
                <div className="flex-1">
                  <div className="h-3 w-14 bg-border-default rounded mb-1.5 animate-pulse"></div>
                  <div className="h-5 w-10 bg-border-default rounded animate-pulse"></div>
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
        const isPendingReview = card.isHighlighted;
        const CardContent = (
          <div
            className={`rounded-lg transition-all duration-150 min-w-[140px] flex-1 border ${
              card.bgClass
            } ${card.borderClass} shadow-sm`}
            style={isPendingReview ? {
              borderLeftWidth: '4px',
              borderLeftColor: 'var(--token-status-warning-text)',
              boxShadow: '0 0 12px var(--token-status-warning-border), 0 0 4px var(--token-status-warning-border)',
            } : undefined}
          >
            <div className="p-3">
              <div className="flex items-center gap-2.5">
                <div className="flex-shrink-0">
                  {card.icon === SaudiRiyalIcon ? (
                    <SaudiRiyalIcon
                      size={24}
                      className={card.iconClass}
                    />
                  ) : (
                    <card.icon
                      size={24}
                      strokeWidth={2}
                      className={card.iconClass}
                    />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`mb-0 text-xs font-bold leading-tight ${card.textClass}`}>
                    {card.label}
                  </p>
                  <h6 className={`mb-0 font-extrabold text-lg leading-tight ${card.textClass}`}>
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
