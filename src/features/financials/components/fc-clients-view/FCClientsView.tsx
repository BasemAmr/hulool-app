import { useState, useEffect, useMemo } from 'react';
import { useInView } from 'react-intersection-observer';
import { useGetFCClientBalancesInfinite } from '@/features/financials/api/fcQueries';
import { useGetClientsReceivablesTotals } from '@/features/receivables/api/receivableQueries';
import FCClientsSearchBar from './FCClientsSearchBar';
import FCNeedsAttentionList from './FCNeedsAttentionList';
import FCClientsTable from './FCClientsTable';
import type { FCClientTotals } from '@/features/financials/types/fcTypes';

const FCClientsView = () => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useGetFCClientBalancesInfinite(debouncedSearch);

  const { data: totalsData } = useGetClientsReceivablesTotals();

  // Debounce search by 500ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Flatten all pages — backend sorts debtors first, then by last_activity desc
  const allClients = useMemo(
    () => data?.pages.flatMap((page) => page.clients) || [],
    [data]
  );

  // Map totals to FCClientTotals
  const mappedTotals = useMemo<FCClientTotals | undefined>(() => {
    if (!totalsData) return undefined;
    return {
      total_debit: totalsData.total_amount,
      total_credit: totalsData.total_paid,
      total_outstanding: totalsData.total_unpaid,
      clients_count: totalsData.clients_count,
      clients_with_debt: totalsData.clients_with_debt,
      clients_with_credit: totalsData.clients_with_credit,
      balanced_clients: totalsData.balanced_clients,
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
      <FCClientsSearchBar search={search} onSearchChange={setSearch} />

      <FCNeedsAttentionList clients={allClients} isLoading={isLoading} />

      <FCClientsTable
        clients={allClients}
        isLoading={isLoading}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        loadMoreRef={loadMoreRef}
        totals={mappedTotals}
      />
    </div>
  );
};

export default FCClientsView;
