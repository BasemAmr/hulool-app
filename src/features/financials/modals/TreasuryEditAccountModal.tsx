import React, { useState, useEffect, useMemo } from 'react';
import { Save, X, Settings, Shield } from 'lucide-react';
import BaseModal from '@/shared/ui/layout/BaseModal';
import Button from '@/shared/ui/primitives/Button';
import { Badge } from '@/shared/ui/shadcn/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/shadcn/tabs';
import { useModalStore } from '@/shared/stores/modalStore';
import { useToast } from '@/shared/hooks/useToast';
import { useUpdateTreasuryAccount, useGetCategoryMetadata } from '../api/treasuryQueries';
import { useCategoryLabels } from '@/features/financials/constants/categoryConfig';
import { coaSections } from '@/features/financials/constants/coaSections';
import PermissionsManager from '../components/PermissionsManager';
import type { TreasuryAccount } from '../api/treasuryQueries';

interface TreasuryEditAccountModalProps {
  account: TreasuryAccount;
}

interface EditFormData {
  name: string;
  sub_type: string;
  normal_balance: string;
}

const TreasuryEditAccountModal = () => {
  const { success, error } = useToast();
  const { isOpen, modalType, props, closeModal } = useModalStore();
  const updateMutation = useUpdateTreasuryAccount();
  const categoryLabels = useCategoryLabels();
  const { data: categories = [] } = useGetCategoryMetadata();

  const { account } = (props || {}) as TreasuryEditAccountModalProps;

  const [formData, setFormData] = useState<EditFormData>({
    name: '',
    sub_type: '',
    normal_balance: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof EditFormData, string>>>({});

  const isModalOpen = isOpen && modalType === 'treasuryEditAccount';

  const sectionInfo = useMemo(() => {
    if (!account?.coa_section) return null;
    return coaSections.find((s) => s.id === account.coa_section) || null;
  }, [account?.coa_section]);

  useEffect(() => {
    if (isModalOpen && account) {
      setFormData({
        name: account.name || '',
        sub_type: account.sub_type || (account.sub_type === '' ? '__none__' : ''),
        normal_balance: account.normal_balance || '',
      });
      setErrors({});
    }
  }, [isModalOpen, account]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof EditFormData, string>> = {};
    if (!formData.name.trim()) newErrors.name = 'اسم الحساب مطلوب';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !account) return;

    try {
      const resolvedSubType = formData.sub_type === '__none__' ? '' : formData.sub_type;
      await updateMutation.mutateAsync({
        id: account.id,
        data: {
          name: formData.name.trim(),
          sub_type: resolvedSubType,
          normal_balance: formData.normal_balance,
        },
      });
      success('تم تحديث الحساب بنجاح');
      closeModal();
    } catch (err: any) {
      error(err.message || 'فشل تحديث الحساب');
    }
  };

  const handleClose = () => {
    setFormData({ name: '', sub_type: '', normal_balance: '' });
    setErrors({});
    closeModal();
  };

  const isCashBox = account?.sub_type === 'cashbox';
  let primaryCustodianUserId: number | null = null;
  if (isCashBox && account?.metadata) {
    try {
      const metadata = typeof account.metadata === 'string' ? JSON.parse(account.metadata) : account.metadata;
      primaryCustodianUserId = metadata?.employee_id || null;
    } catch (e) {
      // ignore
    }
  }

  return (
    <BaseModal
      isOpen={isModalOpen}
      onClose={handleClose}
      title="تعديل الحساب المالي"
    >
      <Tabs defaultValue="details" dir="rtl">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="details" className="flex items-center gap-2">
            <Settings size={14} />
            تفاصيل الحساب
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Shield size={14} />
            الصلاحيات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
            {account?.account_number && (
              <div className="space-y-2">
                <label className="font-semibold text-text-primary text-sm block">
                  رقم الحساب
                </label>
                <Badge variant="outline" className="text-sm px-3 py-1 font-mono">
                  {account.account_number}
                </Badge>
              </div>
            )}

            {sectionInfo && (
              <div className="space-y-2">
                <label className="font-semibold text-text-primary text-sm block">
                  القسم
                </label>
                <Badge variant="outline" className="text-sm px-3 py-1">
                  {sectionInfo.label} ({sectionInfo.labelEn})
                </Badge>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="edit-account-name" className="font-semibold text-text-primary text-sm block">
                اسم الحساب <span className="text-destructive">*</span>
              </label>
              <input
                id="edit-account-name"
                type="text"
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                value={formData.name}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, name: e.target.value }));
                  if (errors.name) setErrors(prev => ({ ...prev, name: undefined }));
                }}
                placeholder="أدخل اسم الحساب"
              />
              {errors.name && (
                <div className="text-destructive text-xs">{errors.name}</div>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="edit-account-subtype" className="font-semibold text-text-primary text-sm block">
                التصنيف <span className="text-destructive">*</span>
              </label>
              <select
                id="edit-account-subtype"
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                value={formData.sub_type}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, sub_type: e.target.value }));
                  if (errors.sub_type) setErrors(prev => ({ ...prev, sub_type: undefined }));
                }}
              >
                <option value="">اختر التصنيف</option>
                <option value="__none__">— بدون تصنيف —</option>
                {categories
                  .filter(c => c.is_active && (!account?.coa_section || c.coa_section === account.coa_section))
                  .map((cat) => (
                    <option key={cat.slug} value={cat.slug}>
                      {categoryLabels[cat.slug] || cat.slug}
                    </option>
                  ))}
              </select>
              {errors.sub_type && (
                <div className="text-destructive text-xs">{errors.sub_type}</div>
              )}
            </div>

            <div className="space-y-2">
              <label className="font-semibold text-text-primary text-sm block">
                طبيعة الحساب
              </label>
              <Badge variant="outline" className="text-sm px-3 py-1">
                {formData.normal_balance === 'credit' ? 'دائن' : 'مدين'}
              </Badge>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button type="button" variant="outline-secondary" onClick={handleClose}>
                <X size={16} className="ml-1" />
                إلغاء
              </Button>
              <Button type="submit" variant="primary" isLoading={updateMutation.isPending}>
                <Save size={16} className="ml-1" />
                تحديث
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="permissions">
          {account && (
            <PermissionsManager
              accountId={account.id}
              accountName={account.name}
              isCashBox={isCashBox}
              primaryCustodianUserId={primaryCustodianUserId}
            />
          )}
        </TabsContent>
      </Tabs>
    </BaseModal>
  );
};

export default TreasuryEditAccountModal;
