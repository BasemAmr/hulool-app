import React, { useMemo } from 'react';
import { useGetMyTreasuryAccounts, useGetCategoryMetadata } from '@/features/financials/api/treasuryQueries';
import { coaSections } from '@/features/financials/constants/coaSections';
import { SUB_TYPE_TO_SECTION } from '@/features/financials/constants/coaSections';
import { Spinner } from '@/shared/ui/shadcn/spinner';
import EmployeeCOATree from './EmployeeCOATree';
import type { TreasuryAccountWithPermission } from '@/api/types';

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
  const { data: accounts, isLoading: isLoadingAccounts, error: accountsError } = useGetMyTreasuryAccounts();
  const { data: categoryMetadata } = useGetCategoryMetadata();

  const coaData = useMemo(() => {
    if (!accounts) return [];
    return buildEmployeeCoaTree(accounts, categoryMetadata);
  }, [accounts, categoryMetadata]);

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

  if (!coaData.length) {
    return (
      <div className="text-center py-12 text-text-secondary" dir="rtl">
        <p>لا يوجد حسابات مالية متاحة لك</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <h2 className="text-2xl font-bold text-text-primary border-b border-border-default pb-3">الخزينة</h2>
      <EmployeeCOATree data={coaData} />
    </div>
  );
};

export default EmployeeCOAView;
