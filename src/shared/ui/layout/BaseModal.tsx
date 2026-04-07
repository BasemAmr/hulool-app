import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
  allowOutsideClick?: boolean;
}

const BaseModal = ({ isOpen, onClose, title, children, className, allowOutsideClick = false }: BaseModalProps) => {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.body.style.overflow = 'unset';
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = allowOutsideClick ? onClose : undefined;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="flex items-start justify-center p-4">
        <div
          className={`flex w-full max-w-4xl flex-col rounded-xl border border-border bg-card shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200 ${className || ''}`}
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-center justify-between border-b border-border bg-background px-6 py-4">
            <h5 className="text-lg font-semibold tracking-tight text-text-primary">{title}</h5>
            <button
              type="button"
              className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-muted/50 hover:text-text-primary"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="flex w-full justify-center bg-card p-6">
            <div className="w-full">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );


};

export default BaseModal;