import { useModalStore } from '@/shared/stores/modalStore';
import { MessageCircle, Eye, Wallet } from 'lucide-react';
import type { FCClientSummary, FCClientTotals } from '@/features/financials/types/fcTypes';
import type { RefCallback } from 'react';

interface FCClientsTableProps {
  clients: FCClientSummary[];
  isLoading: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  loadMoreRef: RefCallback<HTMLDivElement>;
  totals?: FCClientTotals;
}

const numberFormat = new Intl.NumberFormat('en-US', { minimumFractionDigits: 0 });

const formatPhoneForWhatsApp = (phone: string | null): string => {
  if (!phone) return '';
  return phone.replace(/[^\d+]/g, '');
};

const FCClientsTable = ({
  clients,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  loadMoreRef,
  totals,
}: FCClientsTableProps) => {
  const openModal = useModalStore((state) => state.openModal);

  const handleOpenLedger = (client: FCClientSummary) => {
    openModal('accountLedger', { clientId: client.client_id, clientName: client.client_name });
  };

  const handleWhatsApp = (phone: string) => {
    if (!phone) return;
    const formatted = formatPhoneForWhatsApp(phone);
    window.open(`https://wa.me/${formatted}`, '_blank');
  };

  const handleRepayment = (client: FCClientSummary) => {
    openModal('manualTransaction', {
      direction: 'repayment',
      accountType: 'client',
      preselectedAccount: {
        id: client.client_id,
        name: client.client_name,
        type: 'client' as const,
        balance: client.total_outstanding,
        email: null,
        last_activity: null,
        pending_count: 0,
        pending_amount: 0,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 bg-bg-surface-muted rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (!clients.length) {
    return (
      <div className="text-center py-12 text-text-muted">
        لا يوجد عملاء
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border-default">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-bg-surface-muted sticky top-0 z-10">
            <th className="px-4 py-3 border border-border-default text-right text-sm font-extrabold text-text-primary">
              اسم العميل
            </th>
            <th className="px-4 py-3 border border-border-default text-right text-sm font-extrabold text-text-primary">
              رقم الجوال
            </th>
            <th className="px-4 py-3 border border-border-default text-right text-sm font-extrabold text-text-primary">
              إجمالي المدين
            </th>
            <th className="px-4 py-3 border border-border-default text-right text-sm font-extrabold text-text-primary">
              إجمالي الدائن
            </th>
            <th className="px-4 py-3 border border-border-default text-right text-sm font-extrabold text-text-primary">
              المستحق
            </th>
            <th className="px-4 py-3 border border-border-default text-right text-sm font-extrabold text-text-primary">
              الإجراءات
            </th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client, index) => (
            <tr
              key={client.client_id}
              className={`transition-colors ${
                index % 2 === 0 ? 'bg-background' : 'bg-bg-surface'
              } hover:bg-primary/5 group cursor-default`}
            >
              <td className="px-4 py-3 border border-border-default text-base">
                <button
                  onClick={() => handleOpenLedger(client)}
                  className="text-text-primary hover:text-text-brand font-bold cursor-pointer hover:underline"
                >
                  {client.client_name}
                </button>
              </td>
              <td className="px-4 py-3 border border-border-default text-base">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{client.client_phone || '-'}</span>
                  {client.client_phone && (
                    <button
                      onClick={() => handleWhatsApp(client.client_phone)}
                      className="text-green-600 hover:text-green-700"
                      title="WhatsApp"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 border border-border-default text-base font-bold tabular-nums">
                {numberFormat.format(client.total_debit)}
              </td>
              <td className="px-4 py-3 border border-border-default text-base font-bold tabular-nums">
                {numberFormat.format(client.total_credit)}
              </td>
              <td
                className={`px-4 py-3 border border-border-default text-base font-bold tabular-nums ${
                  client.total_outstanding > 0 ? 'text-text-danger' : client.total_outstanding < 0 ? 'text-status-success-text' : ''
                }`}
              >
                {numberFormat.format(client.total_outstanding)}
              </td>
              <td className="px-4 py-3 border border-border-default">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenLedger(client)}
                    className="p-1.5 rounded hover:bg-primary/10 text-text-secondary hover:text-primary transition-colors"
                    title="عرض كشف الحساب"
                  >
                    <Eye className="h-[18px] w-[18px]" />
                  </button>
                  {client.client_phone && (
                    <button
                      onClick={() => handleWhatsApp(client.client_phone)}
                      className="p-1.5 rounded hover:bg-primary/10 text-green-600 hover:text-green-700 transition-colors"
                      title="WhatsApp"
                    >
                      <MessageCircle className="h-[18px] w-[18px]" />
                    </button>
                  )}
                  <button
                    onClick={() => handleRepayment(client)}
                    className="p-1.5 rounded hover:bg-primary/10 text-text-secondary hover:text-primary transition-colors"
                    title="سداد"
                  >
                    <Wallet className="h-[18px] w-[18px]" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>

        {/* Totals footer */}
        {totals && (
          <tfoot>
            <tr className="bg-bg-surface-muted font-extrabold text-base">
              <td className="px-4 py-3 border border-border-default text-text-primary" colSpan={2}>
                الإجمالي ({totals.clients_count} عميل)
              </td>
              <td className="px-4 py-3 border border-border-default tabular-nums text-text-primary">
                {numberFormat.format(totals.total_debit)}
              </td>
              <td className="px-4 py-3 border border-border-default tabular-nums text-text-primary">
                {numberFormat.format(totals.total_credit)}
              </td>
              <td className="px-4 py-3 border border-border-default tabular-nums text-text-danger">
                {numberFormat.format(totals.total_outstanding)}
              </td>
              <td className="px-4 py-3 border border-border-default" />
            </tr>
          </tfoot>
        )}
      </table>

      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <div className="inline-block w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {hasNextPage && <div ref={loadMoreRef} className="h-4" />}
    </div>
  );
};

export default FCClientsTable;
