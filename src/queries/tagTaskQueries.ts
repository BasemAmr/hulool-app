import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/apiClient';
import type { ApiResponse } from '../api/types';
import type { TagCollection } from '../types/tagTypes';

// Optimized function to get tags with their associated tasks using the new backend endpoint
const fetchTasksByTags = async (status: string = 'New'): Promise<TagCollection[]> => {
    // Use the optimized endpoint that does the heavy lifting on the backend
    const { data: response } = await apiClient.get<ApiResponse<TagCollection[]>>('/tags/with-tasks', {
        params: { 
            status: status
        },
    });

    if (!response.success) {
        throw new Error(response.message || 'Failed to fetch tag collections');
    }

    // The backend already returns the data in the correct format with sorting
    return response.data || [];
};

// React Query Hook with optimized caching and performance
export const useGetTasksByTags = (status: string = 'New') => {
    return useQuery({
        queryKey: ['tasks-by-tags', status],
        queryFn: () => fetchTasksByTags(status),
        staleTime: 5 * 60 * 1000, // Keep fresh for 5 minutes (longer since it's optimized)
        gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
        refetchOnWindowFocus: false, // Prevent unnecessary refetches
        refetchOnReconnect: false, // Prevent unnecessary refetches on reconnect
        retry: 2, // Only retry twice on failure
        retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    });
};