import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/apiClient';
import type { ApiResponse } from '../api/types';
import type { CreditAllocation } from '../api/types';

const deleteAllocation = async (id: number): Promise<null> => {
    const { data } = await apiClient.delete<ApiResponse<null>>(`/allocations/${id}`);
    return data.data;
};

export const useDeleteAllocation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteAllocation,
        onSuccess: (_) => {
            // Invalidate relevant queries
            queryClient.invalidateQueries({ queryKey: ['receivables'] });
            queryClient.invalidateQueries({ queryKey: ['clientCredits'] });
            queryClient.invalidateQueries({ queryKey: ['clients'] });
        },
    });
};

const updateAllocation = async ({
  allocationId,
  amount,
  description
}: {
  allocationId: number;
  amount: number;
  description: string;
}): Promise<CreditAllocation> => {
  const { data } = await apiClient.put<ApiResponse<CreditAllocation>>(`/allocations/${allocationId}`, {
    amount,
    description
  });
  return data.data;
};

export const useUpdateAllocation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateAllocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receivables'] });
      queryClient.invalidateQueries({ queryKey: ['clientCredits'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
};