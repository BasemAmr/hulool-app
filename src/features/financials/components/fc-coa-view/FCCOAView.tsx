import React, { useMemo } from 'react';
import { useGetCoaTree } from '@/features/financials/api/coaQueries';
import { Spinner } from '@/shared/ui/shadcn/spinner';
import { useModalStore } from '@/shared/stores/modalStore';
import { CreateAccountModal } from '@/features/financials/modals/CreateAccountModal';
import FCCOATree from './FCCOATree';
import type { COATreeData } from '@/features/financials/types/fcTypes';

interface FCCOAViewProps {
  filterSection?: string;
  filterCategory?: string;
}

const FCCOAView: React.FC<FCCOAViewProps> = ({ filterSection, filterCategory }) => {
  const { data, isLoading, error } = useGetCoaTree();
  const { isOpen, modalType, props, closeModal } = useModalStore();

  const isCreateModalOpen = isOpen && modalType === 'treasuryCreateAccount';
  const initialSectionId = props?.initialSectionId;

  // Apply filters: show only the matching section and category
  const filteredData = useMemo(() => {
    if (!data) return data;
    if (!filterSection && !filterCategory) return data;

    const result: COATreeData = [];
    for (const section of data) {
      if (filterSection && section.section.id !== filterSection) continue;

      if (filterCategory) {
        // Filter to only the matching category group
        const matchedGroups = section.categorized.filter(
          (g) => g.subType === filterCategory,
        );
        if (matchedGroups.length === 0) continue;
        result.push({
          ...section,
          categorized: matchedGroups,
          uncategorized: [],
          totalCount: matchedGroups.reduce((sum, g) => sum + g.accounts.length, 0),
          totalBalance: matchedGroups.reduce((sum, g) => sum + g.accounts.reduce((s, a) => s + a.balance, 0), 0),
        });
      } else {
        result.push(section);
      }
    }
    return result;
  }, [data, filterSection, filterCategory]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12" dir="rtl">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-status-danger-text" dir="rtl">
        <p>حدث خطأ أثناء تحميل شجرة الحسابات</p>
        <p className="text-sm text-text-secondary mt-1">
          {error instanceof Error ? error.message : 'خطأ غير معروف'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {!filterCategory && (
        <h2 className="text-2xl font-bold text-text-primary border-b border-border-default pb-3">شجرة الحسابات</h2>
      )}
      {filteredData && <FCCOATree data={filteredData} filterSection={filterSection} />}
      <CreateAccountModal
        isOpen={isCreateModalOpen}
        onClose={closeModal}
        initialSectionId={initialSectionId}
      />
    </div>
  );
};

export default FCCOAView;
