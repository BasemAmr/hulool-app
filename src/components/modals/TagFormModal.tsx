import { useState, useEffect } from 'react';
// import { useTranslation } from 'react-i18next';
import { useModalStore } from '../../stores/modalStore';
import { useToast } from '../../hooks/useToast';
import Button from '../ui/Button';
import BaseModal from '../ui/BaseModal';
import type { Tag } from '../../api/types';
import { useCreateTag, useUpdateTag } from '../../queries/tagQueries';

const TagFormModal = () => {
    // const { t } = useTranslation();
    const isOpen = useModalStore((state) => state.isOpen);
    const modalType = useModalStore((state) => state.modalType);
    const props = useModalStore((state) => state.props);
    const closeModal = useModalStore((state) => state.closeModal);
    const { success, error } = useToast();
    
    const [formData, setFormData] = useState({
        name: '',
        color: '#d4af37'
    });
    
    const isActive = isOpen && modalType === 'tagForm';
    const tagToEdit = props?.tagToEdit as Tag | undefined;
    const isEditMode = !!tagToEdit;

    // Handle Escape key
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                closeModal();
            }
        };

        if (isActive) {
            document.addEventListener('keydown', handleEscape);
            return () => document.removeEventListener('keydown', handleEscape);
        }
    }, [isActive, closeModal]);

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
        <BaseModal
            isOpen={isActive}
            onClose={closeModal}
            title={isEditMode ? 'تعديل العلامة' : 'إضافة علامة جديدة'}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <label htmlFor="tagName" className="font-semibold text-black text-sm block">
                        اسم العلامة <span className="text-destructive">*</span>
                    </label>
                    <input
                        type="text"
                        id="tagName"
                        className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="أدخل اسم العلامة"
                        required
                        disabled={isLoading || (isEditMode && tagToEdit?.is_system)}
                    />
                    {isEditMode && tagToEdit?.is_system && (
                        <div className="text-xs text-yellow-600">
                            لا يمكن تعديل اسم العلامات النظامية.
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <label htmlFor="tagColor" className="font-semibold text-black text-sm block">
                        لون العلامة
                    </label>
                    <div className="flex items-center gap-3">
                        <input
                            type="color"
                            id="tagColor"
                            className="w-16 h-10 border border-border rounded-md cursor-pointer"
                            value={formData.color}
                            onChange={(e) => handleInputChange('color', e.target.value)}
                            disabled={isLoading}
                        />
                        <input
                            type="text"
                            className="flex-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                            value={formData.color}
                            onChange={(e) => handleInputChange('color', e.target.value)}
                            placeholder="#d4af37"
                            pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                            disabled={isLoading}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-black text-sm">معاينة:</span>
                        <span 
                            className="px-3 py-1 rounded-full text-white text-sm font-semibold"
                            style={{ 
                                backgroundColor: formData.color, 
                                textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
                            }}
                        >
                            {formData.name || 'اسم العلامة'}
                        </span>
                    </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-4 border-t border-border">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={closeModal}
                        disabled={isLoading}
                    >
                        إلغاء
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        isLoading={isLoading}
                        disabled={!formData.name.trim()}
                    >
                        {isEditMode ? 'تحديث' : 'حفظ'}
                    </Button>
                </div>
            </form>
        </BaseModal>
    );
};

export default TagFormModal;