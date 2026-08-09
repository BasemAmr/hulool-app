import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { useCreateClient, useUpdateClient } from '@/features/clients/api/clientQueries';
import type { Client, ClientPayload } from '@/api/types';
import Button from '@/shared/ui/primitives/Button';
import Input from '@/shared/ui/primitives/Input';
import RegionSelect from '@/features/clients/components/RegionSelect';
import { useToast } from '@/shared/hooks/useToast';
import BaseModal from '@/shared/ui/layout/BaseModal';
import { useModalStore } from '@/shared/stores/modalStore';

interface ClientFormProps {
  clientToEdit?: Client;
  onSuccess?: () => void;
}

const ClientForm = ({ clientToEdit, onSuccess }: ClientFormProps) => {
  const { t } = useTranslation();
  const { error: toastError, success: toastSuccess } = useToast();
  const closeModal = useModalStore((state) => state.closeModal);
  const isOpen = useModalStore((state) => state.isOpen);
  const modalType = useModalStore((state) => state.modalType);

  const isActive = isOpen && modalType === 'clientForm';

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

  const handleClose = () => {
    reset();
    closeModal();
  };

  const onSubmit = (data: ClientPayload) => {
    if (isEditMode && clientToEdit) {
      updateMutation.mutate({ id: clientToEdit.id, clientData: data }, {
        onSuccess: () => {
          toastSuccess('تم التحديث', 'تم تحديث بيانات العميل بنجاح');
          if (onSuccess) onSuccess();
          handleClose();
        },
        onError: (error: any) => {
          console.error('Client update error:', error);
          const errorMessage = error?.response?.data?.message;

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
          if (onSuccess) onSuccess();
          handleClose();
        },
        onError: (error: any) => {
          console.error('Client creation error:', error);
          const errorMessage = error?.response?.data?.message;

          if (errorMessage && errorMessage.includes('phone number already exists')) {
            toastError('خطأ في التسجيل', 'رقم الجوال مسجل مسبقاً في النظام. يرجى استخدام رقم جوال آخر.');
          } else {
            toastError('خطأ في إنشاء العميل', errorMessage || 'حدث خطأ أثناء إنشاء العميل');
          }
        }
      });
    }
  };

  if (!isActive) return null;

  return (
    <BaseModal
      isOpen={isActive}
      onClose={handleClose}
      title={isEditMode ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 dir-rtl" dir="rtl">
        <Input
          label={t('clients.formNameLabel') || 'اسم العميل'}
          {...register('name', { required: true })}
          error={errors.name ? 'هذا الحقل مطلوب' : undefined}
          placeholder="أدخل اسم العميل..."
        />

        <Input
          label={t('clients.formPhoneLabel') || 'رقم الهاتف / الجوال'}
          {...register('phone', { required: true })}
          error={errors.phone ? 'هذا الحقل مطلوب' : undefined}
          placeholder="مثال: 0500000000"
        />

        <RegionSelect
          control={control}
          name="region_id"
          label={t('clients.formRegionLabel') || 'المنطقة'}
          placeholder={t('clients.selectRegion') || 'اختر المنطقة...'}
          error={errors.region_id ? (t('common.required') || 'مطلوب') : undefined}
          allowCreate={true}
        />

        <Input
          label={t('clients.formDriveLabel') || 'رابط Google Drive'}
          {...register('google_drive_link', {
            pattern: {
              value: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
              message: 'يرجى إدخال رابط صحيح'
            }
          })}
          error={errors.google_drive_link ? (errors.google_drive_link.message as string) : undefined}
          placeholder="https://drive.google.com/..."
        />

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-text-primary block">
            {t('clients.formNotesLabel') || 'ملاحظات العميل'}
          </label>
          <textarea
            className="w-full px-3 py-2 text-sm bg-background border border-border-default rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-y min-h-[80px]"
            rows={3}
            {...register('notes')}
            placeholder={t('clients.formNotesPlaceholder') || 'أدخل أي ملاحظات خاصة بالعميل...'}
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border-default mt-6">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={mutation.isPending}
          >
            إلغاء
          </Button>

          <Button
            type="submit"
            variant="primary"
            isLoading={mutation.isPending}
          >
            {mutation.isPending ? (t('common.saving') || 'جاري الحفظ...') : (isEditMode ? 'تحديث' : (t('common.save') || 'حفظ'))}
          </Button>
        </div>
      </form>
    </BaseModal>
  );
};

export default ClientForm;