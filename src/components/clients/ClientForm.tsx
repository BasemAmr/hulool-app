import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { useCreateClient, useUpdateClient } from '../../queries/clientQueries';
import type { Client, ClientPayload } from '../../api/types';
import Button from '../ui/Button';
import Input from '../ui/Input';
import RegionSelect from '../shared/RegionSelect';
import { useToast } from '../../hooks/useToast';

interface ClientFormProps {
  clientToEdit?: Client;
  onSuccess: () => void;
}

const ClientForm = ({ clientToEdit, onSuccess }: ClientFormProps) => {
  const { t } = useTranslation();
  const { error: toastError, success: toastSuccess } = useToast();

  const { register, handleSubmit, control, formState: { errors }, reset } = useForm<ClientPayload>({
    defaultValues: clientToEdit ? {
      name: clientToEdit.name,
      phone: clientToEdit.phone,
      region_id: clientToEdit.region_id,
      google_drive_link: clientToEdit.google_drive_link,
      notes: clientToEdit.notes,
    } : {}
  });

  const isEditMode = !!clientToEdit;
  const createMutation = useCreateClient();
  const updateMutation = useUpdateClient();
  const mutation = isEditMode ? updateMutation : createMutation;

  useEffect(() => {
    if (clientToEdit) {
      reset({
        name: clientToEdit.name,
        phone: clientToEdit.phone,
        region_id: clientToEdit.region_id,
        google_drive_link: clientToEdit.google_drive_link,
        notes: clientToEdit.notes,
      });
    } else {
      reset();
    }
  }, [clientToEdit, reset]);

  const onSubmit = (data: ClientPayload) => {
    if (isEditMode && clientToEdit) {
      updateMutation.mutate({ id: clientToEdit.id, clientData: data }, {
        onSuccess: () => {
          toastSuccess('تم التحديث', 'تم تحديث بيانات العميل بنجاح');
          onSuccess();
        },
        onError: (error: any) => {
          console.error('Client update error:', error);
          const errorMessage = error?.response?.data?.message;

          // Check for duplicate phone number error
          if (errorMessage && (errorMessage.includes('phone number already exists') || errorMessage.includes('Another client with this phone number'))) {
            toastError('خطأ في التحديث', 'رقم الجوال مسجل مسبقاً لعميل آخر. يرجى استخدام رقم جوال آخر.');
          } else {
            toastError('خطأ في تحديث العميل', errorMessage || 'حدث خطأ أثناء تحديث العميل');
          }
        }
      });
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          toastSuccess('تم الإنشاء', 'تم إنشاء العميل بنجاح');
          onSuccess();
        },
        onError: (error: any) => {
          console.error('Client creation error:', error);
          const errorMessage = error?.response?.data?.message;

          // Check for duplicate phone number error
          if (errorMessage && errorMessage.includes('phone number already exists')) {
            toastError('خطأ في التسجيل', 'رقم الجوال مسجل مسبقاً في النظام. يرجى استخدام رقم جوال آخر.');
          } else {
            toastError('خطأ في إنشاء العميل', errorMessage || 'حدث خطأ أثناء إنشاء العميل');
          }
        }
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
      <RegionSelect
        control={control}
        name="region_id"
        label={t('clients.formRegionLabel')}
        placeholder={t('clients.selectRegion')}
        error={errors.region_id ? t('common.required') : undefined}
        allowCreate={true}
      />
      <Input
        label={t('clients.formDriveLabel')}
        {...register('google_drive_link', {
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