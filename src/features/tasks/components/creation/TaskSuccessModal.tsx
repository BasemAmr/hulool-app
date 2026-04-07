import { useEffect } from 'react';
import { CheckCircle, ListTodo, Plus, X } from 'lucide-react';
import Button from '@/shared/ui/primitives/Button';

interface TaskSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewAllTasks: () => void;
  onAddNewTask: () => void;
}

const TaskSuccessModal = ({ isOpen, onClose, onViewAllTasks, onAddNewTask }: TaskSuccessModalProps) => {
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

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 animate-fadeIn"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative w-full max-w-md rounded-lg border border-border bg-card shadow-2xl animate-scaleIn">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-text-muted transition-colors hover:text-text-secondary"
          >
            <X size={20} />
          </button>

          {/* Header with gradient */}
          <div className="rounded-t-lg border-b border-status-success-border bg-status-success-bg px-6 py-4 text-status-success-text">
            <h3 className="text-center text-xl font-bold">تم إنشاء المهمة بنجاح! ✨</h3>
          </div>

          {/* Body */}
          <div className="p-6 text-center">
            {/* Success Icon */}
            <div className="mb-6 animate-bounce-slow">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-status-success-bg rounded-full">
                <CheckCircle size={48} className="text-status-success-text" />
              </div>
            </div>

            {/* Message */}
            <p className="text-text-secondary mb-6">
              تمت إضافة المهمة بنجاح. ماذا تريد أن تفعل بعد ذلك؟
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <button
                onClick={onViewAllTasks}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <ListTodo size={20} />
                عرض جميع المهام
              </button>

              <button
                onClick={onAddNewTask}
                className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-primary px-4 py-3 font-medium text-primary hover:bg-primary/10 transition-colors"
              >
                <Plus size={20} />
                إضافة مهمة جديدة
              </button>

              <button
                onClick={onClose}
                className="w-full rounded-md px-4 py-3 font-medium text-text-secondary transition-colors hover:bg-background"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes bounceSlow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }

        .animate-bounce-slow {
          animation: bounceSlow 2s ease-in-out infinite;
        }
      `}</style>
    </>
  );
};

export default TaskSuccessModal;
