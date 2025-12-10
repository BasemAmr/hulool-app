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
    <div className="flex gap-2 items-center">
      <button
        type="button"
        className="border border-yellow-600 text-yellow-600 hover:bg-yellow-50 rounded-full p-2 transition-colors"
        onClick={onViewTaskHistory}
        title={t('tasks.taskHistory')}
        style={{ 
          width: '36px', 
          height: '36px'
        }}
      >
        <History size={16} />
      </button>
      <button
        type="button"
        className="border border-yellow-600 text-yellow-600 hover:bg-yellow-50 rounded-full p-2 transition-colors"
        onClick={onViewPaymentHistory}
        title={t('tasks.paymentHistory')}
        style={{ 
          width: '36px', 
          height: '36px'
        }}
      >
        <CreditCard size={16} />
      </button>
    </div>
  );
};

export default ClientHistoryIcons;
