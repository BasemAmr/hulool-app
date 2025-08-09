import type { ReactNode } from 'react';
import styles from './Modal.module.scss'; // We'll create this file

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

const BaseModal = ({ isOpen, onClose, title, children, className }: BaseModalProps) => {
  if (!isOpen) return null;

  return (
    <div className={styles.backdrop} onClick={onClose}>
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