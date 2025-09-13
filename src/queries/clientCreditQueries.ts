import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/apiClient';
import type { 
    ApiResponse, 
    ClientCredit, 
    RecordCreditPayload, 
    ApplyCreditPayload,

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

const applyCreditToReceivable = async (payload: ApplyCreditPayload) => {
    const { data } = await apiClient.post<ApiResponse<any>>(`/receivables/${payload.receivableId}/apply-credit`, { amount: payload.amount });
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
            
            // Employee-related invalidations
            queryClient.invalidateQueries({ queryKey: ['employee'] });
            queryClient.invalidateQueries({ queryKey: ['employees'] });
        },
    });
};

export const useApplyCreditToReceivable = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: applyCreditToReceivable,
        onSuccess: (_) => {
            queryClient.invalidateQueries({ queryKey: ['receivables'] });
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            queryClient.invalidateQueries({ queryKey: ['clientCredits'] });
            
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
            
            // Employee-related invalidations
            queryClient.invalidateQueries({ queryKey: ['employee'] });
            queryClient.invalidateQueries({ queryKey: ['employees'] });
        },
    });
};