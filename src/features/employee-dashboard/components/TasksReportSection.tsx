import React from 'react';
import { PlusCircle } from 'lucide-react';
import { PieChartWidget, type PieSegment } from './PieChartWidget';
import { Spinner } from '@/shared/ui/shadcn/spinner';
import { useModalStore } from '@/shared/stores/modalStore';
import type { TasksReport, ReportPeriod } from '../api/employeeDashboardQueries';

interface TasksReportSectionProps {
  report?: TasksReport;
  isLoading: boolean;
  filterMode: ReportPeriod;
  onFilterChange: (mode: ReportPeriod) => void;
}

// Semantic chart tokens — matches color convention
const TASK_PIE_COLORS = {
  processing:       'var(--token-chart-5)',  // sky blue  — قيد المعالجة
  completed_unpaid: 'var(--token-chart-3)',  // amber     — مكتملة غير منجزة
  completed_paid:   'var(--token-chart-1)',  // teal/green — المنجزة
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n) + ' ر.س';

export const TasksReportSection: React.FC<TasksReportSectionProps> = ({
  report,
  isLoading,
  filterMode,
  onFilterChange,
}) => {
  const openModal = useModalStore((state) => state.openModal);

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
        <div className="pb-2 border-b border-border">
          <h3 className="text-sm font-bold text-text-primary">تقرير المهام</h3>
        </div>
        <div className="py-6 text-center text-xs text-text-secondary">لا توجد بيانات</div>
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
      label: 'المهام مكتملة',
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
    ? [{ id: 'empty', label: 'لا توجد مهام', value: 1, color: 'var(--token-border-default)', formattedValue: '' }]
    : chartData;

  return (
    <div className="bg-card border border-border rounded-xl p-3.5 shadow-xs space-y-2.5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-border-default">
        {/* Title as action button to add a task */}
        <button
          type="button"
          className="flex items-center gap-1.5 text-sm font-bold text-primary hover:text-primary/80 transition-colors cursor-pointer"
          onClick={() => openModal('taskForm', {})}
        >
          <PlusCircle size={15} />
          <span>إضافة مهمة</span>
        </button>

        {/* Period filter + total count */}
        <div className="flex items-center gap-1.5">
          <select
            value={filterMode}
            onChange={(e) => onFilterChange(e.target.value as ReportPeriod)}
            className="bg-bg-surface text-xs font-bold text-text-primary border border-border-default rounded-md px-2 py-1 focus:outline-none cursor-pointer"
          >
            <option value="current_month">الشهر الحالي</option>
            <option value="all">جميع البيانات</option>
          </select>
          {totalCount > 0 && (
            <span className="text-xs font-bold text-text-secondary bg-muted px-2 py-1 rounded-md flex-shrink-0">
              {totalCount}
            </span>
          )}
        </div>
      </div>

      {/* Pie Chart with side legend showing count + amount and percentage */}
      <PieChartWidget
        data={displayChartData}
        size={140}
        showLegend={true}
      />

      {/* Employee Profit & Task Cost Stats — below pie chart */}
      <div className="space-y-1.5 pt-1 border-t border-border-default">
        {/* اجمالي مبالغ المهام: */}
        <div className="flex items-center justify-between text-xs px-2 py-1.5 rounded-md bg-bg-surface border border-border-default">
          <span className="font-bold text-text-secondary">اجمالي مبالغ المهام:</span>
          <span className="font-extrabold text-text-primary dir-ltr">{fmt(total_task_cost)}</span>
        </div>

        {/* الربح المتوقع */}
        <div className="flex items-center justify-between text-xs px-2 py-1.5 rounded-md bg-status-success-bg border border-status-success-border">
          <span className="font-bold text-status-success-text">الربح المتوقع</span>
          <span className="font-extrabold text-status-success-text dir-ltr">{fmt(estimated_profit)}</span>
        </div>
      </div>
    </div>
  );
};

export default TasksReportSection;