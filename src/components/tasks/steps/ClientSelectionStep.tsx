import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { Client } from '../../../api/types';
import ClientSearchCompact from '../../shared/ClientSearchCompact';

interface ClientSelectionStepProps {
  control: any;
  errors: any;
  watch: any;
  client?: Client;
  onClientSelected: (client: Client) => void;
}

const ClientSelectionStep = ({ control, errors, watch, client, onClientSelected }: ClientSelectionStepProps) => {
  const { t } = useTranslation();

  return (
    <div className="client-selection-step">
      {/* Show selected type */}
      <div className="selected-type-display mb-4">
        <div className="d-flex align-items-center justify-content-center">
          <span className="badge bg-primary me-2">✓</span>
          <span className="text-muted small">نوع المهمة:</span>
          <span className="fw-bold ms-2">{watch('type') ? t(`type.${watch('type')}`) : ''}</span>
        </div>
      </div>
      
      <div className="text-center mb-4">
        <h5 className="mb-2">{t('tasks.selectClient')}</h5>
        <p className="text-muted small">{t('tasks.selectClientDescription')}</p>
      </div>
      
      {/* If client is preselected, show it */}
      {client ? (
        <div className="preselected-client">
          <div className="client-card selected">
            <div className="client-info">
              <div className="client-name">{client.name}</div>
              <div className="client-phone">{client.phone}</div>
            </div>
            <div className="selected-indicator">
              <i className="fas fa-check-circle text-success"></i>
            </div>
          </div>
        </div>
      ) : (
        <div className="client-search-container">
          <ClientSearchCompact
            label=""
            onSelect={onClientSelected}
            disabled={false}
            // placeholder="ابحث عن العميل بالاسم أو رقم الهاتف..."
          />
        </div>
      )}
      
      <Controller
        name="client_id"
        control={control}
        rules={{ required: true }}
        render={({ field }) => (
          <input type="hidden" {...field} />
        )}
      />
      {errors.client_id && <div className="text-center text-danger small mt-2">{t('tasks.formClientLabel')} is required</div>}
      
      <style>{`
        .client-selection-step {
          padding: 1rem 0;
        }
        
        .selected-type-display {
          padding: 0.75rem;
          background-color: #f8f9fa;
          border-radius: 0.375rem;
          border: 1px solid #e9ecef;
        }
        
        .preselected-client {
          margin-bottom: 1rem;
        }
        
        .client-card {
          padding: 1rem;
          border: 2px solid #e9ecef;
          border-radius: 0.5rem;
          background: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .client-card.selected {
          border-color: #28a745;
          background-color: #f8fff9;
        }
        
        .client-info {
          flex: 1;
        }
        
        .client-name {
          font-weight: 600;
          font-size: 1rem;
          color: #495057;
        }
        
        .client-phone {
          font-size: 0.875rem;
          color: #6c757d;
          margin-top: 0.25rem;
        }
        
        .selected-indicator {
          font-size: 1.25rem;
        }
        
        .client-search-container {
          padding: 0 1rem;
        }
      `}</style>
    </div>
  );
};

export default ClientSelectionStep;