import { useTranslation } from 'react-i18next';
import Button from '../../ui/Button';

interface ModalFooterProps {
  step: number;
  isEditMode: boolean;
  isLoading: boolean;
  onBack: () => void;
  onClose: () => void;
}

const ModalFooter = ({ step, isEditMode, isLoading, onBack, onClose }: ModalFooterProps) => {
  const { t } = useTranslation();

  return (
    <div className="modal-footer-compact">
      <div className="footer-content">
        <div className="footer-left">
          {step > 0 && !isEditMode && (
            <Button 
              type="button" 
              variant="secondary" 
              size="sm"
              onClick={onBack} 
              disabled={isLoading}
            >
              <i className="fas fa-arrow-right me-1"></i>
              {t('common.back')}
            </Button>
          )}
        </div>
        
        <div className="footer-right">
          <Button 
            type="button" 
            variant="secondary" 
            size="sm"
            onClick={onClose} 
            disabled={isLoading}
            className="me-2"
          >
            {t('common.cancel')}
          </Button>
          
          {(step === 2 || isEditMode) && (
            <Button 
              type="submit" 
              variant="primary" 
              size="sm"
              isLoading={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                  {t('common.saving')}
                </>
              ) : (
                <>
                  <i className="fas fa-save me-1"></i>
                  {t('common.save')}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
      
      <style>{`
        .modal-footer-compact {
          border-top: 1px solid #e9ecef;
          padding: 0.75rem 1rem;
          background-color: #f8f9fa;
          border-radius: 0 0 0.375rem 0.375rem;
        }
        
        .footer-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .footer-left,
        .footer-right {
          display: flex;
          align-items: center;
        }
        
        .spinner-border-sm {
          width: 1rem;
          height: 1rem;
        }
      `}</style>
    </div>
  );
};

export default ModalFooter;