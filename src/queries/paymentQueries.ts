import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/apiClient';
import type { ApiResponse, Payment, PaymentPayload, PaymentMethod } from '../api/types';

// --- API Functions ---
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

// --- CORRECTED FUNCTION ---
// This function now correctly expects and returns a direct array of Payment objects.
const fetchReceivablePayments = async (receivableId: number): Promise<Payment[]> => {
  const { data } = await apiClient.get<ApiResponse<Payment[]>>(`/payments/receivable/${receivableId}`);
  if (!data.success) throw new Error(data.message || 'Failed to fetch payments for receivable.');
  return data.data; // The API returns the array directly in the `data` property.
};
// --- END CORRECTION ---

// --- React Query Hooks ---
export const useGetPaymentMethods = () => {
  return useQuery({
    queryKey: ['paymentMethods'],
    queryFn: fetchPaymentMethods,
    staleTime: Infinity,
  });
};

export const useCreatePayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPayment,
    onSuccess: (newPayment) => {
      queryClient.invalidateQueries({ queryKey: ['receivables'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      // Specifically invalidate the payments for the receivable that was just paid
      queryClient.invalidateQueries({ queryKey: ['payments', newPayment.receivable_id] });
    },
  });
};

// --- CORRECTED HOOK ---
// This hook now correctly returns data of type `Payment[] | undefined`
export const useGetReceivablePayments = (receivableId: number, initialData?: Payment[]) => {
    return useQuery({
        queryKey: ['payments', receivableId],
        queryFn: () => fetchReceivablePayments(receivableId),
        enabled: !!receivableId,
        // THIS IS THE OPTIMIZATION:
        // If we provide initialData, Tanstack Query will use it immediately
        // and the query status will be 'success' right away.
        // It will still refetch in the background on window focus by default
        // to ensure the data becomes fresh.
        initialData: initialData,
    });
};
// --- END CORRECTION --