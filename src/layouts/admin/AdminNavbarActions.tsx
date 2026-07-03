import React, { useState } from 'react';
import Button from '@/shared/ui/primitives/Button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/shared/ui/shadcn/dropdown-menu';
import { Wallet, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { RecordVoucherModal } from '@/features/financials/modals/RecordVoucherModal';
import { useGetCashBoxes } from '@/features/financials/api/cashBoxQueries';

export const AdminNavbarActions = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [voucherType, setVoucherType] = useState<'receipt' | 'payment'>('payment');
  
  const { data: boxes } = useGetCashBoxes();
  const activeBoxId = boxes?.find(b => b.status === 'active')?.id;

  const openModal = (type: 'receipt' | 'payment') => {
    setVoucherType(type);
    setModalOpen(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline-primary" size="sm">
            <Wallet className="h-4 w-4 ml-2" />
            الصندوق
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => openModal('payment')}>
            <ArrowUpCircle className="h-4 w-4 ml-2 text-red-500" />
            صرف سريع من الصندوق
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openModal('receipt')}>
            <ArrowDownCircle className="h-4 w-4 ml-2 text-green-500" />
            قبض سريع في الصندوق
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {activeBoxId && (
        <RecordVoucherModal 
          isOpen={modalOpen} 
          onClose={() => setModalOpen(false)} 
          boxId={activeBoxId}
          defaultType={voucherType}
        />
      )}
    </>
  );
};
