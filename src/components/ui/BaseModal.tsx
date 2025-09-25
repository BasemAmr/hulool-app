import { useEffect, type ReactNode } from 'react';
import styles from './Modal.module.scss'; // We'll create this file

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
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div className={`${styles.modalContent} ${className || ''}`} onClick={(e) => e.stopPropagation()}>
        <header className={styles.modalHeader}>
          <h5 className="modal-title">{title}</h5>
          <button type="button" className="btn-close" onClick={onClose}></button>
        </header>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>
  );
};
export default BaseModal;