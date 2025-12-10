import React, { useEffect } from 'react';
import { useModalStore } from '../../stores/modalStore';
import { useGetClientReceivables } from '../../queries/receivableQueries';
import { useGetClient } from '../../queries/clientQueries';
import ClientReceivablesTable from './ClientReceivablesTable';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
 

const ClientReceivablesEditModal: React.FC = () => {
  const { props, closeModal } = useModalStore();
  const { clientId } = props as { clientId: number };

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeModal();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [closeModal]);

  const { data: client, isLoading: clientLoading } = useGetClient(clientId);
  const { data: receivablesData, isLoading: receivablesLoading } = useGetClientReceivables(clientId);

  if (!client) {
    return null;
  }

  return (
    <BaseModal
      isOpen={true}
      onClose={closeModal}
      title={`تعديل مستحقات العميل: ${client.name}`}
      className="max-w-6xl"
    >
      {(clientLoading || receivablesLoading) ? (
        <div className="text-center py-8">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
        </div>
      ) : (
        <>
          <div className="p-0">
            <ClientReceivablesTable
              receivables={receivablesData?.statementItems || []}
              isLoading={receivablesLoading}
              client={client}
              filter="all"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button type="button" variant="secondary" onClick={closeModal}>
              إغلاق
            </Button>
          </div>
        </>
      )}
    </BaseModal>
  );
};

export default ClientReceivablesEditModal;