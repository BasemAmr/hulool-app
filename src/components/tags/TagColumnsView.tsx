import TagColumn from './TagColumn';
import type { TagColumnsViewProps } from '../../types/tagTypes';

const TagColumnsView = ({ tagCollections, isLoading = false }: TagColumnsViewProps) => {
    if (isLoading) {
        return (
            <div className="row g-3">
                {[1, 2, 3, 4].map(i => (
                    <TagColumn 
                        key={i} 
                        tagCollection={{ tag: { id: i, name: '', color: '#ccc', is_system: false, created_at: '', updated_at: '' }, tasks: [] }} 
                        isLoading={true} 
                    />
                ))}
            </div>
        );
    }

    // Add safety check for tagCollections
    if (!tagCollections || tagCollections.length === 0) {
        return (
            <div className="text-center py-5">
                <div className="empty-icon mb-3">
                    <i className="fas fa-tags fa-4x text-gray-400"></i>
                </div>
                <h5 className="text-muted mb-2">لا توجد علامات مُضافة</h5>
                <p className="text-muted">قم بإضافة علامات لتنظيم المهام وعرضها في أعمدة منفصلة</p>
            </div>
        );
    }

    return (
        <div className="tag-columns-view">
            <div className="row g-3">
                {tagCollections.map(tagCollection => (
                    <TagColumn 
                        key={tagCollection?.tag?.id || Math.random()} 
                        tagCollection={tagCollection} 
                        isLoading={isLoading}
                    />
                ))}
            </div>
        </div>
    );
};

export default TagColumnsView;
