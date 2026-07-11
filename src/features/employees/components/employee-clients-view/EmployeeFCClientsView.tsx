import { useState, useMemo } from 'react';
import { useInView } from 'react-intersection-observer';
import { useGetMyClientsReceivablesSummaryInfinite, useGetMyClientsReceivablesTotals } from '@/features/employees/api/employeeFinancialQueries';
import FCClientsSearchBar from '@/features/financials/components/fc-clients-view/FCClientsSearchBar';
import FCNeedsAttentionList from '@/features/financials/components/fc-clients-view/FCNeedsAttentionList';
import FCClientsTable from '@/features/financials/components/fc-clients-view/FCClientsTable';
import type { FCClientTotals, FCClientSummary } from '@/features/financials/types/fcTypes';

const EmployeeFCClientsView = () => {
  const [search, setSearch] = useState('');

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useGetMyClientsReceivablesSummaryInfinite();

  const { data: totalsData } = useGetMyClientsReceivablesTotals();

  // Flatten all pages — handle both possible response shapes:
  // Shape 1: page.clients (like FCClientsView)
  // Shape 2: page.data.clients (employee API wraps in data)
  const allClients = useMemo<FCClientSummary[]>(
    () =>
      data?.pages.flatMap((page: any) => {
        if (page.clients) return page.clients;
        if (page.data?.clients) return page.data.clients;
        if (page.data) return page.data;
        return [];
      }) || [],
    [data]
  );

  // Client-side search filter (employee API doesn't support server-side search)
  const filteredClients = useMemo(() => {
    if (!search.trim()) return allClients;
    const term = search.toLowerCase();
    return allClients.filter(
      (client) =>
        client.client_name?.toLowerCase().includes(term) ||
        client.client_phone?.includes(term)
    );
  }, [allClients, search]);

  // Map totals to FCClientTotals
  const mappedTotals = useMemo<FCClientTotals | undefined>(() => {
    if (!totalsData) return undefined;
    // The API returns response.data which may be nested under data
    const d = totalsData.data || totalsData;
    return {
      total_debit: d.total_debit || 0,
      total_credit: d.total_credit || 0,
      total_outstanding: d.total_outstanding || 0,
      clients_count: d.clients_count || 0,
      clients_with_debt: d.clients_with_debt || 0,
      clients_with_credit: d.clients_with_credit || 0,
      balanced_clients: d.balanced_clients || 0,
    };
  }, [totalsData]);

  // Infinite scroll sentinel
  const { ref: loadMoreRef } = useInView({
    threshold: 1,
    onChange: (inView) => {
      if (inView && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
  });

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-text-primary border-b border-border-default pb-3">العملاء</h2>
      <FCClientsSearchBar search={search} onSearchChange={setSearch} />
      <FCNeedsAttentionList clients={filteredClients} isLoading={isLoading} />
      <FCClientsTable
        clients={filteredClients}
        isLoading={isLoading}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        loadMoreRef={loadMoreRef}
        totals={mappedTotals}
      />
    </div>
  );
};

export default EmployeeFCClientsView;
