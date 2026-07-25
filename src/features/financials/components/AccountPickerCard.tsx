// AccountPickerCard.tsx

import { useState, useMemo, useEffect } from 'react';
import { User, Building2, Landmark, Wallet, Search, LayoutGrid } from 'lucide-react';
import ClientSearchCombobox from '@/shared/search/ClientSearchCombobox';
import type {
  UnifiedAccount,
  AccountType,
  TreasuryAccount,
  TreasuryCategoryMetadata,
} from '@/api/types';
import { useGetAccountsByType } from '@/features/financials/api/financialCenterQueries';

// ========================================
// Types
// ========================================

export type PickerKind = 'client' | 'employee' | 'cashbox' | 'bank' | 'settlement' | 'other';

export interface PickerValue {
  kind: PickerKind | null;
  accountId: string;
  /** For treasury categories: sub_type (cashbox/bank) */
  categorySlug: string | null;
}

interface AccountPickerCardProps {
  label: string;
  value: PickerValue;
  onChange: (value: PickerValue) => void;
  clients: UnifiedAccount[];
  employees: UnifiedAccount[];
  treasuryData: TreasuryAccount[];
  categoryMetadata: TreasuryCategoryMetadata[];
  /** Pre-set kind (locks the type selection) */
  presetKind?: PickerKind | null;
  isVisible: boolean;
  isRowWide?: boolean;
}

// ========================================
// Helpers
// ========================================

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

// Quick action definitions
const QUICK_ACTIONS: { kind: PickerKind; label: string; categorySlug: string | null }[] = [
  { kind: 'cashbox', label: 'الصندوق', categorySlug: 'cashbox' },
  { kind: 'bank', label: 'البنك', categorySlug: 'bank' },
  { kind: 'other', label: 'حسابات أخرى', categorySlug: 'other' },
  { kind: 'client', label: 'العميل', categorySlug: null },
  { kind: 'employee', label: 'الموظف', categorySlug: null },
  { kind: 'settlement', label: 'تسوية', categorySlug: null },
];

// Color map for each picker kind
const colorMap: Record<string, { border: string; text: string; activeBg: string; chipBorder: string; chipBg: string }> = {
  cashbox: { border: 'border-status-success-border', text: 'text-status-success-text', activeBg: 'bg-status-success-bg', chipBorder: 'border-status-success-border', chipBg: 'bg-status-success-bg' },
  bank: { border: 'border-status-info-border', text: 'text-status-info-text', activeBg: 'bg-status-info-bg', chipBorder: 'border-status-info-border', chipBg: 'bg-status-info-bg' },
  other: { border: 'border-border-strong', text: 'text-text-primary', activeBg: 'bg-bg-surface-muted', chipBorder: 'border-border-strong', chipBg: 'bg-bg-surface-muted' },
  client: { border: 'border-status-warning-border', text: 'text-status-warning-text', activeBg: 'bg-status-warning-bg', chipBorder: 'border-status-warning-border', chipBg: 'bg-status-warning-bg' },
  employee: { border: 'border-status-danger-border', text: 'text-status-danger-text', activeBg: 'bg-status-danger-bg', chipBorder: 'border-status-danger-border', chipBg: 'bg-status-danger-bg' },
  settlement: { border: 'border-status-neutral-border', text: 'text-status-neutral-text', activeBg: 'bg-status-neutral-bg', chipBorder: 'border-status-neutral-border', chipBg: 'bg-status-neutral-bg' },
};

// ========================================
// Component
// ========================================

export default function AccountPickerCard({
  label,
  value,
  onChange,
  clients,
  employees,
  treasuryData,
  categoryMetadata,
  presetKind,
  isVisible,
  isRowWide = false,
}: AccountPickerCardProps) {
  const [forceShowList, setForceShowList] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // ---- Filter treasury accounts by kind/category ----
  const filteredTreasuryAccounts = useMemo(() => {
    if (!value.kind || (value.kind !== 'cashbox' && value.kind !== 'bank')) return [];
    const categorySlug = value.kind === 'cashbox' ? 'cashbox' : 'bank';
    return treasuryData.filter(
      (t) => t.sub_type === categorySlug && (t.coa_section || 'assets') === 'assets',
    );
  }, [treasuryData, value.kind]);

  // ---- Filter "other" treasury accounts (not cashbox, bank, or settlement) ----
  const filteredOtherAccounts = useMemo(() => {
    if (value.kind !== 'other') return [];
    const q = searchQuery.trim().toLowerCase();
    const parseMeta = (meta: any) => {
      if (!meta) return null;
      if (typeof meta === 'string') {
        try { return JSON.parse(meta); } catch { return null; }
      }
      return meta;
    };
    return treasuryData.filter((t) => {
      const meta = parseMeta(t.metadata);
      const isSettlement =
        meta?.is_settlement === true ||
        meta?.is_settlement === 'true' ||
        meta?.type === 'settlement';
      const isCashOrBank = t.sub_type === 'cashbox' || t.sub_type === 'bank';
      if (isCashOrBank || isSettlement) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        (t.account_number && t.account_number.toLowerCase().includes(q))
      );
    });
  }, [treasuryData, value.kind, searchQuery]);

  // ---- Employees data from query ----
  const filteredEmployees = useMemo(() => {
    if (value.kind !== 'employee') return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) => e.name.toLowerCase().includes(q));
  }, [employees, value.kind, searchQuery]);

  // ---- Quick action buttons ----
  const renderQuickActions = () => {
    // Only show settlement when it's the currently selected kind
    const actions = QUICK_ACTIONS.filter((a) => {
      if (a.kind === 'settlement') return value.kind === 'settlement';
      return true;
    });
    return (
      <div className={isRowWide ? "grid grid-cols-5 gap-2 w-full" : "flex gap-1.5 flex-wrap"}>
        {actions.map((action) => {
          const isActive = value.kind === action.kind;
          const colors = colorMap[action.kind];
          return (
            <button
              key={action.kind}
              type="button"
              onClick={() => {
                if (isActive) {
                  onChange({ kind: null, accountId: '', categorySlug: null });
                  setForceShowList(false);
                  return;
                }
                onChange({ kind: action.kind, accountId: '', categorySlug: action.categorySlug });
                setForceShowList(false);
              }}
              className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition-all text-center cursor-pointer
                ${isRowWide ? 'w-full py-2.5 text-sm' : ''}
                ${isActive
                  ? `border-2 ${colors.border} ${colors.activeBg} ${colors.text}`
                  : 'border-border-default text-text-secondary hover:border-border-strong hover:bg-muted/30'
                }
              `}
            >
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
      <Search size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary/50" />
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="بحث..."
        className="w-full rounded-lg border border-border-default bg-transparent pr-7 pl-3 py-1.5 text-xs font-medium text-text-secondary placeholder:text-text-secondary/40 focus:outline-none focus:ring-1 focus:ring-primary-500/20 focus:border-primary-500/40 transition-all"
      />
    </div>
  );

  // ---- Treasury account list (cashbox or bank) ----
  const renderTreasuryAccounts = () => {
    const selectedAccount = filteredTreasuryAccounts.find((a) => String(a.id) === value.accountId);

    if (selectedAccount && !forceShowList) {
      const balance = typeof selectedAccount.balance === 'number' ? selectedAccount.balance : parseFloat(String(selectedAccount.balance ?? 0));
      return (
        <div className="flex items-center justify-between rounded-lg border border-border-strong bg-muted/40 p-2.5 text-xs font-bold">
          <div className="flex items-center gap-2">
            <span>{selectedAccount.name}</span>
            <span className="text-text-secondary font-mono">
              ({formatCurrency(balance)})
            </span>
          </div>
          <button
            type="button"
            onClick={() => setForceShowList(true)}
            className="text-primary hover:underline text-[11px] font-bold"
          >
            تغيير
          </button>
        </div>
      );
    }

    if (filteredTreasuryAccounts.length === 0) {
      return (
        <div className="text-center py-3 text-xs text-text-secondary">
          لا توجد حسابات متاحة
        </div>
      );
    }

    return (
      <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
        {filteredTreasuryAccounts.map((acc) => {
          const isSelected = String(acc.id) === value.accountId;
          const balance = typeof acc.balance === 'number' ? acc.balance : parseFloat(String(acc.balance ?? 0));
          return (
            <div
              key={acc.id}
              onClick={() => {
                onChange({ ...value, accountId: String(acc.id) });
                setForceShowList(false);
              }}
              className={`flex items-center justify-between p-2 rounded-md border text-xs font-bold cursor-pointer transition-all ${
                isSelected
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border-default hover:border-primary/40 text-text-secondary'
              }`}
            >
              <span>{acc.name}</span>
              <span className="text-text-secondary font-mono text-[11px]">
                {formatCurrency(balance)}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  // ---- Client combobox ----
  const renderClientSelector = () => (
    <ClientSearchCombobox
      value={value.accountId}
      onChange={(clientId) => {
        onChange({ ...value, accountId: clientId || '' });
      }}
      placeholder="ابحث باسم العميل..."
    />
  );

  // ---- Employee list ----
  const renderEmployeeSelector = () => {
    const selectedEmployee = employees.find((e) => String(e.id) === value.accountId);

    if (selectedEmployee && !forceShowList) {
      return (
        <div className="flex items-center justify-between rounded-lg border border-border-strong bg-muted/40 p-2.5 text-xs font-bold">
          <div className="flex items-center gap-2">
            <User size={14} className="text-status-danger-text" />
            <span>{selectedEmployee.name}</span>
          </div>
          <button
            type="button"
            onClick={() => setForceShowList(true)}
            className="text-primary hover:underline text-[11px] font-bold"
          >
            تغيير
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-1.5">
        {renderSearch()}
        <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-3 text-xs text-text-secondary">
              لا يطابق أي موظف
            </div>
          ) : (
            filteredEmployees.map((emp) => {
              const isSelected = String(emp.id) === value.accountId;
              return (
                <div
                  key={emp.id}
                  onClick={() => {
                    onChange({ ...value, accountId: String(emp.id) });
                    setForceShowList(false);
                  }}
                  className={`flex items-center justify-between p-2 rounded-md border text-xs font-bold cursor-pointer transition-all ${
                    isSelected
                      ? 'border-status-danger-border bg-status-danger-bg text-status-danger-text'
                      : 'border-border-default hover:border-status-danger-border/40 text-text-secondary'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <User size={13} />
                    <span>{emp.name}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  // ---- Other accounts list ----
  const renderOtherAccountsSelector = () => {
    const selectedAccount = treasuryData.find((t) => String(t.id) === value.accountId);

    if (selectedAccount && !forceShowList) {
      const balance = typeof selectedAccount.balance === 'number' ? selectedAccount.balance : parseFloat(String(selectedAccount.balance ?? 0));
      return (
        <div className="flex items-center justify-between rounded-lg border border-border-strong bg-muted/40 p-2.5 text-xs font-bold">
          <div className="flex items-center gap-2">
            <span>{selectedAccount.name}</span>
            <span className="text-text-secondary font-mono text-[11px]">
              ({formatCurrency(balance)})
            </span>
          </div>
          <button
            type="button"
            onClick={() => setForceShowList(true)}
            className="text-primary hover:underline text-[11px] font-bold"
          >
            تغيير
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-1.5">
        {renderSearch()}
        <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
          {filteredOtherAccounts.length === 0 ? (
            <div className="text-center py-3 text-xs text-text-secondary">
              لا توجد حسابات أخرى
            </div>
          ) : (
            filteredOtherAccounts.map((acc) => {
              const isSelected = String(acc.id) === value.accountId;
              const balance = typeof acc.balance === 'number' ? acc.balance : parseFloat(String(acc.balance ?? 0));
              return (
                <div
                  key={acc.id}
                  onClick={() => {
                    onChange({ ...value, accountId: String(acc.id) });
                    setForceShowList(false);
                  }}
                  className={`flex items-center justify-between p-2 rounded-md border text-xs font-bold cursor-pointer transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border-default hover:border-primary/40 text-text-secondary'
                  }`}
                >
                  <span>{acc.name}</span>
                  <span className="text-text-secondary font-mono text-[11px]">
                    {formatCurrency(balance)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  // ---- Main Card Render ----
  return (
    <div className="rounded-xl border border-border-default bg-card p-3.5 space-y-3">
      {/* Label header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-text-secondary">{label}</span>
      </div>

      {/* Quick Action buttons */}
      {renderQuickActions()}

      {/* Account selection list */}
      {value.kind && (
        <div className="pt-1">
          {value.kind === 'client' && renderClientSelector()}
          {value.kind === 'employee' && renderEmployeeSelector()}
          {(value.kind === 'cashbox' || value.kind === 'bank') && renderTreasuryAccounts()}
          {value.kind === 'other' && renderOtherAccountsSelector()}
        </div>
      )}
    </div>
  );
}