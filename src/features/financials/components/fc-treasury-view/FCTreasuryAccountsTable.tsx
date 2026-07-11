import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useModalStore } from '@/shared/stores/modalStore';
import { useDeactivateTreasuryAccount } from '@/features/financials/api/treasuryQueries';
import { useCategoryLabels } from '@/features/financials/constants/categoryConfig';
import { useToast } from '@/shared/hooks/useToast';
import { Spinner } from '@/shared/ui/shadcn/spinner';
import { Eye, Pencil, Shield, Trash2 } from 'lucide-react';
import type { TreasuryAccount } from '@/api/types';

interface FCTreasuryAccountsTableProps {
  accounts: TreasuryAccount[];
  isLoading: boolean;
}

const formatBalance = (amount: number) =>
  new Intl.NumberFormat('ar-SA', { minimumFractionDigits: 0 }).format(Math.abs(amount));

const FCTreasuryAccountsTable: React.FC<FCTreasuryAccountsTableProps> = ({ accounts, isLoading }) => {
  const navigate = useNavigate();
  const openModal = useModalStore((state) => state.openModal);
  const deactivateMutation = useDeactivateTreasuryAccount();
  const toast = useToast();
  const categoryLabels = useCategoryLabels();

  const handleView = (account: TreasuryAccount) => {
    const path =
      account.sub_type === 'cashbox'
        ? `/financial-center/cash-boxes/${account.id}`
        : `/financial-center/treasury-accounts/${account.id}`;
    navigate(path);
  };

  const handleEdit = (account: TreasuryAccount) => {
    openModal('treasuryEditAccount', { account });
  };

  const handlePermissions = (account: TreasuryAccount) => {
    openModal('treasuryPermissions', { account });
  };

  const handleDeactivate = (account: TreasuryAccount) => {
    openModal('confirmDelete', {
      title: 'إلغاء تنشيط الحساب',
      message: `هل أنت متأكد من إلغاء تنشيط الحساب "${account.name}"؟`,
      onConfirm: () => {
        deactivateMutation.mutate(account.id, {
          onSuccess: () => toast.success('تم', 'تم إلغاء تنشيط الحساب'),
          onError: (err: any) => toast.error('فشل', err.message || ''),
        });
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-text-secondary text-sm">
        لا توجد حسابات مالية
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border-default">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-bg-surface-muted">
            <th className="px-4 py-3 border border-border-default text-right text-sm font-extrabold text-text-primary">
              الاسم
            </th>
            <th className="px-4 py-3 border border-border-default text-right text-sm font-extrabold text-text-primary">
              التصنيف
            </th>
            <th className="px-4 py-3 border border-border-default text-right text-sm font-extrabold text-text-primary">
              الرصيد
            </th>
            <th className="px-4 py-3 border border-border-default text-right text-sm font-extrabold text-text-primary">
              الإجراءات
            </th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((account, idx) => (
            <tr
              key={account.id}
              className={`transition-colors ${
                idx % 2 === 1 ? 'bg-bg-surface-hover' : 'bg-bg-surface'
              } hover:bg-primary/5 group cursor-default`}
            >
              <td className="px-4 py-3 border border-border-default text-right text-base font-bold text-text-primary">
                {account.name}
              </td>
              <td className="px-4 py-3 border border-border-default text-right text-base">
                {categoryLabels[account.sub_type] || account.sub_type}
              </td>
              <td className="px-4 py-3 border border-border-default text-left text-base font-bold tabular-nums">
                {formatBalance(account.balance)}
              </td>
              <td className="px-4 py-3 border border-border-default">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleView(account)}
                    className="p-1.5 rounded hover:bg-primary/10 transition-colors"
                    title="عرض"
                  >
                    <Eye size={16} className="text-text-secondary group-hover:text-primary transition-colors" />
                  </button>
                  <button
                    onClick={() => handleEdit(account)}
                    className="p-1.5 rounded hover:bg-primary/10 transition-colors"
                    title="تعديل"
                  >
                    <Pencil size={16} className="text-text-secondary group-hover:text-primary transition-colors" />
                  </button>
                  <button
                    onClick={() => handlePermissions(account)}
                    className="p-1.5 rounded hover:bg-primary/10 transition-colors"
                    title="الصلاحيات"
                  >
                    <Shield size={16} className="text-text-secondary group-hover:text-primary transition-colors" />
                  </button>
                  {account.is_system_default !== 1 && (
                    <button
                      onClick={() => handleDeactivate(account)}
                      className="p-1.5 rounded hover:bg-destructive/10 transition-colors"
                      title="إلغاء التنشيط"
                    >
                      <Trash2 size={16} className="text-destructive" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FCTreasuryAccountsTable;
