import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid'; // For temporary IDs for new requirements

import type { Requirement } from '../../api/types';
import { useUpdateRequirements } from '../../queries/taskQueries';
import { useModalStore } from '../../stores/modalStore';

import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import { PlusCircle, XCircle } from 'lucide-react'; // Example icons

interface RequirementsModalProps {
  task: {
    id: number;
    task_name?: string;
    type: string;
    requirements: Requirement[];
  };
}

const RequirementsModal = () => {
  const { t } = useTranslation();
  
  // Fix: Use individual selectors instead of object destructuring
  const closeModal = useModalStore((state) => state.closeModal);
  const props = useModalStore((state) => state.props as RequirementsModalProps);
  
  const { task } = props;

  const updateRequirementsMutation = useUpdateRequirements();

  const [localRequirements, setLocalRequirements] = useState<Requirement[]>([]);
  const [newRequirementText, setNewRequirementText] = useState('');

  useEffect(() => {
    if (task?.requirements) {
      setLocalRequirements(task.requirements.map(req => ({
        ...req,
        // Ensure is_provided is always a boolean, handling backend inconsistencies
        is_provided: typeof req.is_provided === 'string' ? req.is_provided === '1' : Boolean(req.is_provided),
        temp_id: req.id ? String(req.id) : uuidv4() // Use string version of ID for consistent local key
      })));
    }
  }, [task]);

  const addRequirementField = () => {
    if (newRequirementText.trim()) {
      setLocalRequirements((prev) => [
        ...prev,
        { temp_id: uuidv4(), requirement_text: newRequirementText.trim(), is_provided: false },
      ]);
      setNewRequirementText('');
    }
  };

  const updateRequirementText = (id: number | string, text: string) => {
    setLocalRequirements((prev) =>
      prev.map((req) => (req.temp_id === id || req.id === id ? { ...req, requirement_text: text } : req))
    );
  };

  const toggleRequirementProvided = (id: number | string) => {
    setLocalRequirements((prev) =>
      prev.map((req) => (req.temp_id === id || req.id === id ? { ...req, is_provided: !req.is_provided } : req))
    );
  };

  const removeRequirementField = (id: number | string) => {
    setLocalRequirements((prev) => prev.filter((req) => req.temp_id !== id && req.id !== id));
  };

  const handleSaveRequirements = () => {
    if (task) {
        // Filter out any empty requirements before sending to API
        const filteredRequirements = localRequirements.filter(req => req.requirement_text.trim() !== '');

        // Prepare requirements for API: include id and is_provided status
        const apiRequirements = filteredRequirements.map(req => ({
            id: req.id, // Include ID if it exists
            requirement_text: req.requirement_text,
            is_provided: req.is_provided
        }));

        // Use the dedicated requirements endpoint
        updateRequirementsMutation.mutate({ 
          task_id: task.id, 
          requirements: apiRequirements
        }, {
            onSuccess: closeModal,
        });
    }
  };

  if (!task) return <div>Error: Task not found.</div>;

  return (
    <BaseModal
      isOpen={true}
      onClose={closeModal}
      title={t('tasks.requirementsTitle', { taskName: task.task_name || t(`type.${task.type}`) })}
    >
      <div className="mb-3">
        {localRequirements.length === 0 && (
          <p className="text-muted small">{t('tasks.noRequirements')}</p>
        )}
        {localRequirements.map((req) => (
          <div key={req.temp_id || req.id} className="input-group mb-2">
            <div className="input-group-text">
              <input
                type="checkbox"
                className="form-check-input mt-0"
                checked={req.is_provided}
                onChange={() => toggleRequirementProvided(req.temp_id || req.id!)}
              />
            </div>
            <input
              type="text"
              className="form-control"
              value={req.requirement_text}
              onChange={(e) => updateRequirementText(req.temp_id || req.id!, e.target.value)}
              placeholder={t('tasks.addRequirement')}
            />
            <button
              type="button"
              className="btn btn-outline-danger"
              onClick={() => removeRequirementField(req.temp_id || req.id!)}
            >
              <XCircle size={18} />
            </button>
          </div>
        ))}
      </div>

      <div className="input-group mb-3">
        <input
          type="text"
          className="form-control"
          value={newRequirementText}
          onChange={(e) => setNewRequirementText(e.target.value)}
          placeholder={t('tasks.addRequirement')}
          onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRequirementField(); } }}
        />
        <Button type="button" variant="primary" onClick={addRequirementField}>
          <PlusCircle size={16} /> {t('tasks.addRequirement')}
        </Button>
      </div>

      <footer className="modal-footer">
        <Button type="button" variant="secondary" onClick={closeModal} disabled={updateRequirementsMutation.isPending}>
          {t('common.cancel')}
        </Button>
        <Button type="button" variant="primary" onClick={handleSaveRequirements} isLoading={updateRequirementsMutation.isPending}>
          {updateRequirementsMutation.isPending ? t('common.saving') : t('common.save')}
        </Button>
      </footer>
    </BaseModal>
  );
};

export default RequirementsModal;