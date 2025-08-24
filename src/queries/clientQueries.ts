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
    staleTime: 60 * 1000, // Keep fresh for 1 minute
    // refetchOnWindowFocus: false (inherited from global default)
  });
};

export const useCreateClient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createClient,
    onSuccess: (newClient) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] }); // Invalidate all clients lists
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }); // Dashboard stats for total clients
      queryClient.invalidateQueries({ queryKey: ['clientCountsByType'] }); // Client counts by type
      // If creating from a specific client profile context, consider invalidating that client:
      queryClient.invalidateQueries({ queryKey: ['client', newClient.id] });
    },
  });
};

export const useUpdateClient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateClient,
    onSuccess: (updatedClient) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] }); // Invalidate all clients lists
      queryClient.invalidateQueries({ queryKey: ['client', updatedClient.id] }); // Invalidate specific client profile
      // If client type changed, counts might need updating:
      queryClient.invalidateQueries({ queryKey: ['clientCountsByType'] });
    },
  });
};

export const useDeleteClient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] }); // Invalidate all clients lists
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }); // Dashboard stats for total clients
      queryClient.invalidateQueries({ queryKey: ['clientCountsByType'] }); // Client counts by type
    },
  });
};

export const useGetClient = (clientId: number) => {
    return useQuery({
        queryKey: ['client', clientId],
        queryFn: () => fetchClientById(clientId),
        enabled: !!clientId,
        staleTime: 30 * 1000, // Keep fresh for 30 seconds
        // refetchOnWindowFocus: false (inherited)
    });
};

export const useSearchClients = (term: string) => {
    return useQuery({
        queryKey: ['clientSearch', term],
        queryFn: () => searchClients(term),
        enabled: term.length >= 2,
        staleTime: 0, // Always refetch on new search term
        // refetchOnWindowFocus: false (inherited, makes sense for search)
    });
};

export const useGetClientUnpaidAmounts = (clientId: number) => {
    return useQuery({
        queryKey: ['clientUnpaidAmounts', clientId],
        queryFn: () => fetchClientUnpaidAmounts(clientId),
        enabled: !!clientId,
        staleTime: 30 * 1000, // Keep fresh for 30 seconds
        // refetchOnWindowFocus: false (inherited)
    });
};

export const useGetClientCountsByType = () => {
    return useQuery({
        queryKey: ['clientCountsByType'],
        queryFn: fetchClientCountsByType,
        staleTime: 5 * 60 * 1000, // Keep fresh for 5 minutes
        // refetchOnWindowFocus: false (inherited)
    });
};

export const useExportClients = () => {
    // const queryClient = useQueryClient();
    return useMutation({
        mutationFn: exportClients,
        // No specific invalidation needed here as it's an export, not a data change.
        // If the export relies on "fresh" data, ensure the underlying query is invalidated beforehand.
    });
};


const updateClientSortOrder = async ({ taskType, clientIds }: { taskType: string; clientIds: number[] }) => {
    const { data } = await apiClient.post<ApiResponse<any>>('/clients/sort-order', {
        task_type: taskType,
        client_ids: clientIds,
    });
    return data;
};

export const useUpdateClientSortOrder = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateClientSortOrder,
        onSuccess: () => {
            // Invalidate to get the latest server-confirmed order
            queryClient.invalidateQueries({ queryKey: ['dashboard', 'clientsWithActiveTasks'] });
        },
    });
};