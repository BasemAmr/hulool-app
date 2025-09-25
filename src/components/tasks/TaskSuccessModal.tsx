import { useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
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
      {/* Backdrop - no onClick handler to prevent closing on outside click */}
      <div className="modal-backdrop fade show" />
      
      {/* Modal */}
      <div className="modal fade show d-block" style={{ zIndex: 1060 }}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow-lg" style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
            border: '2px solid #d4af37'
          }}>
            <div className="modal-header border-0" style={{
              background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
              color: 'white'
            }}>
              <h5 className="modal-title text-center w-100 fw-bold">رائع لقد تم إضافة المهمة!</h5>
            </div>
            <div className="modal-body text-center p-5">
              <div className="success-animation mb-4">
                <CheckCircle size={80} style={{ color: '#d4af37' }} />
              </div>
              <div className="d-flex gap-2 justify-content-center flex-wrap">
                <Button 
                  variant="primary" 
                  onClick={onViewAllTasks}
                  className="mx-1"
                  style={{
                    backgroundColor: '#d4af37',
                    borderColor: '#d4af37',
                    color: 'white'
                  }}
                >
                  رؤية جميع المهام
                </Button>
                <Button 
                  variant="outline-primary" 
                  onClick={onAddNewTask}
                  className="mx-1"
                  style={{
                    borderColor: '#d4af37',
                    color: '#d4af37'
                  }}
                >
                  إضافة مهمة أخرى
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={onClose}
                  className="mx-1"
                  style={{
                    backgroundColor: '#6c757d',
                    borderColor: '#6c757d',
                    color: 'white'
                  }}
                >
                  إغلاق
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Animations */}
      <style>{`
        .success-animation {
          animation: successBounce 0.6s ease-out;
        }
        @keyframes successBounce {
          0% { 
            opacity: 0; 
            transform: scale(0.3) translateY(-30px); 
          }
          50% { 
            opacity: 1; 
            transform: scale(1.1) translateY(-10px); 
          }
          100% { 
            opacity: 1; 
            transform: scale(1) translateY(0); 
          }
        }
        .modal-content {
          animation: modalSlideIn 0.4s ease-out;
        }
        @keyframes modalSlideIn {
          from { 
            opacity: 0; 
            transform: translateY(-50px) scale(0.9); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0) scale(1); 
          }
        }
      `}</style>
    </>
  );
};

export default TaskSuccessModal;
