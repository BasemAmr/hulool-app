import { useForm } from 'react-hook-form';
import { useModalStore } from '@/shared/stores/modalStore';
import { useApplyCreditToReceivable } from '@/features/clients/api/clientCreditQueries';
import { useToast } from '@/shared/hooks/useToast';
import { TOAST_MESSAGES } from '@/shared/constants/toastMessages';
import { getErrorMessage } from '@/shared/utils/errorUtils';
import BaseModal from '@/shared/ui/layout/BaseModal';
import Button from '@/shared/ui/primitives/Button';
import Input from '@/shared/ui/primitives/Input';
import type { Receivable, ApplyCreditPayload } from '@/api/types';

interface ApplyCreditModalProps {
    receivable: Receivable;
    availableCredit: number;
}

const ApplyCreditModal = () => {
    const closeModal = useModalStore(state => state.closeModal);
    const { success, error } = useToast();
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
            onSuccess: () => {
                success(TOAST_MESSAGES.CREDIT_APPLIED, `تم تطبيق رصيد بمبلغ ${data.amount} ريال على المستحق`);
                closeModal();
            },
            onError: (err: any) => {
                error(TOAST_MESSAGES.OPERATION_FAILED, getErrorMessage(err, 'فشل تطبيق الرصيد'));
            }
        });
    };

    return (
        <BaseModal isOpen={true} onClose={closeModal} title="تطبيق رصيد العميل">
            <div className="rounded-lg border border-blue-600 bg-status-info-bg p-4 flex flex-col gap-2 mb-4">
                <div className="text-sm text-blue-800">الرصيد المتاح للعميل: <strong>{availableCredit.toLocaleString()} ريال</strong></div>
                <div className="text-sm text-blue-800">المتبقي على المستحق: <strong>{receivable.remaining_amount.toLocaleString()} ريال</strong></div>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                <div className="flex justify-end gap-2 pt-4 border-t border-border">
                    <Button type="button" variant="secondary" onClick={closeModal}>إلغاء</Button>
                    <Button type="submit" isLoading={applyCreditMutation.isPending}>تطبيق الرصيد</Button>
                </div>
            </form>
        </BaseModal>
    );
};

export default ApplyCreditModal;