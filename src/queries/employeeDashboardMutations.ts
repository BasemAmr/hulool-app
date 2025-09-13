import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/apiClient';
import type { ApiResponse } from '../api/types';

// Employee sort order mutation
interface UpdateEmployeeSortOrderRequest {
  client_ids: number[];
}

const updateEmployeeSortOrder = async (request: UpdateEmployeeSortOrderRequest): Promise<void> => {
  const { data } = await apiClient.post<ApiResponse<any>>('/clients/employee/sort-order', request);
  if (!data.success) throw new Error(data.message || 'Failed to update employee sort order.');
};

export const useUpdateEmployeeSortOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateEmployeeSortOrder,
    onSuccess: () => {
      // Invalidate the employee dashboard query to refetch with new order
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'employee', 'clientsWithActiveTasks'] });
    },
  });
};