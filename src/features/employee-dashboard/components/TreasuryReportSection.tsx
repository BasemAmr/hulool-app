import React from 'react';
import { PieChartWidget, type PieSegment } from './PieChartWidget';
import { Spinner } from '@/shared/ui/shadcn/spinner';
import type {
  TreasuryReport,
  ReportPeriod,
} from '@/features/employee-dashboard/api/employeeDashboardQueries';

interface TreasuryReportSectionProps {
  report?: TreasuryReport;
  isLoading: boolean;
  filterMode: ReportPeriod;
  onFilterChange: (mode: ReportPeriod) => void;
}

// Semantic CSS tokens auto-adjusting for light & dark mode
const PIE_COLORS: string[] = [
  'var(--token-chart-1)',
  'var(--token-chart-2)',
  'var(--token-chart-3)',
  'var(--token-chart-4)',
  'var(--token-chart-5)',
];

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n) + ' ر.س';

export const TreasuryReportSection: React.FC<TreasuryReportSectionProps> = ({
  report,
  isLoading,
  filterMode,
  onFilterChange,
}) => {
  if (isLoading && !report) {
    return (
      <div className="bg-card border border-border rounded-xl p-3 shadow-sm flex items-center justify-center py-8">
        <Spinner />
      </div>
    );
  }

  if (!report || report.accounts.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-3 shadow-sm">
        <div className="flex items-center gap-1.5 pb-2 border-b border-border">
          <h3 className="text-sm font-bold text-text-primary">تقرير الخزينة والبنوك</h3>
        </div>
        <div className="py-6 text-center text-xs text-text-secondary">لا توجد حسابات</div>
      </div>
    );
  }

  const { totals, accounts } = report;

  const chartData: PieSegment[] = accounts.map((acc, i) => ({
    id: String(acc.id),
    label: acc.name,
    value: Math.max(0, acc.balance),
    color: PIE_COLORS[i % PIE_COLORS.length],
    formattedValue: fmt(acc.balance)
  }));

  return (
    <div className="bg-card border border-border rounded-xl p-3.5 shadow-xs space-y-3">
      {/* Header & Filter Bar - Minimal */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-border-default">
        <h3 className="text-sm font-bold text-text-primary truncate">تقرير الخزينة والبنوك</h3>
        <select
          value={filterMode}
          onChange={(e) => onFilterChange(e.target.value as ReportPeriod)}
          className="bg-bg-surface text-xs font-bold text-text-primary border border-border-default rounded-md px-2 py-1 focus:outline-none cursor-pointer"
        >
          <option value="current_month">الشهر الحالي</option>
          <option value="all">جميع البيانات</option>
        </select>
      </div>

      {/* Minimal Professional Metric Cards (Matching User Image 2) - NO ICONS */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-lg border border-border-default bg-bg-surface text-center">
          <div className="text-sm font-extrabold text-status-success-text dir-ltr">
            {fmt(totals.balance)}
          </div>
          <div className="text-[11px] font-bold text-text-secondary mt-1">
            إجمالي الرصيد
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border-default bg-bg-surface text-center">
          <div className="text-sm font-extrabold text-status-danger-text dir-ltr">
            {fmt(totals.spent)}
          </div>
          <div className="text-[11px] font-bold text-text-secondary mt-1">
            إجمالي الصرف
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border-default bg-bg-surface text-center">
          <div className="text-sm font-extrabold text-status-info-text dir-ltr">
            {fmt(totals.remaining)}
          </div>
          <div className="text-[11px] font-bold text-text-secondary mt-1">
            المتبقي
          </div>
        </div>
      </div>

      {/* Full Pie Chart with Side Legend */}
      <div className="pt-2">
        <PieChartWidget
          data={chartData}
          size={145}
          showLegend={true}
        />
      </div>

      {/* Account Details Breakdown - Minimal Cards */}
      <div className="space-y-1.5 pt-1">
        {accounts.map((acc, i) => {
          const color = PIE_COLORS[i % PIE_COLORS.length];
          return (
            <div
              key={acc.id}
              className="p-2 rounded-md border border-border-default bg-bg-surface hover:bg-bg-surface-hover transition-colors"
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-bold text-text-primary truncate">{acc.name}</span>
                </div>
                <span className="font-extrabold text-text-primary">{fmt(acc.balance)}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-text-secondary pr-4 pt-1 border-t border-border-default">
                <span>صرف: <strong className="text-status-danger-text">{fmt(acc.spent)}</strong></span>
                <span>المتبقي: <strong className="text-status-success-text">{fmt(acc.remaining)}</strong></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TreasuryReportSection;
