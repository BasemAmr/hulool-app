import { Link } from 'react-router-dom';
import { Tag as TagIcon, Plus } from 'lucide-react';
import TagTaskCard from './TagTaskCard';
import { useModalStore } from '../../stores/modalStore';
import type { TagColumnProps } from '../../types/tagTypes';

const TagColumn = ({ tagCollection, isLoading = false }: TagColumnProps) => {
    const { tag, tasks } = tagCollection || {};
    const openModal = useModalStore((state) => state.openModal);

    const handleSelectTasks = () => {
        if (tag?.id) {
            openModal('taskSelection', { tagId: tag.id });
        }
    };

    if (isLoading) {
        return (
            <div>
                <div className="rounded-lg border border-border bg-card shadow-sm h-full">
                    <div className="flex justify-center items-center py-3">
                        <div className="loading-spinner"></div>
                    </div>
                </div>
            </div>
        );
    }

    // Add safety check for tag object
    if (!tag || !tag.name) {
        return (
            <div>
                <div className="rounded-lg border border-border bg-card shadow-sm h-full">
                    <div className="bg-gray-500 text-white py-2 rounded-t-lg">
                        <div className="flex justify-center items-center">
                            <span className="text-black">علامة غير صالحة</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-center p-4">
                        <p className="text-black mb-0">خطأ في تحميل بيانات العلامة</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="rounded-lg border border-border bg-card shadow-sm h-full">
                <div 
                    className="text-white py-2 rounded-t-lg"
                    style={{ backgroundColor: tag.color }}
                >
                    <div className="flex justify-between items-center mb-2 px-3">
                        <div className="flex items-center">
                            <TagIcon size={16} className="mr-2" style={{ color: '#fff' }} />
                            <Link 
                                to={`/tasks?tag=${tag.id}`} 
                                className="text-white no-underline"
                            >
                                <h6 className="mb-0 font-medium" style={{ fontSize: '14px' }}>
                                    {tag.name}
                                </h6>
                            </Link>
                        </div>
                        <span 
                            className="px-2 py-1 rounded-full text-xs font-semibold"
                            style={{ 
                                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                color: '#fff'
                            }}
                        >
                            {tasks?.length || 0}
                        </span>
                    </div>
                    <div className="flex justify-center">
                        <button
                            onClick={handleSelectTasks}
                            className="text-white border border-white text-xs px-2 py-1 rounded hover:bg-white/20 transition-colors"
                            style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                            title="اختيار مهام لربطها أو فك ربطها بهذه العلامة"
                        >
                            <Plus size={12} className="inline mr-1" />
                            إدارة المهام
                        </button>
                    </div>
                </div>
                <div className="p-0" style={{ minHeight: '200px', maxHeight: '600px', overflowY: 'auto' }}>
                    {tasks && tasks.length > 0 ? (
                        <div className="p-2">
                            {tasks.map((task, index) => (
                                <TagTaskCard 
                                    key={task.id} 
                                    task={task} 
                                    index={index} 
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state py-4 text-center">
                            <div className="empty-icon mb-2">
                                <TagIcon size={32} style={{ color: '#9ca3af' }} />
                            </div>
                            <p className="empty-description text-black mb-0" style={{ fontSize: '12px' }}>
                                لا توجد مهام لهذه العلامة
                            </p>
                        </div>
                    )}
                </div>
                <div className="py-2 px-2 border-t border-border">
                    <Link
                        to={`/tasks?tag=${tag.id}`}
                        className="block w-full text-center py-2 rounded font-medium text-xs"
                        style={{
                            backgroundColor: tag.color,
                            color: '#fff'
                        }}
                    >
                        عرض جميع المهام
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default TagColumn;
