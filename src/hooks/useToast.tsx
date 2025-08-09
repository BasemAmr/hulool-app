import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import ToastContainer from '../components/ui/ToastContainer';
import type { ToastItem } from '../components/ui/ToastContainer';

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (toast: Omit<ToastItem, 'id'>) => void;
  hideToast: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = (toast: Omit<ToastItem, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: ToastItem = { 
      ...toast, 
      id,
      duration: toast.duration ?? 5000 
    };
    
    setToasts(prev => [...prev, newToast]);
  };

  const hideToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const success = (title: string, message?: string) => 
    showToast({ type: 'success', title, message });
  
  const error = (title: string, message?: string) => 
    showToast({ type: 'error', title, message });
  
  const warning = (title: string, message?: string) => 
    showToast({ type: 'warning', title, message });
  
  const info = (title: string, message?: string) => 
    showToast({ type: 'info', title, message });

  return (
    <ToastContext.Provider value={{ toasts, showToast, hideToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={hideToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
