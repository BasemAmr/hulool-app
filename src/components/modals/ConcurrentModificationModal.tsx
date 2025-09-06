import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import { useModalStore } from '../../stores/modalStore';
import { useToast } from '../../hooks/useToast';
import type { ConcurrentModificationData } from '../../api/types';

interface ConcurrentModificationModalProps {
  conflictData: ConcurrentModificationData;
  onRetry: (useCurrentData: boolean) => void;
  onCancel: () => void;
}

const ConcurrentModificationModal: React.FC<ConcurrentModificationModalProps> = ({
  conflictData,
  onRetry,
  onCancel
}) => {
  const { t } = useTranslation();
  const { closeModal } = useModalStore();
  const { showToast } = useToast();

  const [selectedOption, setSelectedOption] = useState<'overwrite' | 'use_current' | 'cancel'>('cancel');

  const handleResolve = () => {
    if (selectedOption === 'cancel') {
      onCancel();
      closeModal();
      return;
    }

    const useCurrentData = selectedOption === 'use_current';
    onRetry(useCurrentData);
    closeModal();
    
    showToast({
      type: 'info',
      title: useCurrentData ? t('tasks.usingCurrentData') : t('tasks.overwritingChanges')
    });
  };

  const renderTaskComparison = () => {
    const currentTask = conflictData.current_task_data;
    
    return (
      <div className="task-comparison mb-6">
        <h3 className="text-lg font-semibold mb-3">{t('tasks.taskDataComparison')}</h3>
        
        <div className="comparison-grid grid grid-cols-2 gap-4">
          <div className="expected-data">
            <h4 className="font-semibold text-blue-800 mb-2">{t('tasks.yourChanges')}</h4>
            <div className="bg-blue-50 p-3 rounded text-sm">
              <p><strong>{t('tasks.expectedUpdateTime')}:</strong></p>
              <p className="font-mono text-xs">{new Date(conflictData.expected_updated_at).toLocaleString()}</p>
            </div>
          </div>
          
          <div className="current-data">
            <h4 className="font-semibold text-green-800 mb-2">{t('tasks.currentData')}</h4>
            <div className="bg-green-50 p-3 rounded text-sm">
              <p><strong>{t('tasks.actualUpdateTime')}:</strong></p>
              <p className="font-mono text-xs">{new Date(conflictData.current_updated_at).toLocaleString()}</p>
              <div className="mt-2">
                <p><strong>{t('tasks.currentValues')}:</strong></p>
                <p>{t('tasks.taskName')}: {currentTask.task_name}</p>
                <p>{t('tasks.amount')}: {currentTask.amount.toLocaleString()} SAR</p>
                <p>{t('tasks.prepaidAmount')}: {currentTask.prepaid_amount.toLocaleString()} SAR</p>
                <p>{t('tasks.status')}: {currentTask.status}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <BaseModal
      isOpen={true}
      onClose={closeModal}
      title={t('tasks.concurrentModificationDetected')}
      className="large-modal"
    >
      <div className="concurrent-modification-modal">
        <div className="conflict-explanation bg-red-50 p-4 rounded-lg mb-6">
          <h3 className="text-lg font-semibold text-red-800 mb-3">
            {t('tasks.conflictDetected')}
          </h3>
          <p className="text-sm text-red-700 mb-2">
            {t('tasks.concurrentModificationExplanation')}
          </p>
          <p className="text-sm text-red-700">
            {t('tasks.someoneElseModifiedTask')}
          </p>
        </div>

        {renderTaskComparison()}
        
        <div className="resolution-options mb-6">
          <h3 className="text-lg font-semibold mb-3">{t('tasks.chooseResolution')}</h3>
          <div className="space-y-3">
            <label className="flex items-start p-3 border rounded cursor-pointer hover:bg-gray-50">
              <input 
                type="radio" 
                name="resolution"
                value="use_current"
                checked={selectedOption === 'use_current'}
                onChange={(e) => setSelectedOption(e.target.value as any)}
                className="mr-3 mt-1"
              />
              <div>
                <span className="font-semibold text-green-700">{t('tasks.useCurrentData')}</span>
                <p className="text-sm text-gray-600">{t('tasks.useCurrentDataDescription')}</p>
              </div>
            </label>
            
            <label className="flex items-start p-3 border rounded cursor-pointer hover:bg-gray-50">
              <input 
                type="radio" 
                name="resolution"
                value="overwrite"
                checked={selectedOption === 'overwrite'}
                onChange={(e) => setSelectedOption(e.target.value as any)}
                className="mr-3 mt-1"
              />
              <div>
                <span className="font-semibold text-blue-700">{t('tasks.overwriteChanges')}</span>
                <p className="text-sm text-gray-600">{t('tasks.overwriteChangesDescription')}</p>
              </div>
            </label>
            
            <label className="flex items-start p-3 border rounded cursor-pointer hover:bg-gray-50">
              <input 
                type="radio" 
                name="resolution"
                value="cancel"
                checked={selectedOption === 'cancel'}
                onChange={(e) => setSelectedOption(e.target.value as any)}
                className="mr-3 mt-1"
              />
              <div>
                <span className="font-semibold text-gray-700">{t('tasks.cancelUpdate')}</span>
                <p className="text-sm text-gray-600">{t('tasks.cancelUpdateDescription')}</p>
              </div>
            </label>
          </div>
        </div>

        <div className="modal-actions flex justify-end gap-3 pt-4 border-t">
          <Button variant="secondary" onClick={() => { onCancel(); closeModal(); }}>
            {t('common.cancel')}
          </Button>
          <Button 
            variant={
              selectedOption === 'overwrite' ? 'danger' : 
              selectedOption === 'use_current' ? 'primary' : 'secondary'
            }
            onClick={handleResolve}
            disabled={selectedOption === 'cancel'}
          >
            {selectedOption === 'overwrite' ? t('tasks.overwriteChanges') :
             selectedOption === 'use_current' ? t('tasks.useCurrentData') :
             t('common.cancel')}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};

export default ConcurrentModificationModal;
