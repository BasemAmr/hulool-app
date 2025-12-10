import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
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
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-black">{t('tasks.taskDataComparison')}</h3>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Expected Data */}
          <div className="rounded-lg border border-blue-600 bg-blue-50 p-3">
            <h4 className="font-semibold text-blue-900 text-sm mb-2">{t('tasks.yourChanges')}</h4>
            <div className="text-xs text-blue-800 space-y-1">
              <p><strong>{t('tasks.expectedUpdateTime')}:</strong></p>
              <p className="font-mono">{new Date(conflictData.expected_updated_at).toLocaleString()}</p>
            </div>
          </div>
          
          {/* Current Data */}
          <div className="rounded-lg border border-green-600 bg-green-50 p-3">
            <h4 className="font-semibold text-green-900 text-sm mb-2">{t('tasks.currentData')}</h4>
            <div className="text-xs text-green-800 space-y-1">
              <p><strong>{t('tasks.actualUpdateTime')}:</strong></p>
              <p className="font-mono">{new Date(conflictData.current_updated_at).toLocaleString()}</p>
              <div className="mt-2 pt-2 border-t border-green-200 space-y-1">
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
    >
      <div className="space-y-4">
        {/* Conflict Alert */}
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 flex gap-3">
          <AlertTriangle className="text-destructive flex-shrink-0 mt-0.5 h-5 w-5" />
          <div className="space-y-1">
            <h3 className="font-semibold text-destructive">{t('tasks.conflictDetected')}</h3>
            <p className="text-sm text-destructive/80">{t('tasks.concurrentModificationExplanation')}</p>
            <p className="text-sm text-destructive/80">{t('tasks.someoneElseModifiedTask')}</p>
          </div>
        </div>

        {/* Task Comparison */}
        {renderTaskComparison()}
        
        {/* Resolution Options */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-black">{t('tasks.chooseResolution')}</h3>
          <div className="space-y-2">
            <label className="flex gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
              <input 
                type="radio" 
                name="resolution"
                value="use_current"
                checked={selectedOption === 'use_current'}
                onChange={(e) => setSelectedOption(e.target.value as any)}
                className="mt-1 rounded"
              />
              <div className="min-w-0">
                <span className="font-semibold text-green-700 text-sm block">{t('tasks.useCurrentData')}</span>
                <p className="text-xs text-muted-foreground mt-1">{t('tasks.useCurrentDataDescription')}</p>
              </div>
            </label>
            
            <label className="flex gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
              <input 
                type="radio" 
                name="resolution"
                value="overwrite"
                checked={selectedOption === 'overwrite'}
                onChange={(e) => setSelectedOption(e.target.value as any)}
                className="mt-1 rounded"
              />
              <div className="min-w-0">
                <span className="font-semibold text-blue-700 text-sm block">{t('tasks.overwriteChanges')}</span>
                <p className="text-xs text-muted-foreground mt-1">{t('tasks.overwriteChangesDescription')}</p>
              </div>
            </label>
            
            <label className="flex gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
              <input 
                type="radio" 
                name="resolution"
                value="cancel"
                checked={selectedOption === 'cancel'}
                onChange={(e) => setSelectedOption(e.target.value as any)}
                className="mt-1 rounded"
              />
              <div className="min-w-0">
                <span className="font-semibold text-gray-700 text-sm block">{t('tasks.cancelUpdate')}</span>
                <p className="text-xs text-muted-foreground mt-1">{t('tasks.cancelUpdateDescription')}</p>
              </div>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t border-border">
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
