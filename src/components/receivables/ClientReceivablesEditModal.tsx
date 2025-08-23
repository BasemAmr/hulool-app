import React from 'react';
import { useModalStore } from '../../stores/modalStore';
import { useGetClientReceivables } from '../../queries/receivableQueries';
import { useGetClient } from '../../queries/clientQueries';
import ClientReceivablesTable from './ClientReceivablesTable';
 

const ClientReceivablesEditModal: React.FC = () => {
  const { props, closeModal } = useModalStore();
  const { clientId } = props as { clientId: number };

  const { data: client, isLoading: clientLoading } = useGetClient(clientId);
  const { data: receivablesData, isLoading: receivablesLoading } = useGetClientReceivables(clientId);

  if (clientLoading || receivablesLoading) {
    return (
      <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="modal-dialog modal-xl">
          <div className="modal-content">
            <div className="modal-body text-center py-5">
              <div className="loading-spinner"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!client) {
    return null;
  }

  return (
    <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-xl modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              تعديل مستحقات العميل: {client.name}
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={closeModal}
              aria-label="Close"
            />
          </div>
          <div className="modal-body p-0">
            <ClientReceivablesTable
              receivables={receivablesData?.statementItems || []}
              isLoading={receivablesLoading}
              client={client}
              filter="all"
            />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={closeModal}>
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientReceivablesEditModal;