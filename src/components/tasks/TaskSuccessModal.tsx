import { useEffect } from 'react';
import { CheckCircle, ListTodo, Plus, X } from 'lucide-react';
import Button from '../ui/Button';

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
        <div className="relative w-full max-w-md bg-white rounded-lg shadow-2xl animate-scaleIn">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>

          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-4 rounded-t-lg">
            <h3 className="text-xl font-bold text-center">تم إنشاء المهمة بنجاح! ✨</h3>
          </div>

          {/* Body */}
          <div className="p-6 text-center">
            {/* Success Icon */}
            <div className="mb-6 animate-bounce-slow">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full">
                <CheckCircle size={48} className="text-green-600" />
              </div>
            </div>

            {/* Message */}
            <p className="text-gray-600 mb-6">
              تمت إضافة المهمة بنجاح. ماذا تريد أن تفعل بعد ذلك؟
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <button
                onClick={onViewAllTasks}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium"
              >
                <ListTodo size={20} />
                عرض جميع المهام
              </button>

              <button
                onClick={onAddNewTask}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 rounded-md transition-colors font-medium"
              >
                <Plus size={20} />
                إضافة مهمة جديدة
              </button>

              <button
                onClick={onClose}
                className="w-full px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-md transition-colors font-medium"
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
