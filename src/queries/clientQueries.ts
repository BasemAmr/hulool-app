import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import apiClient from '../api/apiClient';
import type { ApiResponse, Client, ClientPayload, ClientPaginatedData, ClientUnpaidAmounts, ClientCountsByType } from '../api/types';

// --- Query Functions ---
const CLIENTS_PER_PAGE = 20; // Define a constant for page size

// Fetch paginated clients (normal list)
const fetchClients = async (search: string, regionFilter?: number | null): Promise<ClientPaginatedData> => {
    try {
        // If search is present, use the dedicated search endpoint
        if (search && search.trim().length > 0) {
            const { data } = await apiClient.get<ApiResponse<ClientPaginatedData>>('/clients/search', {
                params: { term: search, limit: 1000 },
            });
            
            let clients = data.data?.clients || [];
            
            // Apply region filter client-side if specified
            if (regionFilter) {
                clients = clients.filter(client => client.region_id === regionFilter);
            }
            
            return {
                clients: clients,
                pagination: {
                    total: clients.length,
                    per_page: 1000,
                    current_page: 1,
                    total_pages: 1,
                    has_next: false,
                    has_prev: false
                }
            };
        }
        
        // Otherwise, fetch all clients with stats for unpaid amounts
        const params: any = { page: 1, per_page: 1000, include_stats: true };
        if (regionFilter) {
            params.region_id = regionFilter;
        }
        const { data } = await apiClient.get<ApiResponse<ClientPaginatedData>>('/clients', {
            params,
        });
        return data.data;
    } catch (error) {
        console.error('Error fetching clients:', error);
        return {
            clients: [],
            pagination: {
                total: 0,
                per_page: 1000,
                current_page: 1,
                total_pages: 0,
                has_next: false,
                has_prev: false
            }
        };
    }
};

// New paginated fetch function for infinite queries
export const fetchPaginatedClients = async ({ pageParam = 1, queryKey }: { pageParam?: number; queryKey: any }): Promise<ClientPaginatedData> => {
  const [_key, search, regionFilter] = queryKey;
  
  try {
    // If both search and region filter are present, we need to handle them differently
    // since the search endpoint doesn't support region filtering
    if (search && search.trim().length > 0) {
      // Use search endpoint first
      const { data } = await apiClient.get<ApiResponse<ClientPaginatedData>>('/clients/search', {
        params: { term: search, limit: 1000 }, // Get more results to filter client-side
      });
      
      let clients = data.data?.clients || [];
      
      // Apply region filter client-side if specified
      if (regionFilter) {
        clients = clients.filter(client => client.region_id === regionFilter);
      }
      
      // Calculate pagination for filtered results
      const total = clients.length;
      const startIndex = (pageParam - 1) * CLIENTS_PER_PAGE;
      const endIndex = startIndex + CLIENTS_PER_PAGE;
      const paginatedClients = clients.slice(startIndex, endIndex);
      const totalPages = Math.ceil(total / CLIENTS_PER_PAGE);
      
      return {
        clients: paginatedClients,
        pagination: {
          total: total,
          per_page: CLIENTS_PER_PAGE,
          current_page: pageParam,
          total_pages: totalPages,
          has_next: pageParam < totalPages,
          has_prev: pageParam > 1
        }
      };
    }
    
    // Otherwise, fetch clients with pagination and stats (no search, just region filter)
    const params: any = { page: pageParam, per_page: CLIENTS_PER_PAGE, include_stats: true };
    if (regionFilter) {
      params.region_id = regionFilter;
    }
    const { data } = await apiClient.get<ApiResponse<ClientPaginatedData>>('/clients', {
      params,
    });
    
    // Ensure the response has the expected structure
    if (!data.data || !data.data.pagination) {
      return {
        clients: data.data?.clients || [],
        pagination: {
          total: data.data?.clients?.length || 0,
          per_page: CLIENTS_PER_PAGE,
          current_page: pageParam,
          total_pages: 1,
          has_next: false,
          has_prev: pageParam > 1
        }
      };
    }
    
    return data.data;
  } catch (error) {
    // Return a safe fallback structure on error
    console.error('Error fetching paginated clients:', error);
    return {
      clients: [],
      pagination: {
        total: 0,
        per_page: CLIENTS_PER_PAGE,
        current_page: pageParam,
        total_pages: 0,
        has_next: false,
        has_prev: false
      }
    };
  }
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

const exportClients = async (regionId?: number): Promise<{ clients: Client[]; region_id?: number; count: number }> => {
    const params: any = {};
    if (regionId) {
        params.region_id = regionId;
    }
    const { data } = await apiClient.get<ApiResponse<{ clients: Client[]; region_id?: number; count: number }>>('/clients/export', {
        params,
    });
    return data.data;
};

// --- React Query Hooks ---
export const useGetClients = (search: string, regionFilter?: number | null) => {
  return useQuery({
    queryKey: ['clients', search, regionFilter],
    queryFn: () => fetchClients(search, regionFilter),
    placeholderData: (previousData) => previousData,
    staleTime: 60 * 1000, // Keep fresh for 1 minute
    // refetchOnWindowFocus: false (inherited from global default)
  });
};

// New infinite query hook for paginated clients
export const useGetClientsInfinite = (search: string, regionFilter?: number | null) => {
  return useInfiniteQuery({
    queryKey: ['clients', search, regionFilter],
    queryFn: fetchPaginatedClients,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      // Check if lastPage and pagination exist to prevent errors
      if (!lastPage || !lastPage.pagination) {
        return undefined;
      }
      
      // If the current page is less than the total pages, return the next page number
      if (lastPage.pagination.current_page < lastPage.pagination.total_pages) {
        return lastPage.pagination.current_page + 1;
      }
      // Otherwise, return undefined to signify there are no more pages
      return undefined;
    },
    placeholderData: (previousData) => previousData,
    staleTime: 60 * 1000, // Keep fresh for 1 minute
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
    // --- START: OPTIMISTIC UPDATE LOGIC ---
    onMutate: async (id) => {
      // 1. Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['clients'] });

      // 2. Snapshot the previous state of clients queries
      const previousClientsData: any = queryClient.getQueryData(['clients']);

      // 3. Optimistically remove the client from the list
      if (previousClientsData) {
        // Handle infinite query data structure
        if (previousClientsData.pages) {
          queryClient.setQueryData(['clients'], (oldData: any) => {
            return {
              ...oldData,
              pages: oldData.pages.map((page: any) => ({
                ...page,
                clients: page.clients.filter((client: Client) => client.id !== id),
                pagination: {
                  ...page.pagination,
                  total: page.pagination.total - 1
                }
              })),
            };
          });
        } else {
          // Handle regular query data structure
          queryClient.setQueryData(['clients'], (oldData: any) => {
            return {
              ...oldData,
              clients: oldData.clients.filter((client: Client) => client.id !== id),
              pagination: {
                ...oldData.pagination,
                total: oldData.pagination.total - 1
              }
            };
          });
        }
      }

      // 4. Return a context object with the snapshotted values
      return { previousClientsData };
    },
    // --- END: OPTIMISTIC UPDATE LOGIC ---
    
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (_err, _variables, context) => {
      if (context?.previousClientsData) {
        queryClient.setQueryData(['clients'], context.previousClientsData);
      }
      // Note: We'll handle toast notifications in the UI components
    },
    // Always refetch after error or success to ensure data consistency
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] }); // Invalidate all clients lists
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }); // Dashboard stats for total clients
      queryClient.invalidateQueries({ queryKey: ['clientCountsByType'] }); // Client counts by type
    },
    onSuccess: () => {
      // The UI has already updated optimistically
      // Just ensure we invalidate related data
    }
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