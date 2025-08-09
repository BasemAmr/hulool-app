import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/apiClient';
import type { ApiResponse, Task, Tag } from '../api/types';
import type { TagCollection } from '../types/tagTypes';

// Get all tasks and group them by their tags
const fetchTasksByTags = async (): Promise<TagCollection[]> => {
    // Fetch all tasks with status "New" (or could be configurable)
    const { data: tasksResponse } = await apiClient.get<ApiResponse<{tasks: Task[]}>>('/tasks', {
        params: { 
            status: 'New',
            per_page: 1000 // Get a larger set to group properly
        },
    });

    // Fetch all tags
    const { data: tagsResponse } = await apiClient.get<ApiResponse<Tag[]>>('/tags');

    if (!tasksResponse.success || !tagsResponse.success) {
        throw new Error('Failed to fetch data for tag collections');
    }

    const tasks = tasksResponse.data.tasks || [];
    const tags = tagsResponse.data || [];

    // Create a map to group tasks by tag
    const tagCollections: TagCollection[] = [];

    // Create collections for each tag
    tags.forEach(tag => {
        const tagTasks = tasks.filter(task => 
            task.tags?.some(taskTag => taskTag.id === tag.id)
        );

        tagCollections.push({
            tag,
            tasks: tagTasks
        });
    });

    // Sort collections by tag name (system tags first)
    tagCollections.sort((a, b) => {
        if (a.tag.is_system && !b.tag.is_system) return -1;
        if (!a.tag.is_system && b.tag.is_system) return 1;
        return a.tag.name.localeCompare(b.tag.name);
    });

    return tagCollections;
};

// React Query Hook
export const useGetTasksByTags = () => {
    return useQuery({
        queryKey: ['tasks-by-tags'],
        queryFn: fetchTasksByTags,
        staleTime: 2 * 60 * 1000, // 2 minutes
        refetchOnWindowFocus: false,
    });
};
