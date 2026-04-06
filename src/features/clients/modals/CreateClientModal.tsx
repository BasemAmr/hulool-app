import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useModalStore } from '@/shared/stores/modalStore';
import { useRecordClientCredit } from '@/features/clients/api/clientCreditQueries';
import { useGetPaymentMethods } from '@/features/receivables/api/paymentQueries';
import { useGetClient } from '@/features/clients/api/clientQueries';
import { useToast } from '@/shared/hooks/useToast';
import { TOAST_MESSAGES } from '@/shared/constants/toastMessages';
import { getErrorMessage } from '@/shared/utils/errorUtils';
import BaseModal from '@/shared/ui/layout/BaseModal';
import Button from '@/shared/ui/primitives/Button';
import { NumberInput } from '@/shared/ui/primitives/NumberInput';
import Input from '@/shared/ui/primitives/Input';
import SaudiRiyalIcon from '@/shared/ui/icons/SaudiRiyalIcon';
import ClientSearchCompact from '@/shared/search/ClientSearchCompact';
import type { Client, RecordCreditPayload } from '@/api/types';

const RecordCreditModal = () => {
  const { t } = useTranslation();
  const closeModal = useModalStore(state => state.closeModal);
  const props = useModalStore(state => state.props as { client?: Client });
  const { success, error } = useToast();
  const [selectedClient, setSelectedClient] = useState<Client | null>(props.client || null);
  const [amount, setAmount] = useState<string>('');
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<RecordCreditPayload>();
  const recordCreditMutation = useRecordClientCredit();
  const { data: paymentMethods } = useGetPaymentMethods();
  const { data: preselectedClient } = useGetClient(selectedClient?.id || 0);

  useEffect(() => {
    if (preselectedClient) {
      setSelectedClient(preselectedClient);
      setValue('client_id', preselectedClient.id);
    }
  }, [preselectedClient]);

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    setValue('client_id', client.id);
  };

  const onSubmit = (data: RecordCreditPayload) => {
    recordCreditMutation.mutate({ ...data, amount: Number(data.amount) }, {
      onSuccess: () => {
        success(TOAST_MESSAGES.CREDIT_RECORDED, `تم تسجيل رصيد بمبلغ ${data.amount} ريال للعميل "${selectedClient?.name}"`);
        closeModal();
      },
      onError: (err: any) => {
        error(TOAST_MESSAGES.OPERATION_FAILED, getErrorMessage(err, 'فشل تسجيل الرصيد'));
      }
    });
  };

  return (
    <BaseModal isOpen={true} onClose={closeModal} title="إضافة دفعة للرصيد">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {!selectedClient ? (
          <ClientSearchCompact onSelect={handleClientSelect} />
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-blue-600 bg-status-info-bg p-3 flex items-center justify-between">
              <p className="text-blue-800 text-sm">
                العميل: <strong>{selectedClient.name}</strong>
              </p>
              <Button variant="secondary" size="sm" onClick={() => setSelectedClient(null)}>تغيير</Button>
            </div>
            <NumberInput
              name="amount"
              label={<span>{t('credits.amount')} <span className="text-status-danger-text">*</span></span> as any}
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setValue('amount', Number(e.target.value), { shouldValidate: true });
              }}
              placeholder="0.00"
              error={errors.amount && "المبلغ مطلوب"}
            />
            <Input
              label="الوصف"
              {...register('description', { required: true })}
              error={errors.description && "الوصف مطلوب"}
            />
            <Input
              label="تاريخ الاستلام"
              type="date"
              defaultValue={new Date().toISOString().split('T')[0]}
              {...register('received_at', { required: true })}
              error={errors.received_at && "التاريخ مطلوب"}
            />
            <div className="space-y-2">
              <label className="font-medium text-sm text-text-primary block">طريقة الدفع</label>
              <select
                {...register('payment_method_id', {
                  setValueAs: (v) => v === '' ? undefined : Number(v)
                })}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-text-primary"
              >
                <option value="">اختر طريقة الدفع</option>
                {paymentMethods?.map(method => <option key={method.id} value={method.id}>{method.name}</option>)}
              </select>
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button type="button" variant="secondary" onClick={closeModal} disabled={recordCreditMutation.isPending}>إلغاء</Button>
          <Button type="submit" isLoading={recordCreditMutation.isPending} disabled={!selectedClient}>حفظ الدفعة</Button>
        </div>
      </form>
    </BaseModal>
  );
};
export default RecordCreditModal;