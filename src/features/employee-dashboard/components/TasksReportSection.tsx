import React from 'react';
import { PieChartWidget, type PieSegment } from './PieChartWidget';
import { Spinner } from '@/shared/ui/shadcn/spinner';
import type {
  TasksReport,
  ReportPeriod,
} from '@/features/employee-dashboard/api/employeeDashboardQueries';

interface TasksReportSectionProps {
  report?: TasksReport;
  isLoading: boolean;
  filterMode: ReportPeriod;
  onFilterChange: (mode: ReportPeriod) => void;
}

// Semantic CSS tokens for light & dark mode compatibility
const TASK_PIE_COLORS = {
  processing: 'var(--token-chart-1)',     // Teal
  completed_paid: 'var(--token-chart-3)', // Amber
  completed_unpaid: 'var(--token-chart-4)'// Rose
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n) + ' ر.س';

export const TasksReportSection: React.FC<TasksReportSectionProps> = ({
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

  if (!report) {
    return (
      <div className="bg-card border border-border rounded-xl p-3 shadow-sm">
        <div className="flex items-center gap-1.5 pb-2 border-b border-border">
          <h3 className="text-sm font-bold text-text-primary">تقرير حالة المهام</h3>
        </div>
        <div className="py-6 text-center text-xs text-text-secondary">لا توجد بيانات</div>
      </div>
    );
  }

  const { processing, completed_paid, completed_unpaid, total } = report;

  const totalCount = total.count || 0;

  const chartData: PieSegment[] = [
    {
      id: 'processing',
      label: 'قيد المعالجة',
      value: processing.count,
      color: TASK_PIE_COLORS.processing,
      formattedValue: `${processing.count} مهمة (${fmt(processing.amount)})`
    },
    {
      id: 'completed_paid',
      label: 'إنجاز مكتمل (مدفوع)',
      value: completed_paid.count,
      color: TASK_PIE_COLORS.completed_paid,
      formattedValue: `${completed_paid.count} مهمة (${fmt(completed_paid.amount)})`
    },
    {
      id: 'completed_unpaid',
      label: 'مكتمل غير مدفوع',
      value: completed_unpaid.count,
      color: TASK_PIE_COLORS.completed_unpaid,
      formattedValue: `${completed_unpaid.count} مهمة (${fmt(completed_unpaid.amount)})`
    },
  ];

  const buckets = [
    {
      key: 'processing',
      label: 'قيد المعالجة',
      count: processing.count,
      amount: processing.amount,
      textColor: 'text-status-info-text',
    },
    {
      key: 'completed_paid',
      label: 'إنجاز مكتمل',
      count: completed_paid.count,
      amount: completed_paid.amount,
      textColor: 'text-status-success-text',
    },
    {
      key: 'completed_unpaid',
      label: 'مكتمل غير مدفوع',
      count: completed_unpaid.count,
      amount: completed_unpaid.amount,
      textColor: 'text-status-warning-text',
    },
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-3.5 shadow-xs space-y-3">
      {/* Header & Filter Bar - Minimal */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-border-default">
        <h3 className="text-sm font-bold text-text-primary truncate">تقرير حالة المهام</h3>
        <div className="flex items-center gap-2">
          <select
            value={filterMode}
            onChange={(e) => onFilterChange(e.target.value as ReportPeriod)}
            className="bg-bg-surface text-xs font-bold text-text-primary border border-border-default rounded-md px-2 py-1 focus:outline-none cursor-pointer"
          >
            <option value="current_month">الشهر الحالي</option>
            <option value="all">جميع البيانات</option>
          </select>
          <span className="text-xs font-bold text-text-secondary bg-muted px-2 py-1 rounded-md">
            إجمالي {totalCount}
          </span>
        </div>
      </div>

      {/* Minimal Professional Metric Cards (Matching User Image 2) - NO ICONS */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {buckets.map((b) => (
          <div key={b.key} className="p-3 rounded-lg border border-border-default bg-bg-surface">
            <div className={`text-sm font-extrabold ${b.textColor}`}>
              {b.count}
            </div>
            <div className="text-[11px] font-bold text-text-secondary mt-1 truncate">
              {b.label}
            </div>
          </div>
        ))}
      </div>

      {/* Full Pie Chart with Side Legend */}
      <div className="pt-2">
        <PieChartWidget
          data={chartData}
          size={145}
          showLegend={true}
        />
      </div>

      {/* Legend Cards */}
      <div className="space-y-1.5 pt-1">
        {chartData.map((seg) => {
          const pct = totalCount > 0 ? Math.round((seg.value / totalCount) * 100) : 0;
          const bucket = buckets.find((b) => b.key === seg.id);
          return (
            <div
              key={seg.id}
              className="p-2 rounded-md border border-border-default bg-bg-surface hover:bg-bg-surface-hover transition-colors"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="font-bold text-text-primary truncate">{seg.label}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ms-2">
                  <span className="font-extrabold text-text-primary">{seg.value} مهمة</span>
                  <span className="text-[10px] text-text-secondary font-bold">({pct}%)</span>
                </div>
              </div>
              <div className="text-[11px] text-text-secondary pr-4 pt-1 border-t border-border-default mt-1 flex justify-between">
                <span>المبلغ الإجمالي:</span>
                <strong className="text-text-primary">{fmt(bucket?.amount ?? 0)}</strong>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TasksReportSection;
