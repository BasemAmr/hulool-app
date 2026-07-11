// AccountPickerCard.tsx

import { useState, useMemo, useEffect } from 'react';
import { User, Building2, Landmark, Lock, Receipt } from 'lucide-react';
import ClientSearchCombobox from '@/shared/search/ClientSearchCombobox';
import { useCategoryLabels } from '@/features/financials/constants/categoryConfig';
import { coaSections } from '@/features/financials/constants/coaSections';
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

type PickerKind = 'client' | 'employee' | 'treasury_section' | 'settlement';

interface PickerValue {
  kind: PickerKind | null;
  accountId: string;
  /** For treasury_section: which COA section is selected */
  sectionSlug: string | null;
  /** For treasury_section: which sub_type category tab is active */
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

const getSectionIcon = (slug: string) => {
  const s = slug.toLowerCase();
  if (s.includes('expense')) return <Receipt size={13} />;
  return <Landmark size={13} />;
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
  // ---- Local UI-only state: whether the treasury account list is forced open ----
  // Purely presentational — collapses to a compact chip after selection so the
  // picker doesn't keep a full scrollable list open once a choice is made.
  const [forceShowList, setForceShowList] = useState(false);

  // ---- Derive COA sections from treasury data ----
  const sections = useMemo(() => {
    const seen = new Set<string>();
    const result: { slug: string; label: string }[] = [];
    const sectionLabels: Record<string, string> = Object.fromEntries(
      coaSections.map((section) => [section.id, section.label]),
    );
    for (const t of treasuryData) {
      const slug = t.coa_section || 'assets';
      if (seen.has(slug)) continue;
      seen.add(slug);
      result.push({ slug, label: sectionLabels[slug] ?? slug });
    }
    return result.sort((a, b) => a.label.localeCompare(b.label, 'ar'));
  }, [treasuryData]);

  const categoryLabels = useCategoryLabels();

  // ---- Derive categories within the selected section ----
  const sectionCategories = useMemo(() => {
    if (!value.sectionSlug) return [];
    return categoryMetadata
      .filter((c) => c.coa_section === value.sectionSlug && c.is_active)
      .map((cat) => ({
        ...cat,
        label: categoryLabels[cat.slug] || cat.label,
      }))
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [value.sectionSlug, categoryMetadata, categoryLabels]);

  // ---- Filter treasury accounts by section + selected category ----
  const filteredTreasuryAccounts = useMemo(() => {
    let list = treasuryData.filter((t) => (t.coa_section || 'assets') === value.sectionSlug);
    if (value.categorySlug) {
      list = list.filter((t) => t.sub_type === value.categorySlug);
    }
    return list;
  }, [treasuryData, value.sectionSlug, value.categorySlug]);

  // ---- Fetch employees list if not already in employees prop ----
  const { data: employeesRaw } = useGetAccountsByType('employee', {}, isVisible && value.kind === 'employee');
  const employeeList = value.kind === 'employee' && employees.length === 0
    ? (employeesRaw?.accounts ?? [])
    : employees;

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

  // ---- Find settlement account for display ----
  const settlementAccount = useMemo(() => {
    if (value.kind !== 'settlement') return null;
    return treasuryData.find(
      (t) => typeof t.metadata === 'object' && t.metadata !== null && (t.metadata as any).is_settlement,
    ) ?? null;
  }, [value.kind, treasuryData]);

  // ---- Card colors (one consistent color per account category, incl. treasury) ----
  const colorMap: Record<string, { bg: string; border: string; text: string; activeBg: string }> = {
    client: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', activeBg: 'bg-blue-100' },
    employee: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', activeBg: 'bg-amber-100' },
    settlement: { bg: 'bg-teal-50', border: 'border-teal-400', text: 'text-teal-700', activeBg: 'bg-teal-100' },
    treasury_section: { bg: 'bg-slate-50', border: 'border-slate-300', text: 'text-slate-700', activeBg: 'bg-slate-100' },
  };

  // ---- Pickers ----
  const renderTypeCard = (
    elementKey: string,
    kind: PickerKind,
    slug: string,
    label: string,
    icon: React.ReactNode,
  ) => {
    const isActive = value.kind === kind && (!slug || value.sectionSlug === slug);
    const preset = colorMap[kind];
    return (
      <button
        key={elementKey}
        type="button"
        onClick={() => {
          if (isActive) {
            onChange({ kind: null, accountId: '', sectionSlug: null, categorySlug: null });
            setForceShowList(false);
            return;
          }
          if (kind === 'treasury_section') {
            onChange({ kind, accountId: '', sectionSlug: slug, categorySlug: null });
          } else {
            onChange({ kind, accountId: '', sectionSlug: null, categorySlug: null });
          }
          setForceShowList(false);
        }}
        className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-[11px] font-bold transition-all
          ${isActive
            ? `border-2 ${preset?.border ?? 'border-primary-500'} ${preset?.activeBg ?? 'bg-primary-500/10'} ${preset?.text ?? 'text-primary-500'}`
            : 'border-border-default text-text-secondary hover:border-border-strong hover:bg-muted/40'
          }
          ${presetKind && presetKind !== kind ? 'opacity-40 pointer-events-none' : ''}
        `}
      >
        <span className="shrink-0">{icon}</span>
        <span className="truncate">{label}</span>
      </button>
    );
  };

  const renderKindSelector = () => (
    <div className="flex flex-wrap gap-1 rounded-lg border border-border-default bg-muted/20 p-1">
      {renderTypeCard('client', 'client', '', 'عميل', <Building2 size={13} />)}
      {renderTypeCard('employee', 'employee', '', 'موظف', <User size={13} />)}
      {renderTypeCard('settlement', 'settlement', '', 'تسوية', <Lock size={13} />)}
      {sections.map((s) =>
        renderTypeCard(`section-${s.slug}`, 'treasury_section', s.slug, s.label, getSectionIcon(s.slug)),
      )}
    </div>
  );

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

  // ---- Treasury section picker (category tabs + compact chip or account cards) ----
  const renderTreasuryPicker = () => {
    const selectedAccount =
      filteredTreasuryAccounts.find((a) => String(a.id) === value.accountId) ??
      treasuryData.find((a) => String(a.id) === value.accountId);
    const showChip = Boolean(value.accountId) && Boolean(selectedAccount) && !forceShowList;

    return (
      <div className="space-y-2">
        {/* Category tabs */}
        {sectionCategories.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {sectionCategories.map((cat) => {
              const isActive = value.categorySlug === cat.slug;
              return (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() => {
                    onChange({
                      ...value,
                      categorySlug: isActive ? null : cat.slug,
                      accountId: isActive ? '' : value.accountId,
                    });
                    setForceShowList(true);
                  }}
                  className={`rounded-md border px-2 py-1 text-[11px] font-bold transition-all
                    ${isActive
                      ? 'border-primary-500 bg-primary-500/10 text-primary-500'
                      : 'border-border-default text-text-secondary hover:border-border-strong'
                    }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Compact selected-account chip */}
        {showChip && selectedAccount && (
          <div className="flex items-center justify-between gap-2 rounded-lg border-2 border-slate-300 bg-slate-50 px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <Landmark size={14} className="shrink-0 text-slate-600" />
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
        )}

        {/* Account list (only while actively picking) */}
        {!showChip && (
          filteredTreasuryAccounts.length === 0 ? (
            <p className="py-2 text-xs text-text-secondary">
              {value.sectionSlug ? 'لا توجد حسابات في هذا القسم' : 'اختر تصنيف لعرض الحسابات'}
            </p>
          ) : (
            <div className="max-h-48 space-y-1.5 overflow-y-auto">
              {filteredTreasuryAccounts.map((acc) => {
                const isSelected = String(acc.id) === value.accountId;
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => {
                      onChange({ ...value, accountId: isSelected ? '' : String(acc.id) });
                      setForceShowList(false);
                    }}
                    className={`w-full rounded-lg border-2 p-2.5 text-right transition-all
                      ${isSelected
                        ? 'border-primary-500 bg-primary-500/5 ring-2 ring-primary-500'
                        : 'border-border-default hover:border-border-strong hover:bg-muted/20'
                      }`}
                  >
                    <div className="text-sm font-bold text-text-primary">{acc.name}</div>
                    <div className="mt-0.5 text-xs font-semibold text-text-secondary">
                      {formatCurrency(acc.balance)} SAR
                    </div>
                  </button>
                );
              })}
            </div>
          )
        )}
      </div>
    );
  };

  // ---- Settlement picker (auto-resolved, compact locked chip) ----
  const renderSettlementPicker = () => {
    if (!settlementAccount) {
      return (
        <p className="py-2 text-center text-xs text-text-secondary">
          جارٍ تحميل حساب التسوية...
        </p>
      );
    }
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border-2 border-teal-400 bg-teal-50 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Lock size={14} className="shrink-0 text-teal-600" />
          <span className="truncate text-sm font-bold text-text-primary">{settlementAccount.name}</span>
        </div>
        <span className="shrink-0 text-xs font-semibold text-text-secondary">
          {formatCurrency(settlementAccount.balance)} SAR
        </span>
      </div>
    );
  };

  // ---- Main account selection area ----
  const renderAccountSelector = () => {
    if (!value.kind) {
      return (
        <div className="flex min-h-[40px] items-center justify-center rounded-lg border border-dashed border-border-default bg-muted/10 px-3 py-2">
          <p className="text-xs font-medium text-text-secondary">اختر نوع الحساب أعلاه</p>
        </div>
      );
    }

    if (value.kind === 'client') return renderClientPicker();
    if (value.kind === 'employee') return renderEmployeePicker();
    if (value.kind === 'settlement') return renderSettlementPicker();
    return renderTreasuryPicker();
  };

  // ---- Main render ----
  return (
    <div className="space-y-2">
      <div className="mb-1 flex items-center gap-2">
        <div className="h-5 w-1 rounded-full bg-primary-500" />
        <span className="text-sm font-bold text-text-primary">{label}</span>
      </div>
      {renderKindSelector()}
      <div className="min-h-[44px]">{renderAccountSelector()}</div>
    </div>
  );
}

export type { PickerValue, PickerKind };