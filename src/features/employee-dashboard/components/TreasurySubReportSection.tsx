import React, { useState, useMemo, useEffect } from 'react';
import { PieChartWidget, type PieSegment } from './PieChartWidget';
import { Spinner } from '@/shared/ui/shadcn/spinner';
import Button from '@/shared/ui/primitives/Button';
import { useModalStore } from '@/shared/stores/modalStore';
import type { TreasuryAccountReport, ReportPeriod } from '../api/employeeDashboardQueries';

// Color convention: مقبوضات=أخضر, مصروفات=أحمر, رصيد=أزرق
const COLOR_QABDH   = 'var(--token-chart-1)'; // teal/green
const COLOR_SARF    = 'var(--token-chart-4)'; // rose/red
const COLOR_BALANCE = 'var(--token-chart-5)'; // sky blue

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
      <div className="bg-card border border-border rounded-xl p-3 shadow-sm flex items-center justify-center py-8">
        <Spinner />
      </div>
    );
  }

  // ── Empty State ────────────────────────────────────────────────────────
  if (accounts.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-3 shadow-sm">
        <div className="flex items-center gap-1.5 pb-2 border-b border-border">
          <h3 className="text-sm font-bold text-text-primary">{title}</h3>
        </div>
        <div className="py-6 text-center text-xs text-text-secondary">لا توجد حسابات معينة لك</div>
      </div>
    );
  }

  const qabdh   = Math.max(0, acc!.qabdh);
  const sarf    = Math.max(0, acc!.sarf);
  const balance = Math.max(0, acc!.balance);
  const allZero = qabdh === 0 && sarf === 0 && balance === 0;

  const chartData: PieSegment[] = allZero
    ? [{ id: 'empty', label: 'لا توجد حركات', value: 1, color: 'var(--token-border-default)', formattedValue: '' }]
    : ([
        { id: 'qabdh',   label: 'إجمالي المقبوضات', value: qabdh,   color: COLOR_QABDH,   formattedValue: fmt(qabdh) },
        { id: 'sarf',    label: 'إجمالي المصروفات',  value: sarf,    color: COLOR_SARF,    formattedValue: fmt(sarf) },
        { id: 'balance', label: 'الرصيد الحالي',      value: balance, color: COLOR_BALANCE, formattedValue: fmt(balance) },
      ] as PieSegment[]).filter((s) => s.value > 0);

  const accountIdStr = String(acc!.id);

  return (
    <div className="bg-card border border-border rounded-xl p-3.5 shadow-xs space-y-2.5">
      {/* Header */}
      <div className="space-y-2 pb-2.5 border-b border-border-default">

        {/* Title + Period Filter */}
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-text-primary truncate">{title}</h3>
          <select
            value={filterMode}
            onChange={(e) => onFilterChange(e.target.value as ReportPeriod)}
            className="bg-bg-surface text-xs font-bold text-text-primary border border-border-default rounded-md px-2 py-1 focus:outline-none cursor-pointer flex-shrink-0"
          >
            <option value="current_month">الشهر الحالي</option>
            <option value="all">جميع البيانات</option>
          </select>
        </div>

        {/* Account Selector dropdown */}
        {accounts.length > 1 && (
          <select
            value={acc!.id}
            onChange={(e) => handleAccountChange(Number(e.target.value))}
            className="w-full bg-bg-surface text-xs font-bold text-text-primary border border-border-default rounded-md px-2 py-1.5 focus:outline-none cursor-pointer"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        )}

        {/* Single-account name label */}
        {accounts.length === 1 && (
          <div className="text-[11px] font-bold text-text-secondary">{acc!.name}</div>
        )}

        {/* 4 Action Buttons in 1 row targeting selected account */}
        <div className="grid grid-cols-4 gap-1">
          <Button
            type="button"
            variant="outline-success"
            size="sm"
            className="h-5.5 px-0.5 text-[9px] font-bold cursor-pointer whitespace-nowrap"
            onClick={() =>
              openModal('unifiedTransaction', {
                title: 'سند قبض',
                defaultFromCardType: 'client',
                defaultToCardType: 'treasury',
                defaultToAccountId: accountIdStr,
                lockDirection: false,
              })
            }
          >
            <span>سند قبض</span>
          </Button>

          <Button
            type="button"
            variant="outline-danger"
            size="sm"
            className="h-5.5 px-0.5 text-[9px] font-bold cursor-pointer whitespace-nowrap"
            onClick={() =>
              openModal('unifiedTransaction', {
                title: 'سند صرف',
                defaultFromCardType: 'treasury',
                defaultFromAccountId: accountIdStr,
                defaultToCardType: 'client',
                lockDirection: false,
              })
            }
          >
            <span>سند صرف</span>
          </Button>

          <Button
            type="button"
            variant="outline-secondary"
            size="sm"
            className="h-5.5 px-0.5 text-[9px] font-bold cursor-pointer whitespace-nowrap"
            onClick={() =>
              openModal('unifiedTransaction', {
                title: 'تسوية قبض',
                defaultFromCardType: 'settlement',
                defaultToCardType: 'treasury',
                defaultToAccountId: accountIdStr,
                lockDirection: false,
              })
            }
          >
            <span>تسوية قبض</span>
          </Button>

          <Button
            type="button"
            variant="outline-secondary"
            size="sm"
            className="h-5.5 px-0.5 text-[9px] font-bold cursor-pointer whitespace-nowrap"
            onClick={() =>
              openModal('unifiedTransaction', {
                title: 'تسوية صرف',
                defaultFromCardType: 'treasury',
                defaultFromAccountId: accountIdStr,
                defaultToCardType: 'settlement',
                lockDirection: false,
              })
            }
          >
            <span>تسوية صرف</span>
          </Button>
        </div>
      </div>

      {/* Pie Chart with amounts and percentages in legend */}
      <PieChartWidget
        data={chartData}
        size={140}
        showLegend={true}
      />
    </div>
  );
};

export default TreasurySubReportSection;