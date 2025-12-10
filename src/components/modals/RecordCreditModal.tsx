import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
// import { useTranslation } from 'react-i18next';
import { useModalStore } from '../../stores/modalStore';
import { useRecordClientCredit } from '../../queries/clientCreditQueries';
import { useGetPaymentMethods } from '../../queries/paymentQueries';
import { useGetClient } from '../../queries/clientQueries';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import ClientSearchCompact from '../shared/ClientSearchCompact';
import type { Client, RecordCreditPayload } from '../../api/types';

const RecordCreditModal = () => {
//   const { t } = useTranslation();
  const closeModal = useModalStore(state => state.closeModal);
  const props = useModalStore(state => state.props as { client?: Client });
  const [selectedClient, setSelectedClient] = useState<Client | null>(props.client || null);
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
        closeModal();
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
            <div className="rounded-lg border border-blue-600 bg-blue-50 p-3 flex items-center justify-between">
              <p className="text-blue-800 text-sm">
                العميل: <strong>{selectedClient.name}</strong>
              </p>
              <Button variant="secondary" size="sm" onClick={() => setSelectedClient(null)}>تغيير</Button>
            </div>
            <Input
              label="المبلغ"
              type="number"
              step="0.01"
              {...register('amount', { required: true, valueAsNumber: true })}
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
              <label className="font-medium text-sm text-black block">طريقة الدفع</label>
              <select 
                {...register('payment_method_id', { 
                  setValueAs: (v) => v === '' ? undefined : Number(v) 
                })} 
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-black"
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