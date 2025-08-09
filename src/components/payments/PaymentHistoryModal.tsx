import { useTranslation } from 'react-i18next';
import { useModalStore } from '../../stores/modalStore';
import { useGetReceivablePayments } from '../../queries/paymentQueries';
import type { Receivable, Payment } from '../../api/types';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';

// The props the modal receives from the modalStore
interface PaymentHistoryModalProps {
  receivable: Receivable;
}

const PaymentHistoryModal = () => {
    const { t } = useTranslation();
    const closeModal = useModalStore((state) => state.closeModal);
    const props = useModalStore((state) => state.props as PaymentHistoryModalProps);
    const { receivable } = props;

    // --- THE OPTIMIZATION ---
    // We pass the payments we already have from the `receivable` object
    // as `initialData` to the hook.
    const { data: payments } = useGetReceivablePayments(receivable.id, receivable.payments);

    return (
        <BaseModal
            isOpen={true}
            onClose={closeModal}
            title={t('payments.historyTitle', { description: receivable.description })}
        >
            {/* Because we provide initialData, `isLoading` will be false on the first render */}
            {/* We can show a more subtle refetching indicator if needed later */}
            {!payments?.length && (
                <p className="text-center text-muted">{t('payments.noPayments')}</p>
            )}
            
            {payments && payments.length > 0 && (
                <div className="table-responsive">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>{t('payments.tableHeaderAmount')}</th>
                                <th>{t('payments.tableHeaderMethod')}</th>
                                <th>{t('payments.tableHeaderDate')}</th>
                                <th>{t('payments.tableHeaderNotes')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.map((payment: Payment) => (
                                <tr key={payment.id}>
                                    <td>{payment.amount}</td>
                                    {/* Now we can access the nested payment_method object */}
                                    <td>{payment.payment_method?.name_ar || 'N/A'}</td>
                                    <td>{payment.paid_at}</td>
                                    <td>{payment.note || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
             <footer className="modal-footer">
                <Button type="button" variant="secondary" onClick={closeModal}>
                    {t('common.close')}
                </Button>
            </footer>
        </BaseModal>
    );
};

export default PaymentHistoryModal;