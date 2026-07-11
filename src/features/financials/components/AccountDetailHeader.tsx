import { ArrowRight } from 'lucide-react';

interface AccountDetailHeaderProps {
  name: string;
  balance: number;
  icon?: React.ReactNode;
  subtitle?: string;
  status?: { label: string; variant: 'success' | 'danger' | 'warning' | 'neutral' };
  onBack?: () => void;
  extra?: React.ReactNode;
}

const statusStyles: Record<string, string> = {
  success: 'bg-status-success-bg text-status-success-text border border-status-success-border',
  danger: 'bg-status-danger-bg text-status-danger-text border border-status-danger-border',
  warning: 'bg-status-warning-bg text-status-warning-text border border-status-warning-border',
  neutral: 'bg-status-neutral-bg text-status-neutral-text border border-status-neutral-border',
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

const AccountDetailHeader: React.FC<AccountDetailHeaderProps> = ({
  name,
  balance,
  icon,
  subtitle,
  status,
  onBack,
  extra,
}) => (
  <div className="flex items-center justify-between border-b border-border-default pb-4 mb-4">
    <div className="flex items-center gap-3 min-w-0">
      {onBack && (
        <button
          onClick={onBack}
          className="shrink-0 p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-surface-muted transition-colors"
        >
          <ArrowRight size={20} />
        </button>
      )}
      {icon && <span className="shrink-0 text-primary">{icon}</span>}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-text-primary truncate">{name}</h2>
          {status && (
            <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${statusStyles[status.variant]}`}>
              {status.label}
            </span>
          )}
        </div>
        {subtitle && <p className="text-sm text-text-secondary mt-0.5">{subtitle}</p>}
      </div>
    </div>
    <div className="flex items-center gap-4 shrink-0">
      {extra}
      <div className="text-left border-s border-border-default ps-4">
        <p className="text-xs text-text-secondary">الرصيد الحالي</p>
        <p className="text-2xl font-extrabold text-text-brand mt-0.5 whitespace-nowrap">
          {formatCurrency(balance)} ريال
        </p>
      </div>
    </div>
  </div>
);

export default AccountDetailHeader;
