import { History, CreditCard } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ClientHistoryIconsProps {
  onViewTaskHistory: () => void;
  onViewPaymentHistory: () => void;
  disabled?: boolean;
}

const ClientHistoryIcons = ({ onViewTaskHistory, onViewPaymentHistory, disabled }: ClientHistoryIconsProps) => {
  const { t } = useTranslation();

  if (disabled) return null;

  return (
    <div className="d-flex gap-2 align-items-center">
      <button
        type="button"
        className="btn btn-outline-warning btn-sm rounded-circle p-2"
        onClick={onViewTaskHistory}
        title={t('tasks.taskHistory')}
        style={{ 
          width: '36px', 
          height: '36px',
          borderColor: 'var(--bs-warning)',
          color: 'var(--bs-warning)'
        }}
      >
        <History size={16} />
      </button>
      <button
        type="button"
        className="btn btn-outline-warning btn-sm rounded-circle p-2"
        onClick={onViewPaymentHistory}
        title={t('tasks.paymentHistory')}
        style={{ 
          width: '36px', 
          height: '36px',
          borderColor: 'var(--bs-warning)',
          color: 'var(--bs-warning)'
        }}
      >
        <CreditCard size={16} />
      </button>
    </div>
  );
};

export default ClientHistoryIcons;
