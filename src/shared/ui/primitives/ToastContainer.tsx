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
    <div className="fixed top-4 right-4 z-[9999] max-h-[calc(100vh-2rem)] overflow-y-auto flex flex-col gap-0 pointer-events-none">
      <div className="pointer-events-auto">
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
      </div>
    </div>,
    container
  );
};

export default ToastContainer;
