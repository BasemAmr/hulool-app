import { useState, useEffect } from 'react';
// import { useTranslation } from 'react-i18next';
import { useModalStore } from '../../stores/modalStore';
import { useToast } from '../../hooks/useToast';
import Button from '../ui/Button';
import type { Tag } from '../../api/types';
import { useCreateTag, useUpdateTag } from '../../queries/tagQueries';

const TagFormModal = () => {
    // const { t } = useTranslation();
    const { isOpen, modalType, props, closeModal } = useModalStore();
    const { success, error } = useToast();
    
    const [formData, setFormData] = useState({
        name: '',
        color: '#d4af37'
    });
    
    const isActive = isOpen && modalType === 'tagForm';
    const tagToEdit = props?.tagToEdit as Tag | undefined;
    const isEditMode = !!tagToEdit;

    const createTagMutation = useCreateTag();
    const updateTagMutation = useUpdateTag();

    // Consolidate loading state from both mutations
    const isLoading = createTagMutation.isPending || updateTagMutation.isPending;

    // Reset form when modal opens or the item to edit changes
    useEffect(() => {
        if (isActive) {
            if (isEditMode && tagToEdit) {
                setFormData({
                    name: tagToEdit.name,
                    color: tagToEdit.color
                });
            } else {
                setFormData({
                    name: '',
                    color: '#d4af37'
                });
            }
        }
    }, [isActive, isEditMode, tagToEdit]);

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.name.trim()) {
            error('خطأ', 'اسم العلامة مطلوب');
            return;
        }
        
        const payload = { name: formData.name.trim(), color: formData.color };

        if (isEditMode && tagToEdit) {
            updateTagMutation.mutate({ id: tagToEdit.id, payload }, {
                onSuccess: () => {
                    success('تم التحديث', 'تم تحديث العلامة بنجاح');
                    closeModal();
                },
                onError: (err: any) => error('خطأ في التحديث', err.message || 'فشل تحديث العلامة.'),
            });
        } else {
            createTagMutation.mutate(payload, {
                onSuccess: () => {
                    success('تم الحفظ', 'تم إنشاء العلامة بنجاح');
                    closeModal();
                },
                onError: (err: any) => error('خطأ في الإنشاء', err.message || 'فشل إنشاء العلامة.'),
            });
        }
    };

    if (!isActive) return null;

    return (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">
                            {isEditMode ? 'تعديل العلامة' : 'إضافة علامة جديدة'}
                        </h5>
                        <button 
                            type="button" 
                            className="btn-close" 
                            onClick={closeModal}
                            disabled={isLoading} // Disable close button while submitting
                        ></button>
                    </div>
                    
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            <div className="mb-3">
                                <label htmlFor="tagName" className="form-label">
                                    اسم العلامة <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="tagName"
                                    className="form-control"
                                    value={formData.name}
                                    onChange={(e) => handleInputChange('name', e.target.value)}
                                    placeholder="أدخل اسم العلامة"
                                    required
                                    disabled={isLoading || (isEditMode && tagToEdit?.is_system)}
                                />
                                {isEditMode && tagToEdit?.is_system && (
                                    <div className="form-text text-warning">
                                        لا يمكن تعديل اسم العلامات النظامية.
                                    </div>
                                )}
                            </div>

                            <div className="mb-3">
                                <label htmlFor="tagColor" className="form-label">
                                    لون العلامة
                                </label>
                                <div className="d-flex align-items-center gap-3">
                                    <input
                                        type="color"
                                        id="tagColor"
                                        className="form-control form-control-color"
                                        value={formData.color}
                                        onChange={(e) => handleInputChange('color', e.target.value)}
                                        disabled={isLoading}
                                        style={{ width: '60px', height: '38px' }}
                                    />
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={formData.color}
                                        onChange={(e) => handleInputChange('color', e.target.value)}
                                        placeholder="#d4af37"
                                        pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                                        disabled={isLoading}
                                        style={{ fontFamily: 'monospace' }}
                                    />
                                </div>
                            </div>

                            <div className="mb-3">
                                <div className="d-flex align-items-center gap-2">
                                    <span className="form-label mb-0">معاينة:</span>
                                    <span 
                                        className="badge"
                                        style={{ 
                                            backgroundColor: formData.color, 
                                            color: '#fff',
                                            fontSize: '0.9rem',
                                            padding: '0.5rem 1rem',
                                            textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
                                        }}
                                    >
                                        {formData.name || 'اسم العلامة'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="modal-footer">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={closeModal}
                                disabled={isLoading} // Disable cancel button during submission
                            >
                                إلغاء
                            </Button>
                            <Button
                                type="submit"
                                variant="primary"
                                isLoading={isLoading} // Use the consolidated loading state
                                disabled={!formData.name.trim()}
                            >
                                {isEditMode ? 'تحديث' : 'حفظ'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default TagFormModal;