import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/apiClient';
import type { ApiResponse, Tag } from '../api/types';

interface TagPayload {
    name: string;
    color: string;
}

// API Functions
const fetchTags = async (): Promise<Tag[]> => {
    const { data } = await apiClient.get<ApiResponse<Tag[]>>('/tags');
    if (!data.success) throw new Error(data.message || 'Failed to fetch tags.');
    return data.data;
};

const createTag = async (payload: TagPayload): Promise<Tag> => {
    const { data } = await apiClient.post<ApiResponse<Tag>>('/tags', payload);
    if (!data.success) throw new Error(data.message || 'Failed to create tag.');
    return data.data;
};

const updateTag = async ({ id, payload }: { id: number; payload: TagPayload }): Promise<Tag> => {
    const { data } = await apiClient.put<ApiResponse<Tag>>(`/tags/${id}`, payload);
    if (!data.success) throw new Error(data.message || 'Failed to update tag.');
    return data.data;
};

const deleteTag = async (id: number): Promise<void> => {
    const { data } = await apiClient.delete<ApiResponse<null>>(`/tags/${id}`);
    if (!data.success) throw new Error(data.message || 'Failed to delete tag.');
};

// React Query Hooks
export const useGetTags = () => useQuery({
    queryKey: ['tags'],
    queryFn: fetchTags,
    staleTime: 5 * 60 * 1000, // Keep fresh for 5 minutes
    // refetchOnWindowFocus: false (inherited)
});

export const useCreateTag = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createTag,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tags'] }); // Invalidate all tags
            queryClient.invalidateQueries({ queryKey: ['tasks-by-tags'] }); // Invalidate tag columns view
        },
    });
};

export const useUpdateTag = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateTag,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tags'] }); // Invalidate all tags
            queryClient.invalidateQueries({ queryKey: ['tasks-by-tags'] }); // Invalidate tag columns view
        },
    });
};

export const useDeleteTag = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteTag,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tags'] }); // Invalidate all tags
            queryClient.invalidateQueries({ queryKey: ['tasks-by-tags'] }); // Invalidate tag columns view
        },
    });
};