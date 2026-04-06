import React from 'react';
import BaseModal from '@/shared/ui/layout/BaseModal';
import AccountLedgerTable from '@/features/invoices/components/AccountLedgerTable';
import { useModalStore } from '@/shared/stores/modalStore';
import { useGetClient } from '@/features/clients/api/clientQueries';

const AccountLedgerModal: React.FC = () => {
    const props = useModalStore((state) => state.props) as { clientId: number; clientName?: string; filter?: 'all' | 'invoices' | 'payments' | 'credits' };
    const closeModal = useModalStore((state) => state.closeModal);

    const { clientId, clientName, filter } = props;

    const { data: clientData, isLoading, error } = useGetClient(clientId);

    const handleClose = () => {
        closeModal();
    };

    return (
        <BaseModal
            isOpen={true}
            onClose={handleClose}
            title={`كشف حساب - ${clientName || 'العميل'}`}
            className='min-w-[80%]'
        >
            {isLoading && (
                <div className="flex justify-center items-center p-8">
                    <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="ml-2">جاري التحميل...</span>
                </div>
            )}
            {error && (
                <div className="text-center p-8 text-status-danger-text">
                    خطأ في تحميل بيانات العميل: {error.message}
                </div>
            )}
            {clientData && !isLoading && !error && (
                <div className="w-[70vw]  p-4">
                    <AccountLedgerTable
                        client={clientData}
                        filter={filter || 'all'}
                        hideAmounts={false}
                    />
                </div>
            )}
        </BaseModal>
    );
};

export default AccountLedgerModal;