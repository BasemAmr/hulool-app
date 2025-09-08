import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/apiClient';
import type { ApiResponse, Region, RegionPayload } from '../api/types';

// --- Query Functions ---
const fetchRegions = async (): Promise<Region[]> => {
  const { data } = await apiClient.get<ApiResponse<Region[]>>('/regions');
  return data.data;
};

const fetchRegionsWithStats = async (): Promise<Region[]> => {
  const { data } = await apiClient.get<ApiResponse<Region[]>>('/regions/stats');
  return data.data;
};

const createRegion = async (regionData: RegionPayload): Promise<Region> => {
  const { data } = await apiClient.post<ApiResponse<Region>>('/regions', regionData);
  return data.data;
};

const updateRegion = async ({ id, regionData }: { id: number; regionData: RegionPayload }): Promise<Region> => {
  const { data } = await apiClient.put<ApiResponse<Region>>(`/regions/${id}`, regionData);
  return data.data;
};

const deleteRegion = async (id: number): Promise<void> => {
  await apiClient.delete<ApiResponse<null>>(`/regions/${id}`);
};

const fetchRegionById = async (id: number): Promise<Region> => {
  const { data } = await apiClient.get<ApiResponse<Region>>(`/regions/${id}`);
  return data.data;
};

// --- React Query Hooks ---
export const useGetRegions = () => {
  return useQuery({
    queryKey: ['regions'],
    queryFn: fetchRegions,
    staleTime: 5 * 60 * 1000, // Keep fresh for 5 minutes
  });
};

export const useGetRegionsWithStats = () => {
  return useQuery({
    queryKey: ['regions', 'stats'],
    queryFn: fetchRegionsWithStats,
    staleTime: 2 * 60 * 1000, // Keep fresh for 2 minutes
  });
};

export const useGetRegion = (regionId: number) => {
  return useQuery({
    queryKey: ['region', regionId],
    queryFn: () => fetchRegionById(regionId),
    enabled: !!regionId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateRegion = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createRegion,
    onMutate: async (newRegion) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['regions'] });

      // Snapshot the previous regions
      const previousRegions = queryClient.getQueryData<Region[]>(['regions']);

      // Optimistically update the cache
      if (previousRegions) {
        const optimisticRegion: Region = {
          id: Date.now(), // Temporary ID
          name: newRegion.name,
          created_at: new Date().toISOString(),
          client_count: 0
        };

        queryClient.setQueryData<Region[]>(['regions'], 
          [...previousRegions, optimisticRegion]
        );
      }

      return { previousRegions };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousRegions) {
        queryClient.setQueryData(['regions'], context.previousRegions);
      }
    },
    onSuccess: (_) => {
      // Invalidate and refetch to get the real data from server
      queryClient.invalidateQueries({ queryKey: ['regions'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] }); // Client lists might need region names
    }
  });
};

export const useUpdateRegion = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateRegion,
    onSuccess: (updatedRegion) => {
      queryClient.invalidateQueries({ queryKey: ['regions'] });
      queryClient.invalidateQueries({ queryKey: ['region', updatedRegion.id] });
      queryClient.invalidateQueries({ queryKey: ['clients'] }); // Client lists might need updated region names
    },
  });
};

export const useDeleteRegion = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteRegion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regions'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] }); // Client lists might be affected
    },
  });
};
