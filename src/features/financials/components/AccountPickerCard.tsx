// AccountPickerCard.tsx

import { useState, useMemo, useEffect } from 'react';
import { User, Building2, Landmark, Wallet, Search, Lock } from 'lucide-react';
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

type PickerKind = 'client' | 'employee' | 'cashbox' | 'bank' | 'settlement';

interface PickerValue {
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
const QUICK_ACTIONS: { kind: PickerKind; label: string; icon: React.ReactNode; categorySlug: string | null }[] = [
  { kind: 'cashbox', label: 'الصندوق', icon: <Wallet size={14} />, categorySlug: 'cashbox' },
  { kind: 'bank', label: 'البنك', icon: <Landmark size={14} />, categorySlug: 'bank' },
  { kind: 'client', label: 'العميل', icon: <Building2 size={14} />, categorySlug: null },
  { kind: 'employee', label: 'الموظف', icon: <User size={14} />, categorySlug: null },
  { kind: 'settlement', label: 'تسوية', icon: <Lock size={14} />, categorySlug: null },
];

// Color map for each picker kind
const colorMap: Record<string, { border: string; text: string; activeBg: string; chipBorder: string; chipBg: string }> = {
  cashbox: { border: 'border-status-success-border', text: 'text-status-success-text', activeBg: 'bg-status-success-bg', chipBorder: 'border-status-success-border', chipBg: 'bg-status-success-bg' },
  bank: { border: 'border-status-info-border', text: 'text-status-info-text', activeBg: 'bg-status-info-bg', chipBorder: 'border-status-info-border', chipBg: 'bg-status-info-bg' },
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

  // ---- Search through ALL treasury accounts (global search) ----
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.trim().toLowerCase();
    return treasuryData.filter(
      (t) =>
        (t.coa_section || 'assets') === 'assets' &&
        t.name.toLowerCase().includes(q),
    );
  }, [treasuryData, searchQuery]);

  // ---- Fetch employees list if not already in employees prop ----
  const { data: employeesRaw } = useGetAccountsByType('employee', {}, isVisible && value.kind === 'employee');
  const employeeList = value.kind === 'employee' && employees.length === 0
    ? (employeesRaw?.accounts ?? [])
    : employees;

  // ---- Check if an account is system default (locked) ----
  const isSystemDefault = (accountId: string): boolean => {
    const acc = treasuryData.find((t) => String(t.id) === accountId);
    return acc?.is_system_default === 1 || acc?.is_system_default === ('1' as any);
  };

  // ---- Auto-resolve settlement account from treasury data ----
  useEffect(() => {
    if (value.kind === 'settlement' && !value.accountId && treasuryData.length > 0) {
      const settlement = treasuryData.find(
        (t) => typeof t.metadata === 'object' && t.metadata !== null && (t.metadata as any).is_settlement,
      );
      if (settlement) {
        onChange({ ...value, accountId: String(settlement.id) });
      }
    }
  }, [value.kind, treasuryData]);

  // ---- Settlement account for display ----
  const settlementAccount = useMemo(() => {
    if (value.kind !== 'settlement') return null;
    return treasuryData.find(
      (t) => typeof t.metadata === 'object' && t.metadata !== null && (t.metadata as any).is_settlement,
    ) ?? null;
  }, [value.kind, treasuryData]);

  // ---- Quick action buttons ----
  const renderQuickActions = () => {
    const isPreset = Boolean(presetKind);
    // Only show settlement when it's the preset
    const actions = QUICK_ACTIONS.filter((a) => {
      if (a.kind === 'settlement') return presetKind === 'settlement';
      // When a preset exists, hide all other kinds entirely
      if (isPreset) return a.kind === presetKind;
      return true;
    });
    return (
      <div className="flex gap-1.5">
        {actions.map((action) => {
          const isActive = value.kind === action.kind;
          const colors = colorMap[action.kind];
          const presetLocked = isPreset && presetKind === action.kind;
          return (
            <button
              key={action.kind}
              type="button"
              disabled={presetLocked}
              onClick={() => {
                if (presetLocked) return;
                if (isActive) {
                  onChange({ kind: null, accountId: '', categorySlug: null });
                  setForceShowList(false);
                  return;
                }
                onChange({ kind: action.kind, accountId: '', categorySlug: action.categorySlug });
                setForceShowList(false);
              }}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition-all
                ${isActive
                  ? `border-2 ${colors.border} ${colors.activeBg} ${colors.text}`
                  : 'border-border-default text-text-secondary hover:border-border-strong hover:bg-muted/30'
                }
                ${presetLocked ? 'cursor-default' : ''}
              `}
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
    const showChip = Boolean(value.accountId) && Boolean(selectedAccount) && !forceShowList;

    if (showChip && selectedAccount) {
      const colors = colorMap[value.kind!];
      return (
        <div className={`flex items-center justify-between gap-2 rounded-lg border-2 ${colors.chipBorder} ${colors.chipBg} px-3 py-2`}>
          <div className="flex min-w-0 items-center gap-2">
            <Landmark size={14} className="shrink-0 opacity-60" />
            <span className="truncate text-sm font-bold text-text-primary">{selectedAccount.name}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-xs font-semibold text-text-secondary">
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

    return filteredTreasuryAccounts.length === 0 ? (
      <p className="py-2 text-xs text-text-secondary">
        لا توجد حسابات متاحة
      </p>
    ) : (
      <div className="max-h-40 space-y-1 overflow-y-auto">
        {filteredTreasuryAccounts.map((acc) => {
          const isSelected = String(acc.id) === value.accountId;
          const locked = isSystemDefault(String(acc.id));
          return (
            <button
              key={acc.id}
              type="button"
              disabled={locked}
              onClick={() => {
                onChange({ ...value, accountId: isSelected ? '' : String(acc.id) });
                setForceShowList(false);
              }}
              className={`w-full rounded-lg border p-2 text-right transition-all
                ${isSelected
                  ? 'border-primary-500 bg-primary-500/5 ring-1 ring-primary-500'
                  : locked
                    ? 'border-border-default/50 bg-muted/20 opacity-60 cursor-not-allowed'
                    : 'border-border-default hover:border-border-strong hover:bg-muted/20'
                }`}
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-text-primary">{acc.name}</div>
                {locked && <Lock size={11} className="text-text-secondary/50 shrink-0" />}
              </div>
              <div className="mt-0.5 text-xs font-semibold text-text-secondary">
                {formatCurrency(acc.balance)} SAR
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  // ---- Search results (global) ----
  const renderSearchResults = () => {
    if (!searchQuery.trim()) return null;
    return searchResults.length === 0 ? (
      <p className="py-2 text-xs text-text-secondary">لا توجد نتائج</p>
    ) : (
      <div className="max-h-40 space-y-1 overflow-y-auto">
        {searchResults.map((acc) => {
          const isSelected = String(acc.id) === value.accountId;
          const kind = acc.sub_type === 'cashbox' ? 'cashbox' : 'bank';
          const colors = colorMap[kind];
          return (
            <button
              key={acc.id}
              type="button"
              onClick={() => {
                onChange({ kind, accountId: String(acc.id), categorySlug: acc.sub_type });
                setSearchQuery('');
                setForceShowList(false);
              }}
              className={`w-full rounded-lg border p-2 text-right transition-all
                ${isSelected
                  ? 'border-primary-500 bg-primary-500/5 ring-1 ring-primary-500'
                  : 'border-border-default hover:border-border-strong hover:bg-muted/20'
                }`}
            >
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${colors.activeBg} ${colors.text}`}>
                  {acc.sub_type === 'cashbox' ? 'صندوق' : 'بنك'}
                </span>
                <span className="text-sm font-bold text-text-primary">{acc.name}</span>
              </div>
              <div className="mt-0.5 text-xs font-semibold text-text-secondary">
                {formatCurrency(acc.balance)} SAR
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  // ---- Client picker ----
  const renderClientPicker = () => (
    <ClientSearchCombobox
      value={value.accountId}
      onChange={(id) => onChange({ ...value, accountId: id })}
      placeholder="ابحث عن عميل..."
    />
  );

  // ---- Employee picker ----
  const renderEmployeePicker = () => (
    <select
      value={value.accountId}
      onChange={(e) => onChange({ ...value, accountId: e.target.value })}
      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500"
      required
    >
      <option value="">اختر موظف...</option>
      {employeeList.map((emp) => (
        <option key={emp.id} value={emp.id}>
          {emp.name} ({formatCurrency(emp.balance)} SAR)
        </option>
      ))}
    </select>
  );

  // ---- Main account selection area ----
  const renderAccountSelector = () => {
    // If searching, show search results
    if (searchQuery.trim()) return renderSearchResults();
    if (!value.kind) {
      return (
        <div className="flex min-h-[36px] items-center justify-center rounded-lg border border-dashed border-border-default bg-muted/10 px-3 py-2">
          <p className="text-xs font-medium text-text-secondary">اختر نوع الحساب</p>
        </div>
      );
    }
    if (value.kind === 'client') return renderClientPicker();
    if (value.kind === 'employee') return renderEmployeePicker();
    if (value.kind === 'settlement') {
      if (!settlementAccount) {
        return (
          <p className="py-2 text-center text-xs text-text-secondary">جارٍ تحميل حساب التسوية...</p>
        );
      }
      const colors = colorMap.settlement;
      return (
        <div className={`flex items-center justify-between gap-2 rounded-lg border-2 ${colors.chipBorder} ${colors.chipBg} px-3 py-2`}>
          <div className="flex min-w-0 items-center gap-2">
            <Lock size={14} className={`shrink-0 ${colors.text}`} />
            <span className="truncate text-sm font-bold text-text-primary">{settlementAccount.name}</span>
          </div>
          <span className="shrink-0 text-xs font-semibold text-text-secondary">
            {formatCurrency(settlementAccount.balance)} SAR
          </span>
        </div>
      );
    }
    return renderTreasuryAccounts();
  };

  // ---- Main render ----
  return (
    <div className="space-y-2">
      <div className="mb-1 flex items-center gap-2">
        <div className="h-5 w-1 rounded-full bg-primary-500" />
        <span className="text-sm font-bold text-text-primary">{label}</span>
      </div>
      {renderQuickActions()}
      {!value.kind && renderSearch()}
      <div className="min-h-[36px]">{renderAccountSelector()}</div>
    </div>
  );
}

export type { PickerValue, PickerKind };