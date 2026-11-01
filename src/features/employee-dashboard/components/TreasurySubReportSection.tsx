import React, { useState, useMemo, useEffect } from 'react';
import { PieChartWidget, type PieSegment } from './PieChartWidget';
import { Spinner } from '@/shared/ui/shadcn/spinner';
import { useModalStore } from '@/shared/stores/modalStore';
import { useAuthStore } from '@/features/auth/store/authStore';
import type { TreasuryAccountReport, ReportPeriod } from '../api/employeeDashboardQueries';
import {
  buildSettlementQabdPreset,
  buildSettlementSarfPreset,
} from '@/features/financials/utils/settlementPresets';
import { useCanUseSettlement } from '@/features/financials/api/treasuryQueries';

// High-contrast, calibrated chart colors
const COLOR_QABDH = '#10b981'; // emerald
const COLOR_SARF = '#f43f5e';  // rose
const COLOR_BALANCE = '#38bdf8'; // sky

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n) + ' ر.س';

interface TreasurySubReportSectionProps {
  title: string;
  storageKey: string;
  accounts: TreasuryAccountReport[];
  isLoading: boolean;
  filterMode: ReportPeriod;
  onFilterChange: (mode: ReportPeriod) => void;
}

export const TreasurySubReportSection: React.FC<TreasurySubReportSectionProps> = ({
  title,
  storageKey,
  accounts,
  isLoading,
  filterMode,
  onFilterChange,
}) => {
  const openModal = useModalStore((state) => state.openModal);
  const user = useAuthStore((state) => state.user);

  // Settlement permission check matching EmployeeNavbar
  const { canUseSettlement } = useCanUseSettlement();
  const isAdmin = user?.type === 'admin' || user?.type === 'employee_admin';
  const canMakeTransactions = isAdmin || user?.can_make_transactions !== false;
  const showSettlement = isAdmin || (canMakeTransactions && canUseSettlement);

  // Read initial selection from localStorage
  const [selectedId, setSelectedId] = useState<number | null>(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? Number(saved) : null;
  });

  // Calculate default / active account
  const acc = useMemo((): TreasuryAccountReport | null => {
    if (accounts.length === 0) return null;
    if (selectedId !== null) {
      const found = accounts.find((a) => a.id === selectedId);
      if (found) return found;
    }
    return accounts[0];
  }, [accounts, selectedId]);

  // Keep state and localStorage in sync when active account changes
  useEffect(() => {
    if (acc) {
      localStorage.setItem(storageKey, String(acc.id));
    }
  }, [acc, storageKey]);

  const handleAccountChange = (id: number) => {
    setSelectedId(id);
    localStorage.setItem(storageKey, String(id));
  };

  if (isLoading && accounts.length === 0) {
    return (
      <div
        style={{
          backgroundImage: 'var(--token-report-card-bg)',
          borderColor: 'var(--token-report-card-border)',
        }}
        className="rounded-2xl p-6 flex items-center justify-center shadow-xs border"
      >
        <Spinner />
      </div>
    );
  }

  // ── Empty State ────────────────────────────────────────────────────────
  if (accounts.length === 0) {
    return (
      <div
        style={{
          backgroundImage: 'var(--token-report-card-bg)',
          borderColor: 'var(--token-report-card-border)',
          boxShadow: 'var(--token-report-card-shadow)',
        }}
        className="rounded-2xl border p-4 shadow-xs"
      >
        <div
          style={{ borderBottomColor: 'var(--token-report-card-border)' }}
          className="flex items-center gap-1.5 pb-2 border-b"
        >
          <h3 style={{ color: 'var(--token-report-card-title)' }} className="text-xs font-bold">{title}</h3>
        </div>
        <div style={{ color: 'var(--token-report-card-subtext)' }} className="py-6 text-center text-xs">لا توجد حسابات معينة لك</div>
      </div>
    );
  }

  const qabdh   = Math.max(0, acc!.qabdh);
  const sarf    = Math.max(0, acc!.sarf);
  const balance = Math.max(0, acc!.balance);
  const allZero = qabdh === 0 && sarf === 0 && balance === 0;

  const chartData: PieSegment[] = allZero
    ? [{ id: 'empty', label: 'لا توجد حركات', value: 1, color: '#64748b', formattedValue: '' }]
    : ([
        { id: 'qabdh',   label: 'إجمالي المقبوضات', value: qabdh,   color: COLOR_QABDH,   formattedValue: fmt(qabdh) },
        { id: 'sarf',    label: 'إجمالي المصروفات',  value: sarf,    color: COLOR_SARF,    formattedValue: fmt(sarf) },
        { id: 'balance', label: 'الرصيد الحالي',      value: balance, color: COLOR_BALANCE, formattedValue: fmt(balance) },
      ] as PieSegment[]).filter((s) => s.value > 0);

  const accountIdStr = String(acc!.id);

  return (
    <div
      style={{
        backgroundImage: 'var(--token-report-card-bg)',
        borderColor: 'var(--token-report-card-border)',
        boxShadow: 'var(--token-report-card-shadow)',
      }}
      className="rounded-2xl border shadow-xs flex flex-col transition-all overflow-hidden dir-rtl"
      dir="rtl"
    >
      {/* 1. Compact Header */}
      <div
        style={{
          backgroundImage: 'var(--token-report-card-header-bg)',
          borderBottomColor: 'var(--token-report-card-border)',
        }}
        className="px-3.5 py-2.5 border-b flex items-center justify-between gap-2 select-none backdrop-blur-xs"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-2 h-2 rounded-full bg-primary shrink-0 shadow-xs" />
          <h3
            style={{ color: 'var(--token-report-card-title)' }}
            className="text-xs font-bold truncate tracking-tight"
          >
            {title}
          </h3>
        </div>

        {/* Period Filter */}
        <select
          value={filterMode}
          onChange={(e) => onFilterChange(e.target.value as ReportPeriod)}
          style={{
            background: 'var(--token-report-card-input-bg)',
            borderColor: 'var(--token-report-card-input-border)',
            color: 'var(--token-report-card-text)',
          }}
          className="border rounded-lg px-2.5 py-1 text-[11px] font-bold focus:outline-none cursor-pointer shadow-2xs transition-colors"
        >
          <option value="current_month">الشهر الحالي</option>
          <option value="all">جميع البيانات</option>
        </select>
      </div>

      {/* 2. Body */}
      <div className="p-3.5 space-y-3 flex-1 flex flex-col justify-between">
        {/* Account Selector dropdown or Single account label */}
        {accounts.length > 1 ? (
          <div>
            <select
              value={acc!.id}
              onChange={(e) => handleAccountChange(Number(e.target.value))}
              style={{
                background: 'var(--token-report-card-input-bg)',
                borderColor: 'var(--token-report-card-input-border)',
                color: 'var(--token-report-card-text)',
              }}
              className="w-full border rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none cursor-pointer shadow-2xs transition-colors"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        ) : (
          <div
            style={{ color: 'var(--token-report-card-subtext)' }}
            className="text-xs font-bold px-1"
          >
            {acc!.name}
          </div>
        )}

        {/* Pie Chart with amounts and percentages in legend */}
        <div className="pt-1">
          <PieChartWidget
            data={chartData}
            size={135}
            showLegend={true}
          />
        </div>
      </div>
    </div>
  );
};

export default TreasurySubReportSection;
