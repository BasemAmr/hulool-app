import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useCreateClient, useUpdateClient } from '../../queries/clientQueries';
import type { Client, ClientPayload } from '../../api/types';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';

interface ClientFormProps {
  clientToEdit?: Client;
  onSuccess: () => void;
}

const ClientForm = ({ clientToEdit, onSuccess }: ClientFormProps) => {
  const { t } = useTranslation();
  const isEditMode = !!clientToEdit;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientPayload>({
    defaultValues: {
      name: clientToEdit?.name || '',
      phone: clientToEdit?.phone || '',
      type: clientToEdit?.type || 'Other',
      google_drive_link: clientToEdit?.google_drive_link || '',
      notes: clientToEdit?.notes || '',
    },
  });

  const createMutation = useCreateClient();
  const updateMutation = useUpdateClient();
  const mutation = isEditMode ? updateMutation : createMutation;

  const clientTypeOptions = [
    { value: 'Government', label: t('clients.types.government') },
    { value: 'RealEstate', label: t('clients.types.realEstate') },
    { value: 'Accounting', label: t('clients.types.accounting') },
    { value: 'Other', label: t('clients.types.other') },
  ];

  const onSubmit = (data: ClientPayload) => {
    if (isEditMode) {
      updateMutation.mutate({ id: clientToEdit.id, clientData: data }, {
        onSuccess,
      });
    } else {
      createMutation.mutate(data, {
        onSuccess,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input
        label={t('clients.formNameLabel')}
        {...register('name', { required: true })}
        error={errors.name ? 'This field is required' : undefined}
      />
      <Input
        label={t('clients.formPhoneLabel')}
        {...register('phone', { required: true })}
        error={errors.phone ? 'This field is required' : undefined}
      />
      <Select
        label={t('clients.formTypeLabel')}
        options={clientTypeOptions}
        placeholder={t('common.select')}
        {...register('type', { required: true })}
        error={errors.type ? t('common.required') : undefined}
      />
      <Input
        label={t('clients.formDriveLabel')}
        {...register('google_drive_link', {
          required: t('common.required') as string,
          pattern: {
            value: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
            message: 'Please enter a valid URL'
          }
        })}
        error={errors.google_drive_link ? (errors.google_drive_link.message as string) : undefined}
      />
      <div className="mb-3">
        <label className="form-label">{t('clients.formNotesLabel')}</label>
        <textarea
          className="form-control"
          rows={3}
          {...register('notes')}
          placeholder={t('clients.formNotesPlaceholder')}
        />
      </div>
      <footer className="modal-footer">
        <Button
          type="submit"
          isLoading={mutation.isPending}
        >
          {mutation.isPending ? t('common.saving') : t('common.save')}
        </Button>
      </footer>
    </form>
  );
};

export default ClientForm;