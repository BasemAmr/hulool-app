import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/shared/ui/shadcn/card';
import { Wallet, ExternalLink, ChevronDown, ArrowLeftRight } from 'lucide-react';
import { useGetMyTreasuryAccounts } from '@/features/financials/api/treasuryQueries';
import { useModalStore } from '@/shared/stores/modalStore';
import { useAuthStore } from '@/features/auth/store/authStore';
import {
  ShadcnSelect as Select,
  ShadcnSelectContent as SelectContent,
  ShadcnSelectItem as SelectItem,
  ShadcnSelectTrigger as SelectTrigger,
  ShadcnSelectValue as SelectValue,
} from '@/shared/ui/shadcn/select';
import type { TreasuryAccountWithPermission } from '@/api/types';

const TREASURY_SELECTOR_KEY = 'employee-treasury-selected-account-id';

export const TreasuryAccountSelectorWidget: React.FC = () => {
  const { data: accounts, isLoading } = useGetMyTreasuryAccounts();
  const openModal = useModalStore((state) => state.openModal);
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    () => localStorage.getItem(TREASURY_SELECTOR_KEY) || ''
  );
  const [settlementOpen, setSettlementOpen] = useState(false);
  const settlementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settlementRef.current && !settlementRef.current.contains(e.target as Node)) {
        setSettlementOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasTransactionPermission =
    user?.type === 'admin' || user?.type === 'employee_admin' || user?.can_make_transactions;

  const parseMetadata = (metadata: TreasuryAccountWithPermission['metadata']) => {
    if (!metadata) return null;
    if (typeof metadata === 'string') {
      try {
        return JSON.parse(metadata) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    if (typeof metadata === 'object') {
      return metadata as Record<string, unknown>;
    }
    return null;
  };

  const mappedAccountsWithoutSettlement = (accounts || []).filter((account) => {
    const metadata = parseMetadata(account.metadata);
    const isSettlementByFlag = metadata?.is_settlement === true || metadata?.is_settlement === 'true';
    const isSettlementByType = metadata?.type === 'settlement';
    return !isSettlementByFlag && !isSettlementByType;
  });

  const defaultAccountId = useMemo(() => {
    if (selectedAccountId && mappedAccountsWithoutSettlement.some((a) => String(a.id) === selectedAccountId)) {
      return selectedAccountId;
    }
    const cashbox = mappedAccountsWithoutSettlement.find((a) => a.sub_type === 'cashbox');
    return cashbox ? String(cashbox.id) : String(mappedAccountsWithoutSettlement[0]?.id ?? '');
  }, [selectedAccountId, mappedAccountsWithoutSettlement]);

  if (isLoading || !accounts || accounts.length === 0) {
    return null;
  }

  const selectedAccount: TreasuryAccountWithPermission | undefined =
    mappedAccountsWithoutSettlement.find((a) => String(a.id) === defaultAccountId) || mappedAccountsWithoutSettlement[0];

  const handleAccountChange = (value: string) => {
    setSelectedAccountId(value);
    localStorage.setItem(TREASURY_SELECTOR_KEY, value);
  };

  if (!selectedAccount) {
    return null;
  }

  const formatBalance = (balance: number) =>
    new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(balance);

  const openUnified = (overrides: Record<string, any>) => {
    openModal('unifiedTransaction', {
      lockDirection: true,
      ...overrides,
    });
  };

  return (
    <Card className="bg-bg-surface border-border-default" dir="rtl">
      <CardContent className="p-4">
        {/* Header: title + balance + select and details link beside it */}
        <div className="flex items-center justify-between mb-3.5 gap-2">
          <div className="flex items-center gap-1.5 shrink-0">
            <Wallet size={16} className="text-text-brand" />
            <span className="text-sm font-bold text-text-primary">الخزينة</span>
            <div className="flex items-baseline gap-0.5 bg-bg-surface-muted border border-border-default/50 px-2 py-0.5 rounded-md text-xs">
              <span className="font-extrabold text-text-brand">{formatBalance(selectedAccount.balance)}</span>
              <span className="text-[10px] text-text-muted">ر.س</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 min-w-0">
            <Select
              value={defaultAccountId}
              onValueChange={handleAccountChange}
            >
              <SelectTrigger className="h-8 text-xs border-border-default bg-bg-surface max-w-[120px] md:max-w-[150px] truncate">
                <SelectValue placeholder="اختر خزينة" />
              </SelectTrigger>
              <SelectContent>
                {mappedAccountsWithoutSettlement.map((account) => (
                  <SelectItem key={account.id} value={String(account.id)}>
                    <div className="flex flex-col text-right">
                      <span className="font-semibold text-xs">{account.name}</span>
                      <span className="text-[10px] text-text-muted">
                        {formatBalance(account.balance)} ر.س
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <button
              onClick={() => navigate(`/employee/treasury-accounts/${selectedAccount.id}`)}
              className="flex items-center gap-1 px-2 h-8 text-[11px] font-bold rounded-md border border-border-default bg-bg-surface text-text-secondary hover:text-text-brand hover:border-text-brand transition-colors shrink-0"
              title="عرض تفاصيل الحساب"
            >
              <ExternalLink size={12} />
              <span>عرض تفاصيل الحساب</span>
            </button>
          </div>
        </div>

        {/* Action Buttons in a single row layout */}
        {hasTransactionPermission && selectedAccount.can_transact && (
          <div className="flex gap-2">
            <button
              onClick={() =>
                openModal('unifiedTransaction', {
                  title: 'سند قبض',
                })
              }
              className="flex-1 py-2 text-[11px] font-bold rounded-md bg-status-success-bg text-status-success-text border border-status-success-border hover:opacity-80 transition-opacity text-center"
            >
              سند قبض
            </button>
            <button
              onClick={() =>
                openModal('unifiedTransaction', {
                  title: 'سند صرف',
                })
              }
              className="flex-1 py-2 text-[11px] font-bold rounded-md bg-status-danger-bg text-status-danger-text border border-status-danger-border hover:opacity-80 transition-opacity text-center"
            >
              سند صرف
            </button>

            {/* سند تسوية - dropdown */}
            <div ref={settlementRef} className="flex-1 relative">
              <button
                onClick={() => setSettlementOpen((prev) => !prev)}
                className="w-full flex items-center justify-center gap-1 py-2 text-[11px] font-bold rounded-md bg-bg-surface text-text-primary border border-border-default hover:bg-bg-surface-muted transition-colors text-center"
              >
                <span>سند تسوية</span>
                <ChevronDown size={12} className="opacity-70" />
              </button>
              {settlementOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 w-full min-w-[120px] rounded-lg border border-border-default bg-bg-surface shadow-xl py-1">
                  <button
                    type="button"
                    className="flex w-full items-center justify-start px-3 py-2 text-xs font-bold text-text-primary hover:bg-bg-surface-muted transition-colors text-right"
                    onClick={() => {
                      setSettlementOpen(false);
                      openUnified({
                        defaultFromCardType: 'settlement',
                        title: 'تسوية قبض',
                      });
                    }}
                  >
                    تسوية قبض
                  </button>
                  <div className="border-t border-border-default" />
                  <button
                    type="button"
                    className="flex w-full items-center justify-start px-3 py-2 text-xs font-bold text-text-primary hover:bg-bg-surface-muted transition-colors text-right"
                    onClick={() => {
                      setSettlementOpen(false);
                      openUnified({
                        defaultToCardType: 'settlement',
                        title: 'تسوية صرف',
                      });
                    }}
                  >
                    تسوية صرف
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
