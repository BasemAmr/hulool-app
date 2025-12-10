import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
  allowOutsideClick?: boolean; // Optional prop to enable outside click (default: false)
}

const BaseModal = ({ isOpen, onClose, title, children, className, allowOutsideClick = false }: BaseModalProps) => {
  // Handle Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = allowOutsideClick ? onClose : undefined;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={handleBackdropClick}>
      <div className={`bg-card rounded-xl shadow-2xl max-w-2xl w-full my-8 flex flex-col max-h-[calc(100vh-4rem)] animate-in fade-in-0 zoom-in-95 duration-200 ${className || ''}`} onClick={(e) => e.stopPropagation()}>
        <header 
          className="flex items-center justify-between px-6 py-4 border-b border-primary/20 bg-primary text-primary-foreground flex-shrink-0"
        >
          <h5 className="text-lg font-semibold tracking-tight">{title}</h5>
          <button 
            type="button" 
            className="rounded-lg p-1.5 transition-colors text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10" 
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="p-6 bg-card overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};
export default BaseModal;