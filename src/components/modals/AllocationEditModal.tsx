import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useUpdateAllocation, useDeleteAllocation } from '../../queries/allocationQueries';
import { useGetClientCredits } from '../../queries/clientCreditQueries';
import { useModalStore } from '../../stores/modalStore';
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
        closeModal();
      }
    });
  };
  // const formatCurrency = (amount: number) => {
  //   if (isNaN(amount) || amount === null || amount === undefined) return 'SAR 0.00';
  //   return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(amount);
  // };


  return (
    <BaseModal
      title={t('allocations.editAllocation')}
      onClose={closeModal}
      isOpen={true}
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="modal-body">
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

          <div className="mb-3">
            <small className="text-dark">
              {t('allocations.currentAllocation')}: <SaudiRiyalIcon amount={allocation.amount} />
            </small>
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
            <div className="alert alert-info text-dark">
              <small>
                {t('allocations.availableCredit')}: <SaudiRiyalIcon amount={clientCredits.balance} />
              </small>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <Button
            type="button"
            variant="danger"
            onClick={() => {
              if (window.confirm(t('allocations.deleteAllocationConfirmation'))) {
                deleteAllocation.mutate(allocation.id, {
                  onSuccess: () => {
                    closeModal();
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
  <div className="mb-3">
    <label className="form-label">
      {label}
      {required && <span className="text-danger ms-1">*</span>}
    </label>
    {children}
    {error && <div className="text-danger mt-1" role="alert">{error}</div>}
  </div>
);