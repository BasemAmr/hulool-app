import { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
}

const Toast = ({ id, type, title, message, duration = 5000, onClose }: ToastProps) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => onClose(id), duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  const getToastConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle,
          bgClass: 'bg-bg-surface border-l-4 border-status-success-border shadow-xl',
          iconClass: 'text-status-success-text',
          titleClass: 'text-status-success-text'
        };
      case 'error':
        return {
          icon: AlertCircle,
          bgClass: 'bg-bg-surface border-l-4 border-status-danger-border shadow-xl',
          iconClass: 'text-status-danger-text',
          titleClass: 'text-status-danger-text'
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          bgClass: 'bg-bg-surface border-l-4 border-status-warning-border shadow-xl',
          iconClass: 'text-status-warning-text',
          titleClass: 'text-status-warning-text'
        };
      case 'info':
      default:
        return {
          icon: Info,
          bgClass: 'bg-bg-surface border-l-4 border-status-info-border shadow-xl',
          iconClass: 'text-status-info-text',
          titleClass: 'text-status-info-text'
        };
    }
  };

  const config = getToastConfig();
  const Icon = config.icon;

  return (
    <div className={`${config.bgClass} rounded-r-lg p-4 mb-3 min-w-[350px] max-w-[450px] animate-in slide-in-from-right-full duration-300`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${config.iconClass}`}>
          <Icon size={20} strokeWidth={2.5} />
        </div>
        <div className="flex-grow min-w-0">
          <h6 className={`font-semibold ${config.titleClass} mb-0.5 text-sm`}>{title}</h6>
          {message && (
            <p className="text-xs text-text-secondary leading-relaxed">{message}</p>
          )}
        </div>
        <button
          type="button"
          className="text-text-secondary hover:text-text-primary transition-colors flex-shrink-0 rounded-md hover:bg-background p-1"
          onClick={() => onClose(id)}
          aria-label="Close"
        >
          <X size={16} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
};

export default Toast;
