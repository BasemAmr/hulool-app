import { useState, useMemo } from 'react';
import { Wallet, Landmark, Search, Loader2 } from 'lucide-react';
import { useGetMyTreasuryAccounts } from '@/features/financials/api/treasuryQueries';
import type { TreasuryAccountWithPermission } from '@/api/types';

// ========================================
// Types
// ========================================

type AccountCategory = 'cashbox' | 'bank' | null;

interface TreasuryAccountPaymentPickerProps {
  value: number | null;
  onChange: (id: number) => void;
  label?: string;
}

// ========================================
// Helpers
// ========================================

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

// ========================================
// Color system
// ========================================

const colorMap: Record<
  string,
  { border: string; text: string; activeBg: string; chipBorder: string; chipBg: string }
> = {
  cashbox: {
    border: 'border-status-success-border',
    text: 'text-status-success-text',
    activeBg: 'bg-status-success-bg',
    chipBorder: 'border-status-success-border',
    chipBg: 'bg-status-success-bg',
  },
  bank: {
    border: 'border-status-info-border',
    text: 'text-status-info-text',
    activeBg: 'bg-status-info-bg',
    chipBorder: 'border-status-info-border',
    chipBg: 'bg-status-info-bg',
  },
};

// ========================================
// Component
// ========================================

export default function TreasuryAccountPaymentPicker({
  value,
  onChange,
  label,
}: TreasuryAccountPaymentPickerProps) {
  const [selectedCategory, setSelectedCategory] = useState<AccountCategory>(null);
  const [forceShowList, setForceShowList] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: rawAccounts, isLoading } = useGetMyTreasuryAccounts();

  // ---- Filter: can_transact + cashbox/bank + exclude settlement ----
  const eligibleAccounts = useMemo(() => {
    if (!rawAccounts) return [];
    return rawAccounts.filter(
      (acc) =>
        acc.can_transact === true &&
        (acc.sub_type === 'cashbox' || acc.sub_type === 'bank') &&
        !(acc.metadata?.is_settlement === true),
    );
  }, [rawAccounts]);

  // ---- Filter by selected category ----
  const categoryFilteredAccounts = useMemo(() => {
    if (!selectedCategory) return eligibleAccounts;
    return eligibleAccounts.filter((acc) => acc.sub_type === selectedCategory);
  }, [eligibleAccounts, selectedCategory]);

  // ---- Search filter (on top of category filter) ----
  const displayAccounts = useMemo(() => {
    if (!searchQuery.trim()) return categoryFilteredAccounts;
    const q = searchQuery.trim().toLowerCase();
    return categoryFilteredAccounts.filter((acc) => acc.name.toLowerCase().includes(q));
  }, [categoryFilteredAccounts, searchQuery]);

  // ---- Selected account ----
  const selectedAccount = useMemo(() => {
    if (value == null) return null;
    return eligibleAccounts.find((acc) => acc.id === value) ?? null;
  }, [value, eligibleAccounts]);

  // ---- Quick action buttons ----
  const renderQuickActions = () => {
    const actions: { kind: AccountCategory; label: string; icon: React.ReactNode }[] = [
      { kind: 'cashbox', label: 'الصندوق', icon: <Wallet size={14} /> },
      { kind: 'bank', label: 'البنك', icon: <Landmark size={14} /> },
    ];

    return (
      <div className="flex gap-1.5">
        {actions.map((action) => {
          const isActive = selectedCategory === action.kind;
          const colors = colorMap[action.kind!];
          return (
            <button
              key={action.kind}
              type="button"
              onClick={() => {
                if (isActive) {
                  setSelectedCategory(null);
                  setForceShowList(false);
                } else {
                  setSelectedCategory(action.kind);
                  setForceShowList(false);
                }
              }}
              className={`flex items-center gap-1.5 rounded-lg border px-4 py-2.5 text-sm font-bold transition-all
                ${
                  isActive
                    ? `border-2 ${colors.border} ${colors.activeBg} ${colors.text}`
                    : 'border-border-default text-text-secondary hover:border-border-strong hover:bg-muted/30'
                }`}
            >
              <span className="shrink-0">{action.icon}</span>
              <span>{action.label}</span>
            </button>
          );
        })}
      </div>
    );
  };

  // ---- Search input ----
  const renderSearch = () => (
    <div className="relative">
      <Search size={16} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary/50" />
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="بحث عن حساب..."
        className="w-full rounded-lg border border-border-default bg-transparent pr-7 pl-3 py-2.5 text-sm font-medium text-text-secondary placeholder:text-text-secondary/40 focus:outline-none focus:ring-1 focus:ring-primary-500/20 focus:border-primary-500/40 transition-all"
      />
    </div>
  );

  // ---- Loading state ----
  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="mb-1 flex items-center gap-2">
          <div className="h-5 w-1 rounded-full bg-primary-500" />
        <span className="text-sm font-bold text-text-primary">{label || 'حساب الخزينة'}</span>
        </div>
        <div className="flex min-h-[36px] items-center justify-center">
          <Loader2 size={18} className="animate-spin text-primary-500" />
        </div>
      </div>
    );
  }

  // ---- Account list or selected chip ----
  const renderAccountArea = () => {
    // Search results (override list when searching)
    if (searchQuery.trim()) {
      if (displayAccounts.length === 0) {
        return (
          <p className="py-2 text-xs text-text-secondary">لا توجد نتائج</p>
        );
      }
      return (
        <div className="max-h-56 space-y-1 overflow-y-auto">
          {displayAccounts.map((acc) => {
            const isSelected = acc.id === value;
            const kind = acc.sub_type as 'cashbox' | 'bank';
            const colors = colorMap[kind];
            return (
              <button
                key={acc.id}
                type="button"
                onClick={() => {
                  onChange(acc.id);
                  setForceShowList(false);
                  setSearchQuery('');
                }}
                className={`w-full rounded-lg border p-3 text-right transition-all
                  ${
                    isSelected
                      ? 'border-primary-500 bg-primary-500/5 ring-1 ring-primary-500'
                      : 'border-border-default hover:border-border-strong hover:bg-muted/20'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-base font-bold text-text-primary">{acc.name}</div>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded ${colors.activeBg} ${colors.text}`}
                  >
                    {acc.sub_type === 'cashbox' ? 'صندوق' : 'بنك'}
                  </span>
                </div>
                <div className="mt-0.5 text-sm font-semibold text-text-secondary">
                  {formatCurrency(acc.balance)} SAR
                </div>
              </button>
            );
          })}
        </div>
      );
    }

    // Chip view: account selected and not forcing list
    if (selectedAccount && !forceShowList) {
      const colors = colorMap[selectedAccount.sub_type] ?? colorMap.cashbox;
      return (
        <div
          className={`flex items-center justify-between gap-2 rounded-lg border-2 ${colors.chipBorder} ${colors.chipBg} px-4 py-3`}
        >
          <div className="flex min-w-0 items-center gap-2">
            <Landmark size={16} className="shrink-0 opacity-60" />
            <span className="truncate text-base font-bold text-text-primary">
              {selectedAccount.name}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-sm font-semibold text-text-secondary">
              {formatCurrency(selectedAccount.balance)} SAR
            </span>
            <button
              type="button"
              onClick={() => setForceShowList(true)}
              className="text-[11px] font-bold text-primary-500 hover:underline"
            >
              تغيير
            </button>
          </div>
        </div>
      );
    }

    // Account card list
    if (displayAccounts.length === 0) {
      return (
        <p className="py-2 text-xs text-text-secondary">لا توجد حسابات متاحة</p>
      );
    }

    return (
      <div className="max-h-56 space-y-1 overflow-y-auto">
        {displayAccounts.map((acc) => {
          const isSelected = acc.id === value;
          const kind = acc.sub_type as 'cashbox' | 'bank';
          const colors = colorMap[kind];
          return (
            <button
              key={acc.id}
              type="button"
              onClick={() => {
                onChange(acc.id);
                setForceShowList(false);
              }}
              className={`w-full rounded-lg border p-3 text-right transition-all
                ${
                  isSelected
                    ? 'border-primary-500 bg-primary-500/5 ring-1 ring-primary-500'
                    : 'border-border-default hover:border-border-strong hover:bg-muted/20'
                }`}
            >
              <div className="flex items-center justify-between">
                <div className="text-base font-bold text-text-primary">{acc.name}</div>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded ${colors.activeBg} ${colors.text}`}
                >
                  {acc.sub_type === 'cashbox' ? 'صندوق' : 'بنك'}
                </span>
              </div>
              <div className="mt-0.5 text-sm font-semibold text-text-secondary">
                {formatCurrency(acc.balance)} SAR
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  // ---- Main render ----
  return (
    <div className="space-y-2">
      <div className="mb-1 flex items-center gap-2">
        <div className="h-5 w-1 rounded-full bg-primary-500" />
        <span className="text-base font-bold text-text-primary">{label || 'حساب الخزينة'}</span>
      </div>

      {renderQuickActions()}
      {renderSearch()}

      <div className="min-h-[36px]">{renderAccountArea()}</div>
    </div>
  );
}
