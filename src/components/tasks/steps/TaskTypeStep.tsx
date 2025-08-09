import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { TaskType } from '../../../api/types';

interface TaskTypeStepProps {
  control: any;
  errors: any;
  onTypeSelected: (type: TaskType) => void;
}

const TaskTypeStep = ({ control, errors, onTypeSelected }: TaskTypeStepProps) => {
  const { t } = useTranslation();
  const taskTypes: TaskType[] = ['Government', 'RealEstate', 'Accounting', 'Other'];

  return (
    <div className="task-type-step">
      <div className="text-center mb-4">
        <h5 className="mb-2">{t('tasks.selectTaskType')}</h5>
        <p className="text-muted small">{t('tasks.selectTaskTypeDescription')}</p>
      </div>
      
      <div className="type-selection-grid">
        <Controller
          name="type"
          control={control}
          rules={{ required: true }}
          render={({ field }) => (
            <>
              {taskTypes.map((type) => (
                <div
                  key={type}
                  className={`type-card ${field.value === type ? 'selected' : ''}`}
                  onClick={() => {
                    field.onChange(type);
                    onTypeSelected(type as TaskType);
                  }}
                >
                  <div className="type-icon">
                    {type === 'Government' && <i className="fas fa-building"></i>}
                    {type === 'RealEstate' && <i className="fas fa-home"></i>}
                    {type === 'Accounting' && <i className="fas fa-calculator"></i>}
                    {type === 'Other' && <i className="fas fa-tasks"></i>}
                  </div>
                  <div className="type-label">{t(`type.${type}`)}</div>
                </div>
              ))}
            </>
          )}
        />
      </div>
      
      {errors.type && <div className="text-center text-danger small mt-2">{t('tasks.formTypeLabel')} is required</div>}
      
      <style>{`
        .task-type-step {
          padding: 1rem 0;
        }
        
        .type-selection-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          margin-bottom: 1rem;
        }
        
        .type-card {
          padding: 1.5rem 1rem;
          border: 2px solid #e9ecef;
          border-radius: 0.5rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
          background: white;
        }
        
        .type-card:hover {
          border-color: #007bff;
          box-shadow: 0 2px 8px rgba(0,123,255,0.15);
          transform: translateY(-2px);
        }
        
        .type-card.selected {
          border-color: #007bff;
          background-color: #e7f3ff;
          color: #007bff;
        }
        
        .type-icon {
          font-size: 2rem;
          margin-bottom: 0.5rem;
          color: #6c757d;
        }
        
        .type-card.selected .type-icon {
          color: #007bff;
        }
        
        .type-label {
          font-weight: 500;
          font-size: 0.9rem;
        }
        
        @media (max-width: 576px) {
          .type-selection-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default TaskTypeStep;