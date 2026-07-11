import { useMemo } from 'react';
import { useModalStore } from '@/shared/stores/modalStore';
import type { FCClientSummary } from '@/features/financials/types/fcTypes';

interface FCNeedsAttentionListProps {
  clients: FCClientSummary[];
  isLoading: boolean;
}

const numberFormat = new Intl.NumberFormat('en-US', { minimumFractionDigits: 0 });

const FCNeedsAttentionList = ({ clients, isLoading }: FCNeedsAttentionListProps) => {
  const openModal = useModalStore((state) => state.openModal);

  const attentionClients = useMemo(() => {
    if (!clients.length) return [];

    // Top 5 highest total_outstanding
    return [...clients]
      .filter((c) => c.total_outstanding > 0)
      .sort((a, b) => b.total_outstanding - a.total_outstanding)
      .slice(0, 5);
  }, [clients]);

  if (!attentionClients.length || isLoading) return null;

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {attentionClients.map((client) => (
        <div
          key={client.client_id}
          className="flex-shrink-0 p-3 rounded-lg border border-border-default bg-bg-surface cursor-pointer hover:bg-bg-surface-hover transition-colors"
          style={{ width: 200 }}
          onClick={() =>
            openModal('accountLedger', {
              clientId: client.client_id,
              clientName: client.client_name,
            })
          }
        >
          <p className="font-bold text-text-primary truncate text-sm">{client.client_name}</p>
          {client.total_outstanding > 0 && (
            <p className="text-xs text-text-danger mt-1">
              المستحق: {numberFormat.format(client.total_outstanding)}
            </p>
          )}
          {client.last_activity && (
            <p className="text-xs text-text-muted mt-1">
              آخر نشاط: {new Date(client.last_activity).toLocaleDateString('ar-SA')}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};

export default FCNeedsAttentionList;
