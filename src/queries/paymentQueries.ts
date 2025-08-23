import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/apiClient';
import type { ApiResponse, Payment, PaymentPayload, PaymentMethod } from '../api/types';

// --- API Functions ---
const fetchPayment = async (id: number): Promise<Payment> => {
  const { data } = await apiClient.get<ApiResponse<Payment>>(`/payments/${id}`);
  if (!data.success) throw new Error(data.message || 'Failed to fetch payment.');
  return data.data;
};
const fetchPaymentMethods = async (): Promise<PaymentMethod[]> => {
  const { data } = await apiClient.get<ApiResponse<PaymentMethod[]>>('/payments/methods', {
    params: { language: 'ar' },
  });
  if (!data.success) throw new Error(data.message || 'Failed to fetch payment methods.');
  return data.data;
};

const createPayment = async (payload: PaymentPayload): Promise<Payment> => {
  const { data } = await apiClient.post<ApiResponse<Payment>>('/payments', payload);
  if (!data.success) throw new Error(data.message || 'Failed to create payment.');
  return data.data;
};

const updatePayment = async ({ id, ...payload }: { id: number } & Partial<PaymentPayload>): Promise<Payment> => {
  const { data } = await apiClient.put<ApiResponse<Payment>>(`/payments/${id}`, payload);
  if (!data.success) throw new Error(data.message || 'Failed to update payment.');
  return data.data;
};

const deletePayment = async (id: number): Promise<void> => {
  const { data } = await apiClient.delete<ApiResponse<null>>(`/payments/${id}`);
  if (!data.success) throw new Error(data.message || 'Failed to delete payment.');
};

// --- CORRECTED FUNCTION ---
// This function now correctly expects and returns a direct array of Payment objects.
const fetchReceivablePayments = async (receivableId: number): Promise<Payment[]> => {
  const { data } = await apiClient.get<ApiResponse<Payment[]>>(`/payments/receivable/${receivableId}`);
  if (!data.success) throw new Error(data.message || 'Failed to fetch payments for receivable.');
  return data.data; // The API returns the array directly in the `data` property.
};
// --- END CORRECTION ---

// --- React Query Hooks ---
export const useGetPayment = (id: number) => {
  return useQuery({
    queryKey: ['payment', id],
    queryFn: () => fetchPayment(id),
    enabled: !!id,
  });
};
export const useGetPaymentMethods = () => {
  return useQuery({
    queryKey: ['paymentMethods'],
    queryFn: fetchPaymentMethods,
    staleTime: Infinity, // Payment methods are static, no need to refetch
    refetchOnWindowFocus: false, // Definitely don't refetch on focus for static data
    refetchOnMount: false, // Don't refetch on mount either
  });
};

export const useCreatePayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPayment,
    onSuccess: (newPayment) => {
      // Invalidate broader data sets that might include payment summaries or lists
      queryClient.invalidateQueries({ queryKey: ['receivables'] }); // Affects receivables lists and summaries
      queryClient.invalidateQueries({ queryKey: ['clients'] }); // Affects client totals (total_outstanding)
      queryClient.invalidateQueries({ queryKey: ['tasks'] }); // If payment relates to a task, task status might implicitly rely on it
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }); // Dashboard stats (total paid amount)

      // Invalidate the specific receivable's payments for its history modal
      queryClient.invalidateQueries({ queryKey: ['payments', newPayment.receivable_id] });
      queryClient.invalidateQueries({ queryKey: ['receivables', 'client', newPayment.client_id] }); // Invalidate client statement
    },
  });
};

export const useUpdatePayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePayment,
    onSuccess: (updatedPayment) => {
      // Invalidate broader data sets that might include payment summaries or lists
      queryClient.invalidateQueries({ queryKey: ['receivables'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      // Invalidate the specific receivable's payments
      queryClient.invalidateQueries({ queryKey: ['payments', updatedPayment.receivable_id] });
      queryClient.invalidateQueries({ queryKey: ['receivables', 'client', updatedPayment.client_id] });
    },
  });
};

export const useDeletePayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePayment,
    onSuccess: (_) => {
      // Invalidate broader data sets
      queryClient.invalidateQueries({ queryKey: ['receivables'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      // We need to get the receivable_id from somewhere - it won't be available here
      // So we'll invalidate all payment-related queries
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['receivables', 'client'] });
    },
  });
};

export const useGetReceivablePayments = (receivableId: number, initialData?: Payment[]) => {
    return useQuery({
        queryKey: ['payments', receivableId],
        queryFn: () => fetchReceivablePayments(receivableId),
        enabled: !!receivableId,
        staleTime: 0, // Always refetch when this hook is active (e.g., modal opens)
        // refetchOnWindowFocus: false (inherited, but staleTime 0 makes it refetch on mount anyway)
        initialData: initialData, // Use initialData for immediate display
    });
};