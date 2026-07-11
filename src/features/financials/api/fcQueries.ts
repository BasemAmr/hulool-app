import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';
import type { FCEmployeeSummary, FCClientSummary } from '@/features/financials/types/fcTypes';
import type { TreasuryAccount } from '@/api/types';

export type { TreasuryAccount } from '@/api/types';

interface RawAccount {
  type: string;
  id: number;
  name: string;
  email: string | null;
  balance: number;
  last_activity: string | null;
  pending_count: number;
  pending_amount: number;
}

interface AccountsResponse {
  accounts: RawAccount[];
  summary: Record<string, any>;
  pagination?: {
    page: number;
    per_page: number;
    total: number;
    pages: number;
  };
}

interface RawClientBalance {
  client_id: number;
  client_name: string;
  client_phone: string;
  total_debit: number;
  total_credit: number;
  total_outstanding: number;
  transaction_count: number;
  last_activity: string | null;
}

interface ClientBalancesPage {
  clients: FCClientSummary[];
  pagination: {
    total: number;
    per_page: number;
    current_page: number;
    total_pages: number;
  };
}

const CLIENTS_PER_PAGE = 20;

export const useGetEmployeeAccounts = () => {
  return useQuery<FCEmployeeSummary[]>({
    queryKey: ['fc', 'employees'],
    queryFn: async () => {
      const { data } = await apiClient.get<AccountsResponse>('/accounts', {
        params: { type: 'employee', per_page: 50 },
      });
      return (data.accounts || []).map((a) => ({
        id: a.id,
        display_name: a.name,
        balance: a.balance,
        last_activity: a.last_activity,
      }));
    },
    staleTime: 2 * 60 * 1000,
  });
};

const fetchFCClientBalancesPage = async ({
  pageParam = 1,
  search = '',
}: {
  pageParam?: number;
  search?: string;
}): Promise<ClientBalancesPage> => {
  const params: Record<string, any> = { page: pageParam, per_page: CLIENTS_PER_PAGE };
  if (search) params.search = search;
  const { data } = await apiClient.get<{
    clients: RawClientBalance[];
    pagination: { total: number; per_page: number; current_page: number; total_pages: number };
  }>('/accounts/clients/balances', { params });
  return {
    clients: (data.clients || []).map((c) => ({
      client_id: Number(c.client_id),
      client_name: c.client_name || '',
      client_phone: c.client_phone || '',
      total_debit: Number(c.total_debit || 0),
      total_credit: Number(c.total_credit || 0),
      total_outstanding: Number(c.total_outstanding || 0),
      transaction_count: Number(c.transaction_count || 0),
      last_activity: c.last_activity || null,
    })),
    pagination: data.pagination,
  };
};

export const useGetFCClientBalancesInfinite = (search: string) => {
  return useInfiniteQuery({
    queryKey: ['fc', 'clients', 'balances', search],
    queryFn: ({ pageParam }) => fetchFCClientBalancesPage({ pageParam, search }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.current_page < lastPage.pagination.total_pages) {
        return lastPage.pagination.current_page + 1;
      }
      return undefined;
    },
    staleTime: 30 * 1000,
  });
};

export const useGetTreasuryAccountsList = () => {
  return useQuery<TreasuryAccount[]>({
    queryKey: ['treasury-accounts'],
    queryFn: async () => {
      const response = await apiClient.get<any>('/treasury-accounts');
      return response.data.data || response.data || [];
    },
    staleTime: 30 * 1000,
  });
};
