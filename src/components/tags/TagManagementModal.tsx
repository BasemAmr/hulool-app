import { Plus, Edit, Trash2 } from 'lucide-react';
import { useModalStore } from '../../stores/modalStore';
import { useGetTags, useDeleteTag } from '../../queries/tagQueries';
import { useToast } from '../../hooks/useToast';
import Button from '../ui/Button';
import type { Tag } from '../../api/types';
import { formatDate } from '../../utils/dateUtils';

const TagManagementModal = () => {
    const isOpen = useModalStore((state) => state.isOpen);
    const modalType = useModalStore((state) => state.modalType);
    const closeModal = useModalStore((state) => state.closeModal);
    const openModal = useModalStore((state) => state.openModal);
    const { success, error } = useToast();

    const { data: tags = [], isLoading } = useGetTags();
    const deleteTagMutation = useDeleteTag();

    const isActive = isOpen && modalType === 'tagManagement';

    const handleAddTag = () => openModal('tagForm', {});
    const handleEditTag = (tag: Tag) => openModal('tagForm', { tagToEdit: tag });

    const handleDeleteTag = (tag: Tag) => {
        if (tag.is_system) {
            error('لا يمكن الحذف', 'لا يمكن حذف العلامات النظامية.');
            return;
        }
        openModal('confirmDelete', {
            title: 'تأكيد الحذف',
            message: `هل أنت متأكد من حذف العلامة "${tag.name}"؟`,
            onConfirm: () => {
                deleteTagMutation.mutate(tag.id, {
                    onSuccess: () => success('تم الحذف', `تم حذف العلامة بنجاح.`),
                    onError: (err: any) => error('خطأ', err.message || 'فشل حذف العلامة.'),
                });
            },
        });
    };

    if (!isActive) return null;

    return (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">إدارة العلامات</h5>
                        <button 
                            type="button" 
                            className="btn-close" 
                            onClick={closeModal}
                        ></button>
                    </div>
                    
                    <div className="modal-body">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h6 className="mb-0">قائمة العلامات</h6>
                            <Button onClick={handleAddTag} size="sm">
                                <Plus size={16} className="me-2" />
                                إضافة علامة
                            </Button>
                        </div>

                        {isLoading ? (
                            <div className="text-center py-4">
                                <div className="loading-spinner"></div>
                            </div>
                        ) : tags.length === 0 ? (
                            <div className="text-center py-4">
                                <div className="empty-icon mb-3">
                                    <i className="fas fa-tags fa-3x text-gray-400"></i>
                                </div>
                                <p className="empty-description text-muted mb-0">
                                    لا توجد علامات مُضافة بعد
                                </p>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-hover mb-0">
                                    <thead>
                                        <tr>
                                            <th>اسم العلامة</th>
                                            <th>اللون</th>
                                            <th>النوع</th>
                                            <th>تاريخ الإنشاء</th>
                                            <th className="text-end">الإجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tags.map((tag) => (
                                            <tr key={tag.id}>
                                                <td>
                                                    <span 
                                                        className="badge" 
                                                        style={{ 
                                                            backgroundColor: tag.color, 
                                                            color: '#fff',
                                                            textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
                                                        }}
                                                    >
                                                        {tag.name}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="d-flex align-items-center">
                                                        <div
                                                            className="color-preview me-2"
                                                            style={{
                                                                width: '20px',
                                                                height: '20px',
                                                                backgroundColor: tag.color,
                                                                borderRadius: '4px',
                                                                border: '1px solid #dee2e6'
                                                            }}
                                                        ></div>
                                                        <span className="font-monospace">{tag.color}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`badge ${tag.is_system ? 'bg-warning' : 'bg-info'}`}>
                                                        {tag.is_system ? 'نظامية' : 'مخصصة'}
                                                    </span>
                                                </td>
                                                <td>{formatDate(tag.created_at)}</td>
                                                <td className="text-end">
                                                    <Button
                                                        size="sm"
                                                        variant="outline-primary"
                                                        onClick={() => handleEditTag(tag)}
                                                        className="me-2"
                                                        title="تعديل"
                                                    >
                                                        <Edit size={16} />
                                                    </Button>
                                                    {!tag.is_system && (
                                                        <Button
                                                            size="sm"
                                                            variant="danger"
                                                            onClick={() => handleDeleteTag(tag)}
                                                            title="حذف"
                                                            isLoading={deleteTagMutation.isPending && deleteTagMutation.variables === tag.id}
                                                        >
                                                            <Trash2 size={16} />
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                    
                    <div className="modal-footer">
                        <Button variant="secondary" onClick={closeModal}>
                            إغلاق
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TagManagementModal;
