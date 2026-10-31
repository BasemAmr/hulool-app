import React from 'react';
import { PlusCircle } from 'lucide-react';
import { PieChartWidget, type PieSegment } from './PieChartWidget';
import { Spinner } from '@/shared/ui/shadcn/spinner';
import { useModalStore } from '@/shared/stores/modalStore';
import type { TasksReport, ReportPeriod } from '../api/employeeDashboardQueries';

// High-contrast, calibrated chart colors
const TASK_PIE_COLORS = {
  processing:       '#38bdf8',  // sky — قيد المعالجة
  completed_unpaid: '#f59e0b',  // amber — مكتملة غير مدفوعة
  completed_paid:   '#10b981',  // emerald — المنجزة
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n) + ' ر.س';

interface TasksReportSectionProps {
  report?: TasksReport;
  isLoading: boolean;
  filterMode: ReportPeriod;
  onFilterChange: (mode: ReportPeriod) => void;
}

export const TasksReportSection: React.FC<TasksReportSectionProps> = ({
  report,
  isLoading,
  filterMode,
  onFilterChange,
}) => {
  const openModal = useModalStore((state) => state.openModal);

  if (isLoading && !report) {
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

  if (!report) {
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
          className="pb-2 border-b"
        >
          <h3 style={{ color: 'var(--token-report-card-title)' }} className="text-xs font-bold">تقرير المهام</h3>
        </div>
        <div style={{ color: 'var(--token-report-card-subtext)' }} className="py-6 text-center text-xs">لا توجد بيانات</div>
      </div>
    );
  }

  const {
    processing,
    completed_paid,
    completed_unpaid,
    total,
    total_task_cost,
    estimated_profit,
  } = report;

  const totalCount = total.count || 0;

  const chartData: PieSegment[] = [
    {
      id: 'processing',
      label: 'المهام قيد المعالجة',
      value: processing.count,
      color: TASK_PIE_COLORS.processing,
      formattedValue: `${processing.count} مهمة (${fmt(processing.amount)})`,
    },
    {
      id: 'completed_unpaid',
      label: 'المهام مكتملة غير مدفوعة',
      value: completed_unpaid.count,
      color: TASK_PIE_COLORS.completed_unpaid,
      formattedValue: `${completed_unpaid.count} مهمة (${fmt(completed_unpaid.amount)})`,
    },
    {
      id: 'completed_paid',
      label: 'المهام المنجزة',
      value: completed_paid.count,
      color: TASK_PIE_COLORS.completed_paid,
      formattedValue: `${completed_paid.count} مهمة (${fmt(completed_paid.amount)})`,
    },
  ].filter((s) => s.value > 0);

  const allZero = totalCount === 0;
  const displayChartData: PieSegment[] = allZero
    ? [{ id: 'empty', label: 'لا توجد مهام', value: 1, color: '#64748b', formattedValue: '' }]
    : chartData;

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
          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 shadow-xs" />
          <h3
            style={{ color: 'var(--token-report-card-title)' }}
            className="text-xs font-bold truncate tracking-tight"
          >
            تقرير المهام
          </h3>
          <button
            type="button"
            className="flex items-center gap-1 text-[11px] font-bold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-md px-2 py-0.5 transition-all cursor-pointer shadow-2xs"
            onClick={() => openModal('taskForm', {})}
            title="إضافة مهمة جديدة"
          >
            <PlusCircle size={12} />
            <span>إضافة مهمة</span>
          </button>
        </div>

        {/* Period filter + total count */}
        <div className="flex items-center gap-1.5">
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
          {totalCount > 0 && (
            <span
              style={{
                background: 'var(--token-report-card-header-bg)',
                borderColor: 'var(--token-report-card-border)',
                color: 'var(--token-report-card-text)',
              }}
              className="text-[11px] font-mono font-bold border px-2 py-0.5 rounded-md tabular-nums"
            >
              {totalCount}
            </span>
          )}
        </div>
      </div>

      {/* 2. Body */}
      <div className="p-3.5 space-y-3 flex-1 flex flex-col justify-between">
        {/* Pie Chart */}
        <div className="pt-1">
          <PieChartWidget
            data={displayChartData}
            size={135}
            showLegend={true}
          />
        </div>

        {/* Metrics in Light & Dark */}
        <div
          style={{ borderTopColor: 'var(--token-report-card-border)' }}
          className="space-y-1.5 pt-2 border-t"
        >
          <div
            style={{
              backgroundImage: 'var(--token-report-card-header-bg)',
              borderColor: 'var(--token-report-card-border)',
            }}
            className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg border shadow-2xs"
          >
            <span
              style={{ color: 'var(--token-report-card-subtext)' }}
              className="font-bold"
            >
              إجمالي مبالغ المهام:
            </span>
            <span
              style={{ color: 'var(--token-report-card-title)' }}
              className="font-extrabold dir-ltr tabular-nums"
            >
              {fmt(total_task_cost)}
            </span>
          </div>

          <div
            style={{
              backgroundImage: 'var(--token-report-btn-qabd-bg)',
              borderColor: 'var(--token-report-btn-qabd-border)',
              color: 'var(--token-report-btn-qabd-text)',
            }}
            className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg border shadow-2xs"
          >
            <span className="font-bold">الربح المتوقع:</span>
            <span className="font-extrabold dir-ltr tabular-nums">{fmt(estimated_profit)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TasksReportSection;
