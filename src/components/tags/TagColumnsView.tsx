import TagColumn from './TagColumn';
import type { TagColumnsViewProps } from '../../types/tagTypes';

const TagColumnsView = ({ tagCollections, isLoading = false }: TagColumnsViewProps) => {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
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
                <h5 className="text-black mb-2 font-semibold">لا توجد علامات مُضافة</h5>
                <p className="text-black">قم بإضافة علامات لتنظيم المهام وعرضها في أعمدة منفصلة</p>
            </div>
        );
    }

    return (
        <div className="tag-columns-view">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
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
