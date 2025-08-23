import { Link } from 'react-router-dom';
import { Tag as TagIcon, Plus } from 'lucide-react';
import TagTaskCard from './TagTaskCard';
import { useModalStore } from '../../stores/modalStore';
import type { TagColumnProps } from '../../types/tagTypes';

const TagColumn = ({ tagCollection, isLoading = false }: TagColumnProps) => {
    const { tag, tasks } = tagCollection;
    const openModal = useModalStore((state) => state.openModal);

    const handleSelectTasks = () => {
        openModal('taskSelection', { tagId: tag.id });
    };

    if (isLoading) {
        return (
            <div className="col-lg-3">
                <div className="card h-100 shadow-sm" style={{ borderRadius: '8px' }}>
                    <div className="card-header d-flex justify-content-center align-items-center py-3">
                        <div className="loading-spinner"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="col-lg-3">
            <div className="card h-100 shadow-sm" style={{ borderRadius: '8px' }}>
                <div 
                    className="card-header text-white py-2"
                    style={{ 
                        backgroundColor: tag.color,
                        borderTopLeftRadius: '8px',
                        borderTopRightRadius: '8px'
                    }}
                >
                    <div className="d-flex justify-content-between align-items-center mb-2">
                        <div className="d-flex align-items-center">
                            <TagIcon size={16} className="me-2" style={{ color: '#fff' }} />
                            <Link 
                                to={`/tasks?tag=${tag.id}`} 
                                className="text-white text-decoration-none"
                            >
                                <h6 className="mb-0 fw-medium" style={{ fontSize: '14px' }}>
                                    {tag.name}
                                </h6>
                            </Link>
                        </div>
                        <span 
                            className="badge rounded-pill px-2 py-1"
                            style={{ 
                                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                color: '#fff',
                                fontSize: '11px'
                            }}
                        >
                            {tasks.length}
                        </span>
                    </div>
                    <div className="d-flex justify-content-center">
                        <button
                            onClick={handleSelectTasks}
                            className="btn btn-sm text-white border-white"
                            style={{
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                fontSize: '11px',
                                padding: '4px 8px'
                            }}
                            title="اختيار مهام لربطها أو فك ربطها بهذه العلامة"
                        >
                            <Plus size={12} className="me-1" />
                            إدارة المهام
                        </button>
                    </div>
                </div>
                <div className="card-body p-0" style={{ minHeight: '200px', maxHeight: '600px', overflowY: 'auto' }}>
                    {tasks.length > 0 ? (
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
                            <p className="empty-description text-muted mb-0" style={{ fontSize: '12px' }}>
                                لا توجد مهام لهذه العلامة
                            </p>
                        </div>
                    )}
                </div>
                <div className="card-footer py-2">
                    <Link
                        to={`/tasks?tag=${tag.id}`}
                        className="btn btn-sm w-100 fw-medium"
                        style={{
                            backgroundColor: tag.color,
                            color: '#fff',
                            border: 'none',
                            fontSize: '11px'
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
