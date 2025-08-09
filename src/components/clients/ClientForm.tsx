import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useCreateClient, useUpdateClient } from '../../queries/clientQueries';
import type { Client, ClientPayload } from '../../api/types';
import Button from '../ui/Button';
import Input from '../ui/Input';

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
      google_drive_link: clientToEdit?.google_drive_link || '',
      notes: clientToEdit?.notes || '',
    },
  });

  const createMutation = useCreateClient();
  const updateMutation = useUpdateClient();
  const mutation = isEditMode ? updateMutation : createMutation;

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
      <Input
        label={t('clients.formNotesLabel')}
        type="textarea"
        {...register('notes')}
        error={errors.notes ? 'This field is required' : undefined}
      />
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