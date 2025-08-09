import { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

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
          bgClass: 'bg-success',
          iconClass: 'text-success',
          borderClass: 'border-success'
        };
      case 'error':
        return {
          icon: AlertCircle,
          bgClass: 'bg-danger',
          iconClass: 'text-danger',
          borderClass: 'border-danger'
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          bgClass: 'bg-warning',
          iconClass: 'text-warning',
          borderClass: 'border-warning'
        };
      case 'info':
      default:
        return {
          icon: Info,
          bgClass: 'bg-info',
          iconClass: 'text-info',
          borderClass: 'border-info'
        };
    }
  };

  const config = getToastConfig();
  const Icon = config.icon;

  return (
    <div 
      className={`toast-item card border-0 shadow-lg mb-3 ${config.borderClass}`}
      style={{
        minWidth: '350px',
        maxWidth: '500px',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,249,250,0.98) 100%)',
        backdropFilter: 'blur(10px)',
        borderLeft: '4px solid'
      }}
    >
      <div className="card-body p-3">
        <div className="d-flex align-items-start">
          <div className={`me-3 mt-1 ${config.iconClass}`}>
            <Icon size={20} />
          </div>
          <div className="flex-grow-1">
            <h6 className="toast-title mb-1 fw-bold text-dark">{title}</h6>
            {message && (
              <p className="toast-message mb-0 small text-muted">{message}</p>
            )}
          </div>
          <button
            type="button"
            className="btn-close ms-2"
            onClick={() => onClose(id)}
            aria-label="Close"
          ></button>
        </div>
      </div>
    </div>
  );
};

export default Toast;
