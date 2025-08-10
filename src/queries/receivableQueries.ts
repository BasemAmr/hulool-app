import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/apiClient';
import type { ApiResponse, Receivable, ManualReceivablePayload, ReceivablePaginatedData, ClientStatementPaginatedData } from '../api/types';

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
    throw new Error(data.message || 'Failed to fetch client receivables.');
  }
  return data.data; 
};

// NEW: Fetch ALL raw receivables for a client (for export)
const fetchAllClientReceivables = async (clientId: number): Promise<{ receivables: Receivable[] }> => {
    const { data } = await apiClient.get<ApiResponse<{ receivables: Receivable[] }>>(`/receivables/client/${clientId}/all`);
    if (!data.success) {
        throw new Error(data.message || 'Failed to fetch all client receivables.');
    }
    return data.data;
};

// Fetch Clients Receivables Summary
const fetchClientsReceivablesSummary = async () => {
  const { data } = await apiClient.get<ApiResponse<{ clients: any[] }>>('/receivables/clients-summary');
  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch clients receivables summary.');
  }
  return data.data;
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
    queryKey: ['receivables'],
    queryFn: fetchReceivables,
  });
};

export const useCreateManualReceivable = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createManualReceivable,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['receivables'] });
            queryClient.invalidateQueries({ queryKey: ['clients'] }); // Invalidate clients too for summary data
        },
    });
};

// This hook now correctly returns data of type `ClientStatementPaginatedData | undefined`
export const useGetClientReceivables = (clientId: number, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['receivables', 'client', clientId],
    queryFn: () => fetchClientReceivables(clientId),
    enabled: !!clientId && enabled,
  });
};

// NEW: Hook to get all raw receivables for a client
export const useGetAllClientReceivables = (clientId: number, enabled: boolean = true) => {
    return useQuery({
        queryKey: ['receivables', 'client', clientId, 'all'],
        queryFn: () => fetchAllClientReceivables(clientId),
        enabled: !!clientId && enabled,
    });
};

export const useGetClientsReceivablesSummary = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['receivables', 'clients-summary'],
    queryFn: fetchClientsReceivablesSummary,
    enabled,
  });
};

export const useGetPayableReceivables = (clientId?: number | null) => {
  return useQuery({
    queryKey: ['receivables', 'payable', clientId],
    queryFn: () => fetchPayableReceivables(clientId),
    enabled: clientId !== undefined,
  });
}

export const useGetFilteredReceivables = (filter: 'paid' | 'overdue', enabled: boolean = true) => {
  return useQuery({
    queryKey: ['receivables', 'filtered', filter],
    queryFn: () => fetchFilteredReceivables(filter),
    enabled,
  });
}