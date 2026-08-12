import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';
import type { ApiResponse, VoucherData } from '@/api/types';

export const useGetTransactionVoucher = (txnId: number) => {
  return useQuery({
    queryKey: ['transactions', 'voucher', txnId],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<VoucherData>>(
        `/transactions/${txnId}/voucher`
      );
      return data.data;
    },
    enabled: txnId > 0,
  });
};
