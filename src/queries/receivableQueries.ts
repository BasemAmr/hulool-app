import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/apiClient';
import type { ApiResponse, Receivable, ManualReceivablePayload, ReceivablePaginatedData, ClientStatementPaginatedData, ClientSummary, TaskType } from '../api/types';

// --- API Functions ---
const fetchReceivables = async (): Promise<ReceivablePaginatedData> => {
  const { data } = await apiClient.get<ApiResponse<ReceivablePaginatedData>>('/receivables');
  return data.data;
};

const createManualReceivable = async (payload: ManualReceivablePayload): Promise<Receivable> => {
    const { data } = await apiClient.post<ApiResponse<Receivable>>('/receivables', payload);
    if (!data.success) throw new Error(data.message || 'Failed to create receivable');
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
}

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
}