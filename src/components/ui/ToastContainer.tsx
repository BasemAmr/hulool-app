import { createPortal } from 'react-dom';
import Toast from './Toast';
import type { ToastType } from './Toast';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

const ToastContainer = ({ toasts, onRemove }: ToastContainerProps) => {
  const container = document.getElementById('toast-root') || document.body;

  return createPortal(
    <div 
      className="toast-container position-fixed"
      style={{
        top: '20px',
        right: '20px',
        zIndex: 1055,
        maxHeight: 'calc(100vh - 40px)',
        overflowY: 'auto'
      }}
    >
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          type={toast.type}
          title={toast.title}
          message={toast.message}
          duration={toast.duration}
          onClose={onRemove}
        />
      ))}
    </div>,
    container
  );
};

export default ToastContainer;
