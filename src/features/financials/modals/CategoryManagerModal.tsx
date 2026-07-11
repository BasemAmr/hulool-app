import React, { useState, useMemo } from 'react';
import { Plus, Save, X, Trash2, Edit3, RotateCcw } from 'lucide-react';
import BaseModal from '@/shared/ui/layout/BaseModal';
import Button from '@/shared/ui/primitives/Button';
import { useModalStore } from '@/shared/stores/modalStore';
import { useToast } from '@/shared/hooks/useToast';
import {
  useGetCategoryMetadata,
  useCreateTreasuryCategory,
  useUpdateTreasuryCategory,
  useDeleteTreasuryCategory,
} from '../api/treasuryQueries';
import type { TreasuryCategoryMetadata } from '@/api/types';

const CategoryManagerModal = () => {
  const { success, error } = useToast();
  const { isOpen, modalType, props, closeModal } = useModalStore();
  const sectionId = props?.sectionId as string | undefined;
  const { data: allCategories = [], isLoading } = useGetCategoryMetadata();
  const categories = useMemo(() => {
    if (!sectionId) return allCategories;
    return allCategories.filter(cat => cat.coa_section === sectionId);
  }, [allCategories, sectionId]);
  const createMutation = useCreateTreasuryCategory();
  const updateMutation = useUpdateTreasuryCategory();
  const deleteMutation = useDeleteTreasuryCategory();

  // New category form
  const [newLabel, setNewLabel] = useState('');

  // Editing state
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editSortOrder, setEditSortOrder] = useState<number>(0);
  const [editIsActive, setEditIsActive] = useState(true);

  // Confirmation state
  const [confirmDeleteSlug, setConfirmDeleteSlug] = useState<string | null>(null);

  // Show deactivated toggle
  const [showDeactivated, setShowDeactivated] = useState(false);

  const isModalOpen = isOpen && modalType === 'categoryManager';

  const resetNewForm = () => {
    setNewLabel('');
  };

  const startEditing = (cat: TreasuryCategoryMetadata) => {
    setEditingSlug(cat.slug);
    setEditLabel(cat.label);
    setEditSortOrder(cat.sort_order);
    setEditIsActive(cat.is_active);
  };

  const cancelEditing = () => {
    setEditingSlug(null);
    setEditLabel('');
    setEditSortOrder(0);
    setEditIsActive(true);
  };

  const generateSlug = (): string => {
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).substring(2, 6);
    return `cat_${ts}${rand}`;
  };

  const handleCreate = async () => {
    if (!newLabel.trim()) {
      error('الاسم مطلوب');
      return;
    }

    try {
      await createMutation.mutateAsync({
        slug: generateSlug(),
        label: newLabel.trim(),
        sort_order: 0,
        coa_section: sectionId,
      });
      success('تم إضافة التصنيف بنجاح');
      resetNewForm();
    } catch (err: any) {
      error(err?.response?.data?.message || err.message || 'فشل إضافة التصنيف');
    }
  };

  const handleUpdate = async (slug: string) => {
    if (!editLabel.trim()) {
      error('الاسم مطلوب');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        slug,
        data: {
          label: editLabel.trim(),
          sort_order: editSortOrder,
          is_active: editIsActive,
        },
      });
      success('تم تحديث التصنيف بنجاح');
      cancelEditing();
    } catch (err: any) {
      error(err?.response?.data?.message || err.message || 'فشل تحديث التصنيف');
    }
  };

  const handleDelete = async (slug: string) => {
    try {
      await deleteMutation.mutateAsync(slug);
      success('تم حذف التصنيف بنجاح');
      setConfirmDeleteSlug(null);
    } catch (err: any) {
      error(err?.response?.data?.message || err.message || 'فشل حذف التصنيف');
    }
  };

  const handleClose = () => {
    resetNewForm();
    cancelEditing();
    setConfirmDeleteSlug(null);
    closeModal();
  };

  return (
    <BaseModal
      isOpen={isModalOpen}
      onClose={handleClose}
      title="إدارة تصنيفات الخزينة"
    >
      <div className="space-y-4" dir="rtl">
        {isLoading ? (
          <div className="text-center py-8 text-text-secondary">جاري التحميل...</div>
        ) : (
          <>
            {/* Categories Table */}
            {categories.length > 0 ? (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <label className="inline-flex items-center gap-2 text-xs text-text-secondary cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showDeactivated}
                      onChange={(e) => setShowDeactivated(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
                    />
                    عرض التصنيفات المعطلة
                  </label>
                </div>
                <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-bg-secondary">
                      <th className="px-3 py-2 text-right font-semibold text-text-primary">الاسم</th>
                      <th className="px-3 py-2 text-right font-semibold text-text-primary">الرمز</th>
                      <th className="px-3 py-2 text-center font-semibold text-text-primary">الترتيب</th>
                      <th className="px-3 py-2 text-center font-semibold text-text-primary">نشط</th>
                      <th className="px-3 py-2 text-center font-semibold text-text-primary">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...categories]
                      .filter((cat) => showDeactivated || cat.is_active)
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .map((cat) => (
                      <tr key={cat.slug} className="border-t border-border hover:bg-bg-secondary/50">
                        {editingSlug === cat.slug ? (
                          // Edit mode
                          <>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                className="w-full px-2 py-1 border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                value={editLabel}
                                onChange={(e) => setEditLabel(e.target.value)}
                              />
                            </td>
                            <td className="px-3 py-2 text-text-secondary font-mono text-xs">
                              {cat.slug}
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                className="w-16 px-2 py-1 border border-border rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary"
                                value={editSortOrder}
                                onChange={(e) => setEditSortOrder(parseInt(e.target.value, 10) || 0)}
                              />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={editIsActive}
                                onChange={(e) => setEditIsActive(e.target.checked)}
                                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="outline-secondary"
                                  size="sm"
                                  onClick={() => handleUpdate(cat.slug)}
                                  isLoading={updateMutation.isPending}
                                  className="text-status-success-text"
                                >
                                  <Save size={14} />
                                </Button>
                                <Button
                                  variant="outline-secondary"
                                  size="sm"
                                  onClick={cancelEditing}
                                >
                                  <X size={14} />
                                </Button>
                              </div>
                            </td>
                          </>
                        ) : (
                          // View mode
                          <>
                            <td className="px-3 py-2 text-text-primary font-medium">
                              {cat.label}
                            </td>
                            <td className="px-3 py-2 text-text-secondary font-mono text-xs">
                              {cat.slug}
                            </td>
                            <td className="px-3 py-2 text-center text-text-secondary">
                              {cat.sort_order}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {cat.is_active ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-status-success-bg text-status-success-text">
                                  نشط
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-status-danger-bg text-status-danger-text">
                                  غير نشط
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center justify-center gap-1">
                                {confirmDeleteSlug === cat.slug ? (
                                  <>
                                    <span className="text-xs text-destructive ml-1">حذف؟</span>
                                    <Button
                                      variant="outline-danger"
                                      size="sm"
                                      onClick={() => handleDelete(cat.slug)}
                                      isLoading={deleteMutation.isPending}
                                    >
                                      <Trash2 size={14} />
                                    </Button>
                                    <Button
                                      variant="outline-secondary"
                                      size="sm"
                                      onClick={() => setConfirmDeleteSlug(null)}
                                    >
                                      <X size={14} />
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button
                                      variant="outline-secondary"
                                      size="sm"
                                      onClick={() => startEditing(cat)}
                                    >
                                      <Edit3 size={14} />
                                    </Button>
                                    {!cat.is_active && (
                                      <Button
                                        variant="outline-secondary"
                                        size="sm"
                                        onClick={() => startEditing({ ...cat, is_active: true })}
                                        title="تنشيط التصنيف"
                                      >
                                        <RotateCcw size={14} />
                                      </Button>
                                    )}
                                    <Button
                                      variant="outline-danger"
                                      size="sm"
                                      onClick={() => setConfirmDeleteSlug(cat.slug)}
                                    >
                                      <Trash2 size={14} />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            ) : (
              <div className="text-center py-6 text-text-secondary border border-dashed border-border rounded-lg">
                لا توجد تصنيفات حاليًا
              </div>
            )}

            {/* Add New Category */}
            <div className="border border-border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-text-primary text-sm">إضافة تصنيف جديد</h3>
              <div className="space-y-1">
                <label className="text-xs text-text-secondary">الاسم (عربي)</label>
                <input
                  type="text"
                  className="w-full px-2 py-1.5 border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="اسم التصنيف"
                />
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCreate}
                isLoading={createMutation.isPending}
                disabled={!newLabel.trim()}
              >
                <Plus size={14} className="ml-1" />
                إضافة التصنيف
              </Button>
            </div>

            {/* Close Button */}
            <div className="flex justify-end pt-2 border-t border-border">
              <Button
                variant="outline-secondary"
                onClick={handleClose}
              >
                <X size={16} className="ml-1" />
                إغلاق
              </Button>
            </div>
          </>
        )}
      </div>
    </BaseModal>
  );
};

export default CategoryManagerModal;
