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
      <form onSubmit={handleSubmit(onSubmit)}>
        {!selectedClient ? (
          <ClientSearchCompact onSelect={handleClientSelect} />
        ) : (
          <div>
            <div className="alert alert-info">
              العميل: <strong>{selectedClient.name}</strong>
              <Button variant="secondary" size="sm" className="float-end" onClick={() => setSelectedClient(null)}>تغيير</Button>
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
             <div className="mb-3">
              <label className="form-label">طريقة الدفع</label>
              <select {...register('payment_method_id')} className="form-select">
                {paymentMethods?.map(method => <option key={method.id} value={method.id}>{method.name}</option>)}
              </select>
            </div>
          </div>
        )}
        <footer className="modal-footer">
          <Button type="button" variant="secondary" onClick={closeModal} disabled={recordCreditMutation.isPending}>إلغاء</Button>
          <Button type="submit" isLoading={recordCreditMutation.isPending} disabled={!selectedClient}>حفظ الدفعة</Button>
        </footer>
      </form>
    </BaseModal>
  );
};
export default RecordCreditModal;