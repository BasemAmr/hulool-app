import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import ClientSearchCompact from '../shared/ClientSearchCompact';
import { useCreateManualReceivable } from '../../queries/receivableQueries';
import { useModalStore } from '../../stores/modalStore';
import type { Client, ManualReceivablePayload, TaskType } from '../../api/types';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { useState } from 'react';
import AmountDetailsInput from '../shared/AmountDetailsInput';

const ManualReceivableModal = () => {
  const { t } = useTranslation();
  const props = useModalStore((state) => state.props);
  const closeModal = useModalStore((state) => state.closeModal);
  const preselectedClient = props.client;
  const [step, setStep] = useState(0);
  const [selectedClient, setSelectedClient] = useState<Client | null>(preselectedClient || null);
  // const hasInitialized = useRef(false);
  const { register, handleSubmit, formState: { errors }, setValue, watch, control } = useForm<ManualReceivablePayload>({
    defaultValues: {
      client_id: preselectedClient?.id,
      amount_details: []
    }
  });
  const createMutation = useCreateManualReceivable();

  const taskTypes: TaskType[] = ['Government', 'RealEstate', 'Accounting', 'Other'];
  const totalAmount = watch('amount') || 0;

  const onSubmit = (data: ManualReceivablePayload) => {
    createMutation.mutate({ ...data, amount: Number(data.amount) }, {
      onSuccess: closeModal,
    });
  };

  return (
    <BaseModal isOpen={true} onClose={closeModal} title={t('receivables.addNewManual')}>
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Step 0: Task Type Selection */}
        {step === 0 && (
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
                          setStep(1);
                        }}
                      >
                        <div className="type-icon">
                          {type === 'Government' && <i className="fas fa-building"></i>}
                          {type === 'RealEstate' && <i className="fas fa-home"></i>}
                          {type === 'Accounting' && <i className="fas fa-calculator"></i>}
                          {type === 'Other' && <i className="fas fa-tasks"></i>}
                        </div>
                        <div className="type-label">{t(`receivables.type.${type}`)}</div>
                      </div>
                    ))}
                  </>
                )}
              />
            </div>
            {errors.type && <div className="text-center text-danger small mt-2">{t('common.required')}</div>}
            <div className="modal-footer-compact">
              <div className="footer-content">
                <div />
                <div className="footer-right">
                  <Button type="button" variant="secondary" size="sm" onClick={closeModal}>{t('common.cancel')}</Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Client Selection */}
        {step === 1 && (
          <div className="client-selection-step">
            <div className="selected-type-display mb-4">
              <div className="d-flex align-items-center justify-content-center">
                <span className="badge bg-primary me-2">✓</span>
                <span className="text-muted small">{t('receivables.selectType')}:</span>
                <span className="fw-bold ms-2">{watch('type') ? t(`receivables.type.${watch('type')}`) : ''}</span>
              </div>
            </div>
            {preselectedClient ? (
              <div className="text-center">
                <h5 className="mb-3">{t('receivables.selectedClient')}</h5>
                <div className="client-card selected mx-auto" style={{ maxWidth: '300px' }}>
                  <div className="client-info">
                    <div className="client-name">{preselectedClient.name}</div>
                    <div className="client-phone">{preselectedClient.phone}</div>
                  </div>
                  <div className="selected-indicator">
                    <i className="fas fa-check-circle text-success"></i>
                  </div>
                </div>
                <Button 
                  variant="primary" 
                  size="sm" 
                  className="mt-3"
                  onClick={() => {
                    setSelectedClient(preselectedClient);
                    setValue('client_id', preselectedClient.id);
                    setStep(2);
                  }}
                >
                  {t('common.continue')}
                </Button>
              </div>
            ) : (
              <>
                <div className="text-center mb-4">
                  <h5 className="mb-2">{t('tasks.selectClient')}</h5>
                  <p className="text-muted small">{t('tasks.selectClientDescription')}</p>
                </div>
                <div className="client-search-container">
                  <ClientSearchCompact
                    label=""
                    onSelect={(client) => {
                      setSelectedClient(client);
                      setValue('client_id', client.id);
                      setStep(2);
                    }}
                    disabled={false}
                  />
                </div>
              </>
            )}
            <Controller
              name="client_id"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <input type="hidden" {...field} />
              )}
            />
            {errors.client_id && <div className="text-center text-danger small mt-2">{t('common.required')}</div>}
            <div className="modal-footer-compact">
              <div className="footer-content">
                <div className="footer-left">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setStep(0)}>
                    <i className="fas fa-arrow-right me-1"></i>
                    {t('common.back')}
                  </Button>
                </div>
                <div className="footer-right">
                  <Button type="button" variant="secondary" size="sm" onClick={closeModal}>{t('common.cancel')}</Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <div>
            <div className="mb-4 p-3 bg-light rounded">
              <div className="row">
                <div className="col-md-6">
                  <label className="form-label">{t('receivables.selectedType')}</label>
                  <Controller
                    name="type"
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <select
                        {...field}
                        className={`form-select ${errors.type ? 'is-invalid' : ''}`}
                      >
                        <option value="">{t('tasks.formTypeLabel')}</option>
                        {taskTypes.map((type) => (
                          <option key={type} value={type}>{t(`receivables.type.${type}`)}</option>
                        ))}
                      </select>
                    )}
                  />
                  {errors.type && <div className="invalid-feedback">{t('common.required')}</div>}
                </div>
                <div className="col-md-6">
                  <label className="form-label">{t('receivables.selectedClient')}</label>
                  <div className="form-control-plaintext">
                    <strong>{selectedClient?.name}</strong>
                    <small className="d-block text-muted">{selectedClient?.phone}</small>
                  </div>
                  <small className="text-muted">
                    <button 
                      type="button" 
                      className="btn btn-link btn-sm p-0 text-decoration-none"
                      onClick={() => setStep(1)}
                    >
                      تغيير العميل
                    </button>
                  </small>
                </div>
              </div>
            </div>
            <Input
              label={t('receivables.tableHeaderDescription')}
              {...register('description', { required: true })}
              error={errors.description && t('common.required')}
            />
            <Input
              label={t('receivables.tableHeaderTotal')}
              type="number"
              step="0.01"
              {...register('amount', {
                required: true,
                valueAsNumber: true,
                validate: (value) => {
                  const detailsSum = watch('amount_details')?.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) || 0;
                  return value >= detailsSum || `المبلغ الإجمالي لا يمكن أن يكون أقل من مجموع التفاصيل (${detailsSum})`;
                }
              })}
              error={errors.amount ? errors.amount.message || 'Amount is required' : undefined}
            />
            <AmountDetailsInput
              control={control}
              register={register}
              totalAmount={totalAmount}
            />
            <div className="mb-3">
              <label className="form-label">{t('receivables.notes')}</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder={t('receivables.notesPlaceholder')}
                {...register('notes')}
              />
            </div>
            <Input
              label={t('receivables.tableHeaderDueDate')}
              type="date"
              {...register('due_date', { required: true })}
              error={errors.due_date && t('common.required')}
            />
            <div className="modal-footer-compact">
              <div className="footer-content">
                <div className="footer-left">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setStep(1)} disabled={createMutation.isPending}>
                    <i className="fas fa-arrow-right me-1"></i>
                    {t('common.back')}
                  </Button>
                </div>
                <div className="footer-right">
                  <Button type="button" variant="secondary" size="sm" onClick={closeModal} disabled={createMutation.isPending} className="me-2">
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" variant="primary" size="sm" isLoading={createMutation.isPending}>
                    {createMutation.isPending ? (
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
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Styles for steps */}
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
          .modal-footer-compact {
            border-top: 1px solid #e9ecef;
            padding: 0.75rem 1rem;
            background-color: #f8f9fa;
            border-radius: 0 0 0.375rem 0.375rem;
            margin: 0 -1rem -1rem -1rem;
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
      </form>
    </BaseModal>
  );
};

export default ManualReceivableModal;