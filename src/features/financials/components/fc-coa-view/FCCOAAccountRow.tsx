import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Pencil, XCircle } from 'lucide-react';
import { useModalStore } from '@/shared/stores/modalStore';
import { useDeactivateTreasuryAccount } from '../../api/treasuryQueries';
import { useToast } from '@/shared/hooks/useToast';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/shared/ui/shadcn/alert-dialog';
import type { TreasuryAccount } from '@/api/types';

interface FCCOAAccountRowProps {
  account: TreasuryAccount;
}

const formatBalance = (balance: number): string => {
  const englishNum = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(balance);
  return `${englishNum} ريال سعودي`;
};

const FCCOAAccountRow: React.FC<FCCOAAccountRowProps> = ({ account }) => {
  const navigate = useNavigate();
  const openModal = useModalStore((state) => state.openModal);
  const toast = useToast();
  const deactivateMutation = useDeactivateTreasuryAccount();

  const handleEdit = () => {
    openModal('treasuryEditAccount', { account });
  };

  const handleView = () => {
    navigate(`/financial-center/treasury-accounts/${account.id}`);
  };

  const handleDeactivate = () => {
    deactivateMutation.mutate(account.id, {
      onSuccess: () => {
        toast.success('تم', 'تم إلغاء تنشيط الحساب المالي');
      },
      onError: (err: any) => {
        toast.error('فشل', err?.message || 'حدث خطأ أثناء إلغاء التنشيط');
      },
    });
  };

  return (
    <div className="grid grid-cols-12 border-b border-border-strong hover:bg-bg-surface-hover transition-colors text-base">
      <span className="col-span-2 border-s border-e border-border-strong/80 px-3 py-3 text-text-secondary font-mono font-medium">
        {account.account_number || '—'}
      </span>
      <span className="col-span-5 border-e border-border-strong/80 px-3 py-3 text-text-primary truncate font-medium">
        {account.name}
      </span>
      <span className="col-span-3 border-e border-border-strong/80 px-3 py-3 text-left font-semibold text-text-primary tracking-tight">
        {formatBalance(account.balance)}
      </span>
      <div className="col-span-2 border-e border-border-strong/80 px-3 py-3 flex items-center justify-center gap-1">
        <button
          onClick={handleView}
          className="p-1.5 rounded-md text-text-secondary hover:text-primary hover:bg-bg-surface transition-colors"
          title="عرض الحساب"
        >
          <Eye size={16} />
        </button>
        <button
          onClick={handleEdit}
          className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-surface transition-colors"
          title="تعديل الحساب"
        >
          <Pencil size={16} />
        </button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              className="p-1.5 rounded-md text-text-secondary hover:text-status-danger-text hover:bg-status-danger-bg/20 transition-colors"
              title="إلغاء تنشيط الحساب"
            >
              <XCircle size={16} />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>تأكيد إلغاء التنشيط</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من إلغاء تنشيط الحساب "{account.name}"؟
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeactivate}>
                تأكيد
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default FCCOAAccountRow;
