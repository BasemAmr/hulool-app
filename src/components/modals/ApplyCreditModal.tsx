import { useForm } from 'react-hook-form';
import { useModalStore } from '../../stores/modalStore';
import { useApplyCreditToReceivable } from '../../queries/clientCreditQueries';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import type { Receivable, ApplyCreditPayload } from '../../api/types';

interface ApplyCreditModalProps {
    receivable: Receivable;
    availableCredit: number;
}

const ApplyCreditModal = () => {
    const closeModal = useModalStore(state => state.closeModal);
    const props = useModalStore(state => state.props as ApplyCreditModalProps);
    const { receivable, availableCredit } = props;

    const applyCreditMutation = useApplyCreditToReceivable();

    const amountToApply = Math.min(receivable.remaining_amount, availableCredit);

    const { register, handleSubmit, formState: { errors } } = useForm<Omit<ApplyCreditPayload, 'receivableId'>>({
        defaultValues: {
            amount: amountToApply,
            paid_at: new Date().toISOString().split('T')[0],
            note: `تطبيق رصيد للمستحق: ${receivable.description}`,
        }
    });

    const onSubmit = (data: Omit<ApplyCreditPayload, 'receivableId'>) => {
        applyCreditMutation.mutate({
            receivableId: Number(receivable.id),
            amount: Number(data.amount),
            note: data.note,
            paid_at: data.paid_at,
        }, {
            onSuccess: closeModal,
        });
    };

    return (
        <BaseModal isOpen={true} onClose={closeModal} title="تطبيق رصيد العميل">
            <div className="alert alert-info">
                <div>الرصيد المتاح للعميل: <strong>{availableCredit.toLocaleString()} ريال</strong></div>
                <div>المتبقي على المستحق: <strong>{receivable.remaining_amount.toLocaleString()} ريال</strong></div>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)}>
                <Input
                    label="المبلغ المراد تطبيقه"
                    type="number"
                    step="0.01"
                    max={amountToApply}
                    {...register('amount', {
                        required: "المبلغ مطلوب",
                        valueAsNumber: true,
                        max: { value: amountToApply, message: `لا يمكن تطبيق أكثر من ${amountToApply} ريال` }
                    })}
                    error={errors.amount?.message}
                />
                <Input
                    label="تاريخ التطبيق"
                    type="date"
                    {...register('paid_at', { required: "التاريخ مطلوب" })}
                    error={errors.paid_at?.message}
                />
                <Input
                    label="ملاحظات"
                    {...register('note')}
                />
                <footer className="modal-footer">
                    <Button type="button" variant="secondary" onClick={closeModal}>إلغاء</Button>
                    <Button type="submit" isLoading={applyCreditMutation.isPending}>تطبيق الرصيد</Button>
                </footer>
            </form>
        </BaseModal>
    );
};

export default ApplyCreditModal;