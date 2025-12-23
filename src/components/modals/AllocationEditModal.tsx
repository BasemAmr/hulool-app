import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useUpdateAllocation, useDeleteAllocation } from '../../queries/allocationQueries';
import { useGetClientCredits } from '../../queries/clientCreditQueries';
import { useModalStore } from '../../stores/modalStore';
import { useToast } from '../../hooks/useToast';
import { TOAST_MESSAGES } from '../../constants/toastMessages';
import { getErrorMessage } from '../../utils/errorUtils';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import SaudiRiyalIcon from '../ui/SaudiRiyalIcon';
import React from 'react';

interface AllocationEditForm {
  amount: number;
  description: string;
}

interface AllocationEditModalProps {
  allocation: {
    id: number;
    amount: number;
    description: string;
    credit_id: number;
    receivable_id: number;
    allocated_at: string;
  };
  clientId: number;
}

const AllocationEditModal: React.FC = () => {
  const { t } = useTranslation();
  const { closeModal, props } = useModalStore();
  const { success, error } = useToast();
  const { allocation, clientId } = props as AllocationEditModalProps;
  
  const { data: clientCredits } = useGetClientCredits(clientId);
  const updateAllocation = useUpdateAllocation();
  const deleteAllocation = useDeleteAllocation();

  const { register, handleSubmit, formState: { errors } } = useForm<AllocationEditForm>({
    defaultValues: {
      amount: allocation.amount,
      description: allocation.description || ''
    }
  });

  // const watchedAmount = watch('amount');

  const onSubmit = async (data: AllocationEditForm) => {
    if (data.amount <= 0) {
      return;
    }

    // Check if the new amount exceeds available credit
    const availableCredit = (clientCredits?.balance || 0) + allocation.amount;
    const currentAllocation = allocation.amount;
    const difference = data.amount - currentAllocation;
    
    if (difference > availableCredit) {
      alert(t('allocations.insufficientCredit'));
      return;
    }

    updateAllocation.mutate({
      allocationId: allocation.id,
      amount: data.amount,
      description: data.description
    }, {
      onSuccess: () => {
        success(TOAST_MESSAGES.ALLOCATION_UPDATED, 'تم تحديث التخصيص بنجاح');
        closeModal();
      },
      onError: (err: any) => {
        error(TOAST_MESSAGES.UPDATE_FAILED, getErrorMessage(err, 'فشل تحديث التخصيص'));
      }
    });
  };
  // const formatCurrency = (amount: number) => {
  //   if (isNaN(amount) || amount === null || amount === undefined) return 'SAR 0.00';
  //   return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR' }).format(amount);
  // };


  return (
    <BaseModal
      title={t('allocations.editAllocation')}
      onClose={closeModal}
      isOpen={true}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          label={t('allocations.amount')}
          error={errors.amount?.message}
          required
        >
          <Input
            type="number"
            step="0.01"
            min="0.01"
            {...register('amount', {
              required: t('validation.required'),
              min: { value: 0.01, message: t('validation.minAmount') },
              validate: (value) => {
                if (value <= 0) return t('validation.positiveAmount');
                return true;
              }
            })}
            placeholder={t('allocations.enterAmount')}
          />
        </FormField>

        <div className="text-xs text-muted-foreground">
          {t('allocations.currentAllocation')}: <SaudiRiyalIcon amount={allocation.amount} />
        </div>

        <FormField
          label={t('allocations.description')}
          error={errors.description?.message}
        >
          <Input
            type="text"
            {...register('description', {
              maxLength: { value: 255, message: t('validation.maxLength', { count: 255 }) }
            })}
            placeholder={t('allocations.enterDescription')}
          />
        </FormField>

        {clientCredits && (
          <div className="rounded-lg border border-blue-600 bg-blue-50 p-3">
            <small className="text-blue-800">
              {t('allocations.availableCredit')}: <SaudiRiyalIcon amount={clientCredits.balance} />
            </small>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button
            type="button"
            variant="danger"
            onClick={() => {
              if (window.confirm(t('allocations.deleteAllocationConfirmation'))) {
                deleteAllocation.mutate(allocation.id, {
                  onSuccess: () => {
                    success(TOAST_MESSAGES.ALLOCATION_DELETED, 'تم حذف التخصيص بنجاح');
                    closeModal();
                  },
                  onError: (err: any) => {
                    error(TOAST_MESSAGES.DELETE_FAILED, getErrorMessage(err, 'فشل حذف التخصيص'));
                  }
                });
              }
            }}
            isLoading={deleteAllocation.isPending}
          >
            {t('common.delete')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={closeModal}
            disabled={updateAllocation.isPending || deleteAllocation.isPending}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={updateAllocation.isPending}
            disabled={updateAllocation.isPending || deleteAllocation.isPending}
          >
            {t('common.save')}
          </Button>
        </div>
      </form>
    </BaseModal>
  );
};

export default AllocationEditModal;


interface FormFieldProps {
  label: React.ReactNode;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

const FormField: React.FC<FormFieldProps> = ({ label, error, required, children }) => (
  <div className="space-y-2">
    <label className="font-semibold text-black text-sm block">
      {label}
      {required && <span className="text-destructive ml-1">*</span>}
    </label>
    {children}
    {error && <div className="text-destructive text-sm" role="alert">{error}</div>}
  </div>
);