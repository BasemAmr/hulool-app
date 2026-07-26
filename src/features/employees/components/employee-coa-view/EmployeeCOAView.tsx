import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGetMyTreasuryAccounts, useGetCategoryMetadata } from '@/features/financials/api/treasuryQueries';
import { coaSections } from '@/features/financials/constants/coaSections';
import { SUB_TYPE_TO_SECTION } from '@/features/financials/constants/coaSections';
import { Spinner } from '@/shared/ui/shadcn/spinner';
import EmployeeCOATree from './EmployeeCOATree';
import type { TreasuryAccountWithPermission } from '@/api/types';
import Button from '@/shared/ui/primitives/Button';

interface EmployeeSectionGroup {
  sectionDef: {
    id: string;
    label: string;
    icon: React.ComponentType<{ size?: number }>;
    defaultNormalBalance: string;
  };
  categorized: {
    subType: string;
    label: string;
    accounts: TreasuryAccountWithPermission[];
  }[];
  uncategorized: TreasuryAccountWithPermission[];
  totalCount: number;
}

function buildEmployeeCoaTree(
  accounts: TreasuryAccountWithPermission[],
  categoryMetadata?: { slug: string; label: string }[]
): EmployeeSectionGroup[] {
  // Build a label lookup from category metadata
  const labelMap = new Map<string, string>();
  if (categoryMetadata) {
    for (const cat of categoryMetadata) {
      labelMap.set(cat.slug, cat.label);
    }
  }

  // Group accounts by their section using SUB_TYPE_TO_SECTION
  const sectionMap = new Map<string, TreasuryAccountWithPermission[]>();

  for (const account of accounts) {
    const sectionId = SUB_TYPE_TO_SECTION[account.sub_type] || 'assets';
    if (!sectionMap.has(sectionId)) {
      sectionMap.set(sectionId, []);
    }
    sectionMap.get(sectionId)!.push(account);
  }

  return coaSections
    .filter((sectionDef) => sectionMap.has(sectionDef.id))
    .map((sectionDef) => {
      const sectionAccounts = sectionMap.get(sectionDef.id)!;

      // Group by sub_type (category)
      const categoryMap = new Map<string, TreasuryAccountWithPermission[]>();
      for (const account of sectionAccounts) {
        const subType = account.sub_type;
        if (!categoryMap.has(subType)) {
          categoryMap.set(subType, []);
        }
        categoryMap.get(subType)!.push(account);
      }

      const categorized = Array.from(categoryMap.entries()).map(([subType, accs]) => ({
        subType,
        label: labelMap.get(subType) || subType,
        accounts: accs,
      }));

      return {
        sectionDef: {
          id: sectionDef.id,
          label: sectionDef.label,
          icon: sectionDef.icon,
          defaultNormalBalance: sectionDef.defaultNormalBalance,
        },
        categorized,
        uncategorized: [],
        totalCount: sectionAccounts.length,
      };
    });
}

const EmployeeCOAView: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');

  const { data: accounts, isLoading: isLoadingAccounts, error: accountsError } = useGetMyTreasuryAccounts();
  const { data: categoryMetadata } = useGetCategoryMetadata();

  const filteredAccounts = useMemo(() => {
    if (!accounts) return [];
    if (!categoryParam) return accounts;
    return accounts.filter((a) => a.sub_type === categoryParam);
  }, [accounts, categoryParam]);

  const coaData = useMemo(() => {
    if (!filteredAccounts) return [];
    return buildEmployeeCoaTree(filteredAccounts, categoryMetadata);
  }, [filteredAccounts, categoryMetadata]);

  const clearCategoryFilter = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('category');
    setSearchParams(newParams);
  };

  if (isLoadingAccounts) {
    return (
      <div className="flex items-center justify-center py-12" dir="rtl">
        <Spinner size="lg" />
      </div>
    );
  }

  if (accountsError) {
    return (
      <div className="text-center py-12 text-status-danger-text" dir="rtl">
        <p>حدث خطأ أثناء تحميل الحسابات</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between border-b border-border-default pb-3">
        <h2 className="text-2xl font-bold text-text-primary">الخزينة</h2>

        {categoryParam && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary">
              تصفية حسب: <strong className="text-text-primary">{categoryParam === 'bank' ? 'البنوك' : categoryParam === 'cashbox' ? 'الصناديق' : categoryParam}</strong>
            </span>
            <Button variant="outline-secondary" size="sm" onClick={clearCategoryFilter}>
              عرض كل الحسابات
            </Button>
          </div>
        )}
      </div>

      {!coaData.length ? (
        <div className="text-center py-12 text-text-secondary" dir="rtl">
          <p>لا توجد حسابات متاحة تنطبق على هذا التصفية</p>
          {categoryParam && (
            <Button variant="outline-primary" size="sm" className="mt-3" onClick={clearCategoryFilter}>
              إلغاء التصفية
            </Button>
          )}
        </div>
      ) : (
        <EmployeeCOATree data={coaData} />
      )}
    </div>
  );
};

export default EmployeeCOAView;
