import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import apiClient from '../api/apiClient';
import type { ApiResponse, Receivable, ManualReceivablePayload, UpdateReceivablePayload, ReceivablePaginatedData, ClientStatementPaginatedData, ClientSummary, TaskType, PaymentDecision, AllocationDecision } from '../api/types';

// --- API Functions ---
const RECEIVABLES_PER_PAGE = 20; // Define a constant for page size
const CLIENTS_SUMMARY_PER_PAGE = 20; // Define a constant for clients summary page size

const fetchReceivables = async (): Promise<ReceivablePaginatedData> => {
  const { data } = await apiClient.get<ApiResponse<ReceivablePaginatedData>>('/receivables');
  return data.data;
};

const createManualReceivable = async (payload: ManualReceivablePayload): Promise<Receivable> => {
    const { data } = await apiClient.post<ApiResponse<Receivable>>('/receivables', payload);
    if (!data.success) throw new Error(data.message || 'Failed to create receivable');
    return data.data;
};

const updateReceivable = async ({ id, payload }: { id: number; payload: UpdateReceivablePayload }): Promise<Receivable> => {
    const { data } = await apiClient.put<ApiResponse<Receivable>>(`/receivables/${id}`, payload);
    if (!data.success) throw new Error(data.message || 'Failed to update receivable');
    return data.data;
};

const deleteReceivable = async (id: number): Promise<void> => {
    const { data } = await apiClient.delete<ApiResponse<null>>(`/receivables/${id}`);
    if (!data.success) throw new Error(data.message || 'Failed to delete receivable');
};

const resolveReceivableOverpayment = async ({ id, resolution }: { id: number; resolution: { new_amount: number; payment_decisions?: PaymentDecision[]; allocation_decisions?: AllocationDecision[] } }): Promise<Receivable> => {
    const { data } = await apiClient.post<ApiResponse<Receivable>>(`/receivables/${id}/resolve-overpayment`, resolution);
    if (!data.success) throw new Error(data.message || 'Failed to resolve overpayment');
    return data.data;
};

const autoResolveReceivableOverpayment = async ({ id, new_amount, resolution_type }: { id: number; new_amount: number; resolution_type: 'auto_reduce_payments' | 'auto_reduce_latest' | 'convert_surplus_to_credit' }): Promise<Receivable> => {
    const { data } = await apiClient.post<ApiResponse<Receivable>>(`/receivables/${id}/auto-resolve-overpayment`, { new_amount, resolution_type });
    if (!data.success) throw new Error(data.message || 'Failed to auto-resolve overpayment');
    return data.data;
};

const deleteReceivableWithResolution = async ({ id, resolution }: { id: number; resolution: { payment_decisions?: PaymentDecision[]; allocation_decisions?: AllocationDecision[] } }): Promise<{ summary: object }> => {
    const { data } = await apiClient.post<ApiResponse<{ summary: object }>>(`/receivables/${id}/delete-with-resolution`, resolution);
    if (!data.success) throw new Error(data.message || 'Failed to delete receivable with resolution');
    return data.data;
};

// Fetch Single Client Receivables (now fetches the statement)
const fetchClientReceivables = async (clientId: number): Promise<ClientStatementPaginatedData> => {
  const { data } = await apiClient.get<ApiResponse<ClientStatementPaginatedData>>(`/receivables/client/${clientId}`);
  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch client statement.');
  }
  
  // Ensure data structure is properly formatted
  const responseData = data.data;
  
  // Transform statement items to ensure all required fields are present
  const statementItems = (responseData.statementItems || []).map(item => ({
    ...item,
    // Ensure required fields are populated with defaults if missing
    remaining_amount: Number(item.remaining_amount ?? (Number(item.debit) - Number(item.credit))),
    receivable_id: item.receivable_id,
    payments: item.payments || [],
    type: item.type || 'Other',
    task_id: item.task_id || null,
    // Ensure date fields are properly formatted
    date: item.date || new Date().toISOString(),
    description: item.description || 'N/A',
    // Convert string amounts to numbers
    debit: Number(item.debit || 0),
    credit: Number(item.credit || 0)
  }));
  
  return {
    statementItems,
    totals: responseData.totals || { totalDebit: 0, totalCredit: 0, balance: 0 }
  };
};

// NEW: Fetch ALL raw receivables for a client (for export)
const fetchAllClientReceivables = async (clientId: number): Promise<{ receivables: Receivable[] }> => {
    const { data } = await apiClient.get<ApiResponse<{ receivables: any[] }>>(`/receivables/client/${clientId}/all`);
    if (!data.success) {
        throw new Error(data.message || 'Failed to fetch all client receivables.');
    }
    
    // Transform API response to match Receivable interface
    const transformedReceivables: Receivable[] = data.data.receivables.map(receivable => ({
        id: Number(receivable.id),
        client_id: Number(receivable.client_id),
        task_id: receivable.task_id ? Number(receivable.task_id) : null,
        reference_receivable_id: receivable.reference_receivable_id ? Number(receivable.reference_receivable_id) : null,
        created_by: Number(receivable.created_by),
        type: receivable.type as TaskType,
        description: receivable.description,
        amount: Number(receivable.amount),
        original_amount: receivable.original_amount ? Number(receivable.original_amount) : null,
        amount_details: typeof receivable.amount_details === 'string' 
            ? JSON.parse(receivable.amount_details || '[]') 
            : receivable.amount_details,
        adjustment_reason: receivable.adjustment_reason,
        notes: receivable.notes,
        due_date: receivable.due_date,
        created_at: receivable.created_at,
        updated_at: receivable.updated_at,
        client_name: receivable.client_name,
        client_phone: receivable.client_phone,
        task_name: receivable.task_name,
        task_type: receivable.task_type,
        total_paid: Number(receivable.total_paid || 0),
        remaining_amount: Number(receivable.remaining_amount || 0),
        payments: receivable.payments || [],
        allocations: receivable.allocations || [],
        client: {},
        task: receivable.task_id ? { id: Number(receivable.task_id) } : undefined
    }));
    
    return { receivables: transformedReceivables };
};

// Fetch Clients Receivables Summary

// UPDATE THIS FUNCTION
const fetchClientsReceivablesSummary = async (): Promise<{ clients: ClientSummary[] }> => {
  const { data } = await apiClient.get<ApiResponse<{ clients: any[] }>>('/receivables/clients-summary');
  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch clients receivables summary.');
  }
  
  // Transform API response fields to match ClientSummary interface
  const transformedClients: ClientSummary[] = data.data.clients.map(client => ({
    client_id: Number(client.client_id || 0),
    client_name: client.client_name || '',
    client_phone: client.client_phone || '',
    total_amount: Number(client.total_receivables || 0),
    paid_amount: Number(client.total_paid || 0),
    remaining_amount: Number(client.total_outstanding || 0),
    receivables_count: Number(client.receivables_count || 0)
  }));
  
  return { clients: transformedClients };
};

// New paginated fetch function for clients receivables summary (infinite queries)
export const fetchPaginatedClientsReceivablesSummary = async ({ pageParam = 1, search = '' }: { pageParam?: number; search?: string }): Promise<{ clients: ClientSummary[]; pagination: any }> => {
  const params: any = { page: pageParam, per_page: CLIENTS_SUMMARY_PER_PAGE };
  if (search) {
    params.search = search;
  }
  
  const { data } = await apiClient.get<ApiResponse<{ clients: any[]; pagination: any }>>('/receivables/clients-summary', {
    params
  });
  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch clients receivables summary.');
  }
  
  // Transform API response fields to match ClientSummary interface
  const transformedClients: ClientSummary[] = data.data.clients.map(client => ({
    client_id: Number(client.client_id || 0),
    client_name: client.client_name || '',
    client_phone: client.client_phone || '',
    total_amount: Number(client.total_receivables || 0),
    paid_amount: Number(client.total_paid || 0),
    remaining_amount: Number(client.total_outstanding || 0),
    receivables_count: Number(client.receivables_count || 0)
  }));
  
  return { clients: transformedClients, pagination: data.data.pagination };
};

// New function to fetch totals only
const fetchClientsReceivablesTotals = async (): Promise<{
  total_amount: number;
  total_paid: number;
  total_unpaid: number;
  clients_count: number;
  clients_with_debt: number;
  clients_with_credit: number;
  balanced_clients: number;
}> => {
  const { data } = await apiClient.get<ApiResponse<any>>('/receivables/clients-summary/totals');
  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch clients receivables totals.');
  }
  
  return {
    total_amount: Number(data.data.total_amount || 0),
    total_paid: Number(data.data.total_paid || 0),
    total_unpaid: Number(data.data.total_unpaid || 0),
    clients_count: Number(data.data.clients_count || 0),
    clients_with_debt: Number(data.data.clients_with_debt || 0),
    clients_with_credit: Number(data.data.clients_with_credit || 0),
    balanced_clients: Number(data.data.balanced_clients || 0)
  };
};


// Fetch Payable Receivables
const fetchPayableReceivables = async (clientId?: number | null): Promise<ReceivablePaginatedData> => {
  const url = clientId ? `/receivables/payable?client_id=${clientId}` : '/receivables/payable';
  const { data } = await apiClient.get<ApiResponse<ReceivablePaginatedData>>(url);
  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch payable receivables.');
  }
  return data.data;
};

// Fetch Filtered Receivables (paid or overdue)
const fetchFilteredReceivables = async (filter: 'paid' | 'overdue'): Promise<ReceivablePaginatedData> => {
  const { data } = await apiClient.get<ApiResponse<ReceivablePaginatedData>>(`/receivables/filtered?filter=${filter}&per_page=1000`);
  if (!data.success) {
    throw new Error(data.message || `Failed to fetch ${filter} receivables.`);
  }
  return data.data;
};

// New paginated fetch function for filtered receivables (infinite queries)
export const fetchPaginatedFilteredReceivables = async ({ pageParam = 1, queryKey }: { pageParam?: number; queryKey: any }): Promise<ReceivablePaginatedData> => {
  const [_key, _filtered, filter] = queryKey;
  const { data } = await apiClient.get<ApiResponse<ReceivablePaginatedData>>(`/receivables/filtered?filter=${filter}&page=${pageParam}&per_page=${RECEIVABLES_PER_PAGE}`);
  if (!data.success) {
    throw new Error(data.message || `Failed to fetch ${filter} receivables.`);
  }
  return data.data;
};


// --- React Query Hooks ---

export const useGetReceivables = () => {
  return useQuery({
    queryKey: ['receivables'], // This key refers to the *summary* list of clients with receivables
    queryFn: fetchReceivables, // This fetches client summaries by default in your ClientRepository
    staleTime: 30 * 1000, // Keep fresh for 30 seconds
    // refetchOnWindowFocus: false (inherited)
  });
};

export const useCreateManualReceivable = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createManualReceivable,
        onSuccess: (newReceivable) => {
            queryClient.invalidateQueries({ queryKey: ['receivables'] }); // Invalidate all receivables summaries
            queryClient.invalidateQueries({ queryKey: ['clients'] }); // Invalidate clients to update overall totals
            queryClient.invalidateQueries({ queryKey: ['dashboard'] }); // Invalidate dashboard stats
            queryClient.invalidateQueries({ queryKey: ['receivables', 'client', newReceivable.client_id] }); // Invalidate specific client statement
            queryClient.invalidateQueries({ queryKey: ['receivables', 'payable', newReceivable.client_id] }); // Invalidate payable list for that client
            queryClient.invalidateQueries({ queryKey: ['receivables', 'filtered', 'paid'] }); // Might affect paid list
            queryClient.invalidateQueries({ queryKey: ['receivables', 'filtered', 'overdue'] }); // Might affect overdue list
        },
    });
};

// UPDATE THIS HOOK's RETURN TYPE
export const useGetClientReceivables = (clientId: number, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['receivables', 'client', clientId],
    // The query function is already correct, just ensure the return type matches
    queryFn: () => fetchClientReceivables(clientId),
    enabled: !!clientId && enabled,
    staleTime: 10 * 1000,
  });
};

export const useGetAllClientReceivables = (clientId: number, enabled: boolean = true) => {
    return useQuery({
        queryKey: ['receivables', 'client', clientId, 'all'], // Specific key for export data
        queryFn: () => fetchAllClientReceivables(clientId),
        enabled: !!clientId && enabled,
        staleTime: 5 * 60 * 1000, // Data for export doesn't need to be minute-by-minute fresh
        // refetchOnWindowFocus: false (inherited)
    });
};

// UPDATE THIS HOOK's RETURN TYPE
export const useGetClientsReceivablesSummary = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['receivables', 'clients-summary'],
    queryFn: fetchClientsReceivablesSummary,
    enabled,
    staleTime: 30 * 1000,
  });
};

// New infinite query hook for paginated clients receivables summary
export const useGetClientsReceivablesSummaryInfinite = (enabled: boolean = true, search: string = '') => {
  return useInfiniteQuery({
    queryKey: ['receivables', 'clients-summary', search],
    queryFn: ({ pageParam }) => fetchPaginatedClientsReceivablesSummary({ pageParam, search }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      // If the current page is less than the total pages, return the next page number
      if (lastPage.pagination.current_page < lastPage.pagination.total_pages) {
        return lastPage.pagination.current_page + 1;
      }
      // Otherwise, return undefined to signify there are no more pages
      return undefined;
    },
    enabled,
    staleTime: 30 * 1000, // Keep fresh for 30 seconds
  });
};

// New hook to fetch totals only
export const useGetClientsReceivablesTotals = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['receivables', 'clients-summary', 'totals'],
    queryFn: fetchClientsReceivablesTotals,
    enabled,
    staleTime: 60 * 1000, // Keep totals fresh for 1 minute
  });
};

export const useGetPayableReceivables = (clientId?: number | null) => {
  return useQuery({
    queryKey: ['receivables', 'payable', clientId],
    queryFn: () => fetchPayableReceivables(clientId),
    enabled: clientId !== undefined,
    staleTime: 0, // Always get freshest data when user is selecting a receivable to pay
    // refetchOnWindowFocus: false (inherited)
  });
}

export const useGetFilteredReceivables = (filter: 'paid' | 'overdue', enabled: boolean = true) => {
  return useQuery({
    queryKey: ['receivables', 'filtered', filter],
    queryFn: () => fetchFilteredReceivables(filter),
    enabled,
    staleTime: 30 * 1000, // Keep fresh for 30 seconds
    // refetchOnWindowFocus: false (inherited)
  });
};

// New infinite query hook for paginated filtered receivables
export const useGetFilteredReceivablesInfinite = (filter: 'paid' | 'overdue', enabled: boolean = true) => {
  return useInfiniteQuery({
    queryKey: ['receivables', 'filtered', filter],
    queryFn: fetchPaginatedFilteredReceivables,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      // If the current page is less than the total pages, return the next page number
      if (lastPage.pagination.current_page < lastPage.pagination.total_pages) {
        return lastPage.pagination.current_page + 1;
      }
      // Otherwise, return undefined to signify there are no more pages
      return undefined;
    },
    enabled,
    staleTime: 30 * 1000, // Keep fresh for 30 seconds
  });
};

// --- Mutation Hooks for CRUD Operations ---

export const useUpdateReceivable = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateReceivable,
    onSuccess: (updatedReceivable) => {
      // Invalidate related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['receivables'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['receivables', 'client', updatedReceivable.client_id] });
      queryClient.invalidateQueries({ queryKey: ['receivables', 'payable', updatedReceivable.client_id] });
      queryClient.invalidateQueries({ queryKey: ['receivables', 'filtered', 'paid'] });
      queryClient.invalidateQueries({ queryKey: ['receivables', 'filtered', 'overdue'] });
    },
  });
};

export const useDeleteReceivable = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteReceivable,
    onSuccess: () => {
      // Invalidate related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['receivables'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      // Note: We can't invalidate specific client queries without knowing the client_id
      // This will be handled by the calling component
    },
  });
};

export const useResolveReceivableOverpayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resolveReceivableOverpayment,
    onSuccess: (updatedReceivable) => {
      // Invalidate related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['receivables'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['receivables', 'client', updatedReceivable.client_id] });
      queryClient.invalidateQueries({ queryKey: ['receivables', 'payable', updatedReceivable.client_id] });
      queryClient.invalidateQueries({ queryKey: ['receivables', 'filtered', 'paid'] });
      queryClient.invalidateQueries({ queryKey: ['receivables', 'filtered', 'overdue'] });
    },
  });
};

export const useAutoResolveReceivableOverpayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: autoResolveReceivableOverpayment,
    onSuccess: (updatedReceivable) => {
      // Invalidate related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['receivables'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['receivables', 'client', updatedReceivable.client_id] });
      queryClient.invalidateQueries({ queryKey: ['receivables', 'payable', updatedReceivable.client_id] });
      queryClient.invalidateQueries({ queryKey: ['receivables', 'filtered', 'paid'] });
      queryClient.invalidateQueries({ queryKey: ['receivables', 'filtered', 'overdue'] });
    },
  });
};

export const useDeleteReceivableWithResolution = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteReceivableWithResolution,
    onSuccess: () => {
      // Invalidate related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['receivables'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      // Note: We can't invalidate specific client queries without knowing the client_id
      // This will be handled by the calling component
    },
  });
}