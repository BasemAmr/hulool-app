import type { Task, Tag } from '../api/types';

export interface TagCollection {
    tag: Tag;
    tasks: Task[];
}

export interface TagColumnProps {
    tagCollection: TagCollection;
    isLoading?: boolean;
}

export interface TagTaskCardProps {
    task: Task;
    index?: number;
}

export interface TagColumnsViewProps {
    tagCollections: TagCollection[];
    isLoading?: boolean;
}
