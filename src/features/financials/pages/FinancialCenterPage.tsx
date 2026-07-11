import React, { useState, useEffect } from 'react';
import { applyPageBackground } from '@/shared/utils/backgroundUtils';
import type { FCActiveTab } from '@/features/financials/types/fcTypes';
import FCMegaTabs from '@/features/financials/components/fc-mega-tabs/FCMegaTabs';
import FCTreasuryView from '@/features/financials/components/fc-treasury-view/FCTreasuryView';
import FCEmployeesView from '@/features/financials/components/fc-employees-view/FCEmployeesView';
import FCClientsView from '@/features/financials/components/fc-clients-view/FCClientsView';
import Button from '@/shared/ui/primitives/Button';
import { useModalStore } from '@/shared/stores/modalStore';
import { TrendingUp, TrendingDown } from 'lucide-react';

const FinancialCenterPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<FCActiveTab>('treasury');
  const openModal = useModalStore((state) => state.openModal);

  useEffect(() => {
    applyPageBackground('financial');
  }, []);

  return (
    <div dir="rtl" className="p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">
          المركز المالي
        </h1>

        {/* Actions in the center */}
        <div className="flex items-center gap-2">
          {/* سند قبض */}
          <Button
            variant="outline-success"
            size="sm"
            className="font-bold flex items-center gap-1"
            onClick={() => openModal('unifiedTransaction', {
              title: 'سند قبض',
            })}
          >
            <TrendingUp size={16} />
            سند قبض
          </Button>

          {/* سند صرف */}
          <Button
            variant="outline-danger"
            size="sm"
            className="font-bold flex items-center gap-1"
            onClick={() => openModal('unifiedTransaction', {
              title: 'سند صرف',
            })}
          >
            <TrendingDown size={16} />
            سند صرف
          </Button>

          {/* سند تسوية */}
          <Button
            variant="outline-secondary"
            size="sm"
            className="font-bold flex items-center gap-1"
            onClick={() => openModal('unifiedTransaction', {
              title: 'سند تسوية',
            })}
          >
            <span>سند تسوية</span>
          </Button>
        </div>

        <FCMegaTabs activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {activeTab === 'treasury' && <FCTreasuryView />}
      {activeTab === 'employees' && <FCEmployeesView />}
      {activeTab === 'clients' && <FCClientsView />}
    </div>
  );
};

export default FinancialCenterPage;
