import React from 'react';
import { useGetCoaTree } from '@/features/financials/api/coaQueries';
import { Spinner } from '@/shared/ui/shadcn/spinner';
import { useModalStore } from '@/shared/stores/modalStore';
import { CreateAccountModal } from '@/features/financials/modals/CreateAccountModal';
import FCCOATree from './FCCOATree';

const FCCOAView: React.FC = () => {
  const { data, isLoading, error } = useGetCoaTree();
  const { isOpen, modalType, props, closeModal } = useModalStore();

  const isCreateModalOpen = isOpen && modalType === 'treasuryCreateAccount';
  const initialSectionId = props?.initialSectionId;

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
      <h2 className="text-2xl font-bold text-text-primary border-b border-border-default pb-3">شجرة الحسابات</h2>
      {data && <FCCOATree data={data} />}
      <CreateAccountModal
        isOpen={isCreateModalOpen}
        onClose={closeModal}
        initialSectionId={initialSectionId}
      />
    </div>
  );
};

export default FCCOAView;
