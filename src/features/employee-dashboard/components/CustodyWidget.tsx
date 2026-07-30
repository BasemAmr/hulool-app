import React from 'react';
import { Card, CardContent } from '@/shared/ui/shadcn/card';
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { useGetCashBoxes } from '@/features/financials/api/cashBoxQueries';
import { useModalStore } from '@/shared/stores/modalStore';
import Button from '@/shared/ui/primitives/Button';

export const CustodyWidget: React.FC = () => {
  const { data: cashBoxes, isLoading } = useGetCashBoxes();
  const openModal = useModalStore((state) => state.openModal);

  // If no cash boxes are assigned to the employee, do not render the widget
  if (isLoading || !cashBoxes || cashBoxes.length === 0) {
    return null;
  }

  // Use the first active box
  const box = cashBoxes[0];

  return (
    <Card className="mb-4 bg-status-info-bg border-status-info-border">
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 text-status-info-text">
          <div className="p-2 bg-status-info-bg border border-status-info-border rounded-lg shadow-sm">
            <Wallet size={24} className="text-status-info-text" />
          </div>
          <div>
            <h3 className="text-sm font-bold opacity-80">{box.name}</h3>
            <p className="text-xl font-bold font-sans">
              {new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(box.balance)} 
              <span className="text-sm mr-1 font-normal opacity-80">ر.س</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline-primary" 
            size="sm"
            onClick={() => openModal('recordVoucher', { boxId: box.id, defaultType: 'receipt' })}
            className="border-status-info-border text-status-info-text hover:bg-bg-surface-hover gap-1 bg-bg-surface"
          >
            <TrendingUp size={14} />
            إيداع سريع
          </Button>
          <Button 
            variant="outline-danger" 
            size="sm"
            onClick={() => openModal('recordVoucher', { boxId: box.id, defaultType: 'payment' })}
            className="border-status-info-border text-status-info-text hover:bg-bg-surface-hover gap-1 bg-bg-surface"
          >
            <TrendingDown size={14} />
            صرف سريع
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
