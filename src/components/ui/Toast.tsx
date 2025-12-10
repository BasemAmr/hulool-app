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
          bgClass: 'bg-white border-l-4 border-green-500 shadow-xl',
          iconClass: 'text-green-500',
          titleClass: 'text-green-900'
        };
      case 'error':
        return {
          icon: AlertCircle,
          bgClass: 'bg-white border-l-4 border-red-500 shadow-xl',
          iconClass: 'text-red-500',
          titleClass: 'text-red-900'
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          bgClass: 'bg-white border-l-4 border-yellow-500 shadow-xl',
          iconClass: 'text-yellow-500',
          titleClass: 'text-yellow-900'
        };
      case 'info':
      default:
        return {
          icon: Info,
          bgClass: 'bg-white border-l-4 border-primary shadow-xl',
          iconClass: 'text-primary',
          titleClass: 'text-primary'
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
            <p className="text-xs text-gray-600 leading-relaxed">{message}</p>
          )}
        </div>
        <button
          type="button"
          className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 rounded-md hover:bg-gray-100 p-1"
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
