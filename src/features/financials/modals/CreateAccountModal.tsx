import React, { useState, useCallback, useMemo } from 'react';
import BaseModal from '@/shared/ui/layout/BaseModal';
import Input from '@/shared/ui/primitives/Input';
import Button from '@/shared/ui/primitives/Button';
import {
  ShadcnSelect as Select,
  ShadcnSelectTrigger as SelectTrigger,
  ShadcnSelectValue as SelectValue,
  ShadcnSelectContent as SelectContent,
  ShadcnSelectItem as SelectItem
} from '@/shared/ui/shadcn/select';
import { Spinner } from '@/shared/ui/shadcn/spinner';
import { Badge } from '@/shared/ui/shadcn/badge';
import { useGetCategoryMetadata, useCreateTreasuryAccount } from '../api/treasuryQueries';
import { useCategoryLabels } from '@/features/financials/constants/categoryConfig';
import { coaSections } from '@/features/financials/constants/coaSections';
import { useToast } from '@/shared/hooks/useToast';

interface CreateAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSectionId?: string; // NEW: pre-fill section from COA tree
}

export const CreateAccountModal: React.FC<CreateAccountModalProps> = React.memo(({
  isOpen,
  onClose,
  initialSectionId,
}) => {
  const [name, setName] = useState('');
  const [subType, setSubType] = useState('');
  const [normalBalance, setNormalBalance] = useState<'debit' | 'credit'>('debit');

  const toast = useToast();
  const { data: categories = [], isLoading: isLoadingCategories } = useGetCategoryMetadata();
  const categoryLabels = useCategoryLabels();
  const mutation = useCreateTreasuryAccount();

  // Look up section info when initialSectionId is provided
  const sectionInfo = useMemo(() => {
    if (!initialSectionId) return null;
    return coaSections.find((s) => s.id === initialSectionId) || null;
  }, [initialSectionId]);

  // Derive normal_balance from section when initialSectionId is provided
  const derivedNormalBalance = useMemo<'debit' | 'credit'>(() => {
    if (sectionInfo) {
      return sectionInfo.defaultNormalBalance;
    }
    return normalBalance;
  }, [sectionInfo, normalBalance]);

  const handleSubmit = useCallback(() => {
    if (!name.trim()) {
      toast.error('خطأ', 'الرجاء إدخال اسم الحساب');
      return;
    }

    const resolvedSubType = subType === '__none__' ? '' : subType;

    const payload: {
      name: string;
      sub_type: string;
      normal_balance: 'debit' | 'credit';
      coa_section?: string;
    } = {
      name: name.trim(),
      sub_type: resolvedSubType,
      normal_balance: derivedNormalBalance,
    };

    if (initialSectionId) {
      payload.coa_section = initialSectionId;
    }

    mutation.mutate(
      payload,
      {
        onSuccess: () => {
          toast.success('تم الحفظ', 'تم إنشاء الحساب المالي بنجاح');
          setName('');
          setSubType('');
          setNormalBalance('debit');
          onClose();
        },
        onError: (err: any) => {
          toast.error('فشل الحفظ', err.message || 'حدث خطأ غير متوقع');
        },
      }
    );
  }, [name, subType, derivedNormalBalance, initialSectionId, toast, mutation, onClose]);

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="إنشاء حساب مالي جديد" className="max-w-md">
      <div className="space-y-4" dir="rtl">
        <div>
          <label className="block text-sm font-medium mb-1 text-right">اسم الحساب</label>
          <Input
            type="text"
            placeholder="اسم الحساب المالي"
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            autoFocus
          />
        </div>

        {/* COA Section — read-only badge when initialSectionId is provided */}
        {sectionInfo && (
          <div>
            <label className="block text-sm font-medium mb-1 text-right">القسم</label>
            <Badge variant="outline" className="text-sm px-3 py-1">
              {sectionInfo.label} ({sectionInfo.labelEn})
            </Badge>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1 text-right">التصنيف</label>
          <Select
            value={subType}
            onValueChange={(val: string) => setSubType(val)}
            disabled={isLoadingCategories}
          >
            <SelectTrigger className="w-full text-right flex-row-reverse">
              {isLoadingCategories ? (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Spinner className="h-4 w-4" />
                  جاري تحميل التصنيفات...
                </span>
              ) : (
                <SelectValue placeholder="اختر التصنيف (اختياري)" />
              )}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" className="text-right text-muted-foreground">
                — بدون تصنيف —
              </SelectItem>
              {categories
                .filter(c => c.is_active && (!initialSectionId || c.coa_section === initialSectionId))
                .map((cat) => (
                  <SelectItem key={cat.slug} value={cat.slug} className="text-right">
                    {categoryLabels[cat.slug] || cat.slug}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {/* Normal Balance — read-only badge when section is provided, otherwise editable select */}
        <div>
          <label className="block text-sm font-medium mb-1 text-right">طبيعة الحساب</label>
          {sectionInfo ? (
            <Badge variant="outline" className="text-sm px-3 py-1">
              {sectionInfo.defaultNormalBalance === 'debit' ? 'مدين' : 'دائن'}
            </Badge>
          ) : (
            <Select
              value={normalBalance}
              onValueChange={(val) => setNormalBalance(val as 'debit' | 'credit')}
            >
              <SelectTrigger className="w-full text-right flex-row-reverse">
                <SelectValue placeholder="الرصيد العادي" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="debit">مدين — للأصول والبنك والعهد</SelectItem>
                <SelectItem value="credit">دائن — للالتزامات</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            className="flex-1"
            onClick={handleSubmit}
            isLoading={mutation.isPending}
          >
            حفظ الحساب
          </Button>
          <Button
            variant="outline-primary"
            onClick={onClose}
          >
            إلغاء
          </Button>
        </div>
      </div>
    </BaseModal>
  );
});
