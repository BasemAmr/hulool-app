import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/apiClient';
import type { 
    ApiResponse, 
    ClientCredit, 
    RecordCreditPayload, 
    ApplyCreditPayload,
    ApplyCreditToInvoicePayload,
    ApplyCreditResponse,
    AllocationAdjustment,
    AllocationResolution
} from '../api/types';

const fetchClientCredits = async (clientId: number): Promise<{ balance: number; credits: ClientCredit[] }> => {
    const { data } = await apiClient.get<ApiResponse<{ balance: number; credits: ClientCredit[] }>>(`/clients/${clientId}/credits`);
    return data.data;
};

const recordClientCredit = async (payload: RecordCreditPayload): Promise<ClientCredit> => {
    const { client_id, ...rest } = payload;
    const { data } = await apiClient.post<ApiResponse<ClientCredit>>(`/clients/${client_id}/credits`, rest);
    return data.data;
};

const updateClientCredit = async ({ id, amount }: { id: number; amount: number }): Promise<ClientCredit> => {
    const { data } = await apiClient.put<ApiResponse<ClientCredit>>(`/credits/${id}`, { amount });
    return data.data;
};

const deleteClientCredit = async (id: number): Promise<null> => {
    const { data } = await apiClient.delete<ApiResponse<null>>(`/credits/${id}`);
    return data.data;
};

const resolveCreditReduction = async ({ 
    id, 
    new_amount, 
    allocation_adjustments 
}: { 
    id: number; 
    new_amount: number; 
    allocation_adjustments: AllocationAdjustment[];
}): Promise<ClientCredit> => {
    const { data } = await apiClient.post<ApiResponse<ClientCredit>>(`/credits/${id}/resolve-reduction`, {
        new_amount,
        allocation_adjustments
    });
    return data.data;
};

const resolveCreditDeletion = async ({ 
    id, 
    allocation_resolutions 
}: { 
    id: number; 
    allocation_resolutions: AllocationResolution[];
}): Promise<null> => {
    const { data } = await apiClient.post<ApiResponse<null>>(`/credits/${id}/resolve-deletion`, {
        allocation_resolutions
    });
    return data.data;
};

/**
 * @deprecated Use applyCreditToInvoice instead. This targets the old receivables endpoint.
 */
const applyCreditToReceivable = async (payload: ApplyCreditPayload) => {
    const { data } = await apiClient.post<ApiResponse<any>>(`/receivables/${payload.receivableId}/apply-credit`, { amount: payload.amount });
    return data.data;
};

/**
 * Apply credit to an invoice (new Invoice/Ledger system)
 */
const applyCreditToInvoice = async ({ invoiceId, payload }: { invoiceId: number; payload: ApplyCreditToInvoicePayload }): Promise<ApplyCreditResponse> => {
    const { data } = await apiClient.post<ApiResponse<ApplyCreditResponse>>(
        `/invoices/${invoiceId}/apply-credit`,
        payload
    );
    if (!data.success) {
        throw new Error(data.message || 'Failed to apply credit to invoice');
    }
    return data.data;
};

const replacePaymentWithCredit = async (paymentId: number): Promise<any> => {
    const { data } = await apiClient.post<ApiResponse<any>>(`/payments/${paymentId}/replace-with-credit`);
    return data.data;
};

export const useGetClientCredits = (clientId: number) => useQuery({
    queryKey: ['clientCredits', clientId],
    queryFn: () => fetchClientCredits(clientId),
    enabled: !!clientId,
});

export const useRecordClientCredit = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: recordClientCredit,
        onSuccess: (newCredit) => {
            queryClient.invalidateQueries({ queryKey: ['clientCredits', newCredit.client_id] });
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            
            // Invalidate account/ledger data (new system)
            queryClient.invalidateQueries({ queryKey: ['account', 'client', newCredit.client_id] });
            queryClient.invalidateQueries({ queryKey: ['account', 'clients'] });
            
            // Employee-related invalidations
            queryClient.invalidateQueries({ queryKey: ['employee'] });
            queryClient.invalidateQueries({ queryKey: ['employees'] });
        },
    });
};

export const useUpdateClientCredit = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateClientCredit,
        onSuccess: (updatedCredit) => {
            queryClient.invalidateQueries({ queryKey: ['clientCredits', updatedCredit.client_id] });
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            
            // Invalidate account/ledger data (new system)
            queryClient.invalidateQueries({ queryKey: ['account', 'client', updatedCredit.client_id] });
            queryClient.invalidateQueries({ queryKey: ['account', 'clients'] });
            
            // Employee-related invalidations
            queryClient.invalidateQueries({ queryKey: ['employee'] });
            queryClient.invalidateQueries({ queryKey: ['employees'] });
        },
    });
};

export const useDeleteClientCredit = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteClientCredit,
        onSuccess: (_) => {
            // Since we don't have client_id in variables, we'll invalidate all client credits
            queryClient.invalidateQueries({ queryKey: ['clientCredits'] });
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            
            // Invalidate account/ledger data (new system)
            queryClient.invalidateQueries({ queryKey: ['account'] });
            
            // Employee-related invalidations
            queryClient.invalidateQueries({ queryKey: ['employee'] });
            queryClient.invalidateQueries({ queryKey: ['employees'] });
        },
    });
};

export const useResolveCreditReduction = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: resolveCreditReduction,
        onSuccess: (updatedCredit) => {
            queryClient.invalidateQueries({ queryKey: ['clientCredits', updatedCredit.client_id] });
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            queryClient.invalidateQueries({ queryKey: ['receivables'] });
            
            // Invalidate invoice/account data (new system)
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            queryClient.invalidateQueries({ queryKey: ['account', 'client', updatedCredit.client_id] });
            queryClient.invalidateQueries({ queryKey: ['account', 'clients'] });
            
            // Employee-related invalidations
            queryClient.invalidateQueries({ queryKey: ['employee'] });
            queryClient.invalidateQueries({ queryKey: ['employees'] });
        },
    });
};

export const useResolveCreditDeletion = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: resolveCreditDeletion,
        onSuccess: (_) => {
            queryClient.invalidateQueries({ queryKey: ['clientCredits'] });
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            queryClient.invalidateQueries({ queryKey: ['receivables'] });
            
            // Invalidate invoice/account data (new system)
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            queryClient.invalidateQueries({ queryKey: ['account'] });
            
            // Employee-related invalidations
            queryClient.invalidateQueries({ queryKey: ['employee'] });
            queryClient.invalidateQueries({ queryKey: ['employees'] });
        },
    });
};

/**
 * @deprecated Use useApplyCreditToInvoice instead. This targets the old receivables endpoint.
 */
export const useApplyCreditToReceivable = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: applyCreditToReceivable,
        onSuccess: (_) => {
            queryClient.invalidateQueries({ queryKey: ['receivables'] });
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            queryClient.invalidateQueries({ queryKey: ['clientCredits'] });
            
            // Also invalidate new system queries for compatibility
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            queryClient.invalidateQueries({ queryKey: ['account'] });
            
            // Employee-related invalidations
            queryClient.invalidateQueries({ queryKey: ['employee'] });
            queryClient.invalidateQueries({ queryKey: ['employees'] });
        },
    });
};

/**
 * Apply credit to an invoice (new Invoice/Ledger system)
 * Use this instead of useApplyCreditToReceivable
 */
export const useApplyCreditToInvoice = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: applyCreditToInvoice,
        onSuccess: (response) => {
            // Invalidate specific invoice
            queryClient.invalidateQueries({ queryKey: ['invoice', response.invoice_id] });
            
            // Invalidate invoice lists
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            
            // Invalidate credit data
            queryClient.invalidateQueries({ queryKey: ['clientCredits'] });
            
            // Invalidate account/ledger data
            queryClient.invalidateQueries({ queryKey: ['account'] });
            
            // Invalidate client data
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            
            // Also invalidate old receivables for backward compatibility
            queryClient.invalidateQueries({ queryKey: ['receivables'] });
            
            // Employee-related invalidations
            queryClient.invalidateQueries({ queryKey: ['employee'] });
            queryClient.invalidateQueries({ queryKey: ['employees'] });
        },
    });
};

export const useReplacePaymentWithCredit = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: replacePaymentWithCredit,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['receivables'] });
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            queryClient.invalidateQueries({ queryKey: ['clientCredits'] });
            queryClient.invalidateQueries({ queryKey: ['payments'] });
            
            // Invalidate invoice/account data (new system)
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            queryClient.invalidateQueries({ queryKey: ['account'] });
            
            // Employee-related invalidations
            queryClient.invalidateQueries({ queryKey: ['employee'] });
            queryClient.invalidateQueries({ queryKey: ['employees'] });
        },
    });
};