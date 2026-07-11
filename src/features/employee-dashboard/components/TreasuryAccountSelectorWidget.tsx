import React, { useState } from 'react';
import { Card, CardContent } from '@/shared/ui/shadcn/card';
import { Wallet } from 'lucide-react';
import { useGetMyTreasuryAccounts } from '@/features/financials/api/treasuryQueries';
import { useModalStore } from '@/shared/stores/modalStore';
import {
  ShadcnSelect as Select,
  ShadcnSelectContent as SelectContent,
  ShadcnSelectItem as SelectItem,
  ShadcnSelectTrigger as SelectTrigger,
  ShadcnSelectValue as SelectValue,
} from '@/shared/ui/shadcn/select';
import type { TreasuryAccountWithPermission } from '@/api/types';

export const TreasuryAccountSelectorWidget: React.FC = () => {
  const { data: accounts, isLoading } = useGetMyTreasuryAccounts();
  const openModal = useModalStore((state) => state.openModal);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  if (isLoading || !accounts || accounts.length === 0) {
    return null;
  }

  // Set default to first account if none selected yet
  const selectedAccount: TreasuryAccountWithPermission | undefined =
    accounts.find((a) => String(a.id) === selectedAccountId) || accounts[0];

  if (!selectedAccount) {
    return null;
  }

  const mappedAccountsWithoutSettlement = accounts.filter((account) => !account.metadata?.is_settlement);

  const formatBalance = (balance: number) =>
    new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(balance);

  return (
    <Card className="bg-bg-surface border-border-default">
      <CardContent className="p-4">
        {/* Header: icon + label + account selector */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wallet size={18} className="text-text-brand" />
            <span className="text-sm font-bold text-text-primary">الخزينة</span>
          </div>
          <Select
            value={String(selectedAccount.id)}
            onValueChange={setSelectedAccountId}
          >
            <SelectTrigger className="w-auto h-8 text-xs border-border-default bg-bg-surface">
              <SelectValue placeholder="اختر خزينة" />
            </SelectTrigger>
            <SelectContent>
              {mappedAccountsWithoutSettlement.map((account) => (
                <SelectItem key={account.id} value={String(account.id)}>
                  <div className="flex flex-col">
                    <span className="font-medium">{account.name}</span>
                    <span className="text-xs text-text-muted">
                      {formatBalance(account.balance)}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Balance display */}
        <div className="mb-3 text-center">
          <div className="text-2xl font-extrabold text-text-brand">
            {formatBalance(selectedAccount.balance)}
          </div>
          <div className="text-xs text-text-muted mt-0.5">ر.س</div>
        </div>

        {/* Quick action buttons */}
        <div className="flex gap-2">
          <button
            onClick={() =>
              openModal('unifiedTransaction', {
                defaultToCardType: 'treasury',
                defaultToAccountId: String(selectedAccount.id),
                title: 'سند قبض',
              })
            }
            className="flex-1 px-3 py-2 text-sm font-bold rounded-md bg-status-success-bg text-status-success-text border border-status-success-border hover:opacity-80 transition-opacity"
          >
            سند قبض
          </button>
          <button
            onClick={() =>
              openModal('unifiedTransaction', {
                defaultFromCardType: 'treasury',
                defaultFromAccountId: String(selectedAccount.id),
                title: 'سند صرف',
              })
            }
            className="flex-1 px-3 py-2 text-sm font-bold rounded-md bg-status-danger-bg text-status-danger-text border border-status-danger-border hover:opacity-80 transition-opacity"
          >
            سند صرف
          </button>
        </div>
      </CardContent>
    </Card>
  );
};
