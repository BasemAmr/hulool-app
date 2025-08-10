import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/apiClient';
import type { ApiResponse, Client, ClientPayload, ClientPaginatedData, ClientUnpaidAmounts, ClientCountsByType, ClientType } from '../api/types';

// --- Query Functions ---
// Fetch paginated clients (normal list)
const fetchClients = async (search: string, typeFilter?: ClientType): Promise<ClientPaginatedData> => {
    // If search is present, use the dedicated search endpoint
    if (search && search.trim().length > 0) {
        const { data } = await apiClient.get<ApiResponse<ClientPaginatedData>>('/clients/search', {
            params: { term: search, limit: 1000 },
        });
        return data.data;
    }
    // Otherwise, fetch all clients with stats for unpaid amounts
    const params: any = { page: 1, per_page: 1000, include_stats: true };
    if (typeFilter) {
        params.type = typeFilter;
    }
    const { data } = await apiClient.get<ApiResponse<ClientPaginatedData>>('/clients', {
        params,
    });
    return data.data;
};

const createClient = async (clientData: ClientPayload): Promise<Client> => {
  const { data } = await apiClient.post<ApiResponse<Client>>('/clients', clientData);
  return data.data;
};

const updateClient = async ({ id, clientData }: { id: number; clientData: Partial<ClientPayload> }): Promise<Client> => {
  const { data } = await apiClient.put<ApiResponse<Client>>(`/clients/${id}`, clientData);
  return data.data;
};

const deleteClient = async (id: number): Promise<void> => {
  await apiClient.delete<ApiResponse<null>>(`/clients/${id}`);
};
const fetchClientById = async (id: number): Promise<Client> => {
    const { data } = await apiClient.get<ApiResponse<Client>>(`/clients/${id}`);
    if (!data.success) throw new Error(data.message || 'Failed to fetch client.');
    return data.data;
};

const searchClients = async (term: string): Promise<Client[]> => {
    if (term.length < 2) return []; // Don't search for less than 2 characters
    const { data } = await apiClient.get<ApiResponse<{clients: Client[]}>>('/clients/search', {
        params: { term, limit: 1000 }
    });
    return data.data.clients;
};

const fetchClientUnpaidAmounts = async (clientId: number): Promise<ClientUnpaidAmounts> => {
    const { data } = await apiClient.get<ApiResponse<ClientUnpaidAmounts>>(`/clients/${clientId}/unpaid-amounts`);
    return data.data;
};

const fetchClientCountsByType = async (): Promise<ClientCountsByType> => {
    const { data } = await apiClient.get<ApiResponse<ClientCountsByType>>('/clients/counts/types');
    return data.data;
};

const exportClients = async (type?: ClientType): Promise<{ clients: Client[]; type?: ClientType; count: number }> => {
    const params: any = {};
    if (type) {
        params.type = type;
    }
    const { data } = await apiClient.get<ApiResponse<{ clients: Client[]; type?: ClientType; count: number }>>('/clients/export', {
        params,
    });
    return data.data;
};

// --- React Query Hooks ---
export const useGetClients = (search: string, typeFilter?: ClientType) => {
  return useQuery({
    queryKey: ['clients', search, typeFilter],
    queryFn: () => fetchClients(search, typeFilter),
    placeholderData: (previousData) => previousData,
  });
};

export const useCreateClient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createClient,
    onSuccess: () => {
      // Invalidate and refetch all 'clients' queries after a creation
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
};

export const useUpdateClient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
};

export const useDeleteClient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
};

export const useGetClient = (clientId: number) => {
    return useQuery({
        queryKey: ['client', clientId],
        queryFn: () => fetchClientById(clientId),
        enabled: !!clientId,
    });
};

export const useSearchClients = (term: string) => {
    return useQuery({
        queryKey: ['clientSearch', term],
        queryFn: () => searchClients(term),
        enabled: term.length >= 2,
    });
};

export const useGetClientUnpaidAmounts = (clientId: number) => {
    return useQuery({
        queryKey: ['clientUnpaidAmounts', clientId],
        queryFn: () => fetchClientUnpaidAmounts(clientId),
        enabled: !!clientId,
    });
};

export const useGetClientCountsByType = () => {
    return useQuery({
        queryKey: ['clientCountsByType'],
        queryFn: fetchClientCountsByType,
    });
};

export const useExportClients = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: exportClients,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
        },
    });
};