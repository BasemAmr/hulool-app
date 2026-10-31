import React, { useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { useGetAdminReports } from '../api/dashboardQueries';
import type { AdminTreasuryReportItem } from '../api/dashboardQueries';
import { PieChartWidget, type PieSegment } from '@/features/employee-dashboard/components/PieChartWidget';
import { Spinner } from '@/shared/ui/shadcn/spinner';
import { useModalStore } from '@/shared/stores/modalStore';
import {
  buildSettlementQabdPreset,
  buildSettlementSarfPreset,
} from '@/features/financials/utils/settlementPresets';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { arSA } from 'date-fns/locale';

// High-contrast, calibrated chart colors
const COLOR_QABDH = '#10b981'; // emerald
const COLOR_SARF = '#f43f5e';  // rose
const COLOR_BALANCE = '#38bdf8'; // sky

const TASK_PIE_COLORS = {
  processing: '#38bdf8', // sky — قيد المعالجة
  completed_unpaid: '#f59e0b', // amber — مكتملة غير مدفوعة
  completed_paid: '#10b981', // emerald — المنجزة
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n) + ' ر.س';

function toISODate(date: Date | null): string {
  if (!date) return '';
  return date.toLocaleDateString('en-CA');
}

type PeriodType = 'current_month' | 'all' | 'custom';

export const AdminReportsPanel: React.FC = () => {
  const openModal = useModalStore((state) => state.openModal);

  // --- Independent Filter States per Card ---
  const [cashboxPeriod, setCashboxPeriod] = useState<PeriodType>(() => {
    return (localStorage.getItem('admin-dashboard-cashbox-period') as PeriodType) || 'current_month';
  });
  const [cashboxStartDate, setCashboxStartDate] = useState<string>('');
  const [cashboxEndDate, setCashboxEndDate] = useState<string>('');

  const [bankPeriod, setBankPeriod] = useState<PeriodType>(() => {
    return (localStorage.getItem('admin-dashboard-bank-period') as PeriodType) || 'current_month';
  });
  const [bankStartDate, setBankStartDate] = useState<string>('');
  const [bankEndDate, setBankEndDate] = useState<string>('');

  const [tasksPeriod, setTasksPeriod] = useState<PeriodType>(() => {
    return (localStorage.getItem('admin-dashboard-tasks-period') as PeriodType) || 'current_month';
  });
  const [tasksStartDate, setTasksStartDate] = useState<string>('');
  const [tasksEndDate, setTasksEndDate] = useState<string>('');

  // --- Persist Selected Accounts across sessions/refreshes ---
  const [selectedCashboxId, setSelectedCashboxId] = useState<string>(() => {
    return localStorage.getItem('admin-dashboard-selected-cashbox-id') || 'all';
  });

  const [selectedBankId, setSelectedBankId] = useState<string>(() => {
    return localStorage.getItem('admin-dashboard-selected-bank-id') || 'all';
  });

  const handleCashboxChange = (id: string) => {
    setSelectedCashboxId(id);
    localStorage.setItem('admin-dashboard-selected-cashbox-id', id);
  };

  const handleBankChange = (id: string) => {
    setSelectedBankId(id);
    localStorage.setItem('admin-dashboard-selected-bank-id', id);
  };

  const handleCashboxPeriodChange = (p: PeriodType) => {
    setCashboxPeriod(p);
    localStorage.setItem('admin-dashboard-cashbox-period', p);
  };

  const handleBankPeriodChange = (p: PeriodType) => {
    setBankPeriod(p);
    localStorage.setItem('admin-dashboard-bank-period', p);
  };

  const handleTasksPeriodChange = (p: PeriodType) => {
    setTasksPeriod(p);
    localStorage.setItem('admin-dashboard-tasks-period', p);
  };

  const { data, isLoading } = useGetAdminReports({
    cashbox_period: cashboxPeriod,
    cashbox_start_date: cashboxPeriod === 'custom' ? cashboxStartDate : undefined,
    cashbox_end_date: cashboxPeriod === 'custom' ? cashboxEndDate : undefined,

    bank_period: bankPeriod,
    bank_start_date: bankPeriod === 'custom' ? bankStartDate : undefined,
    bank_end_date: bankPeriod === 'custom' ? bankEndDate : undefined,

    tasks_period: tasksPeriod,
    tasks_start_date: tasksPeriod === 'custom' ? tasksStartDate : undefined,
    tasks_end_date: tasksPeriod === 'custom' ? tasksEndDate : undefined,
  });

  // --- Card 1 Calculations: Cashbox & Others ---
  const cashboxAccounts = data?.cashbox_report.accounts ?? [];
  const selectedCashboxAccount: AdminTreasuryReportItem | null =
    selectedCashboxId !== 'all'
      ? cashboxAccounts.find((a) => String(a.id) === selectedCashboxId) ?? null
      : null;

  const cashboxQabdh = selectedCashboxAccount
    ? selectedCashboxAccount.qabdh
    : (data?.cashbox_report.total_qabdh ?? 0);
  const cashboxSarf = selectedCashboxAccount
    ? selectedCashboxAccount.sarf
    : (data?.cashbox_report.total_sarf ?? 0);
  const cashboxBalance = selectedCashboxAccount
    ? selectedCashboxAccount.balance
    : (data?.cashbox_report.total_balance ?? 0);

  const cashboxAllZero = cashboxQabdh === 0 && cashboxSarf === 0 && cashboxBalance === 0;
  const cashboxChartData: PieSegment[] = cashboxAllZero
    ? [{ id: 'empty', label: 'لا توجد حركات', value: 1, color: '#64748b', formattedValue: '' }]
    : ([
        { id: 'qabdh', label: 'إجمالي المقبوضات', value: Math.max(0, cashboxQabdh), color: COLOR_QABDH, formattedValue: fmt(cashboxQabdh) },
        { id: 'sarf', label: 'إجمالي المصروفات', value: Math.max(0, cashboxSarf), color: COLOR_SARF, formattedValue: fmt(cashboxSarf) },
        { id: 'balance', label: 'الرصيد', value: Math.max(0, cashboxBalance), color: COLOR_BALANCE, formattedValue: fmt(cashboxBalance) },
      ] as PieSegment[]).filter((s) => s.value > 0);

  // --- Card 2 Calculations: Banks ---
  const bankAccounts = data?.bank_report.accounts ?? [];
  const selectedBankAccount: AdminTreasuryReportItem | null =
    selectedBankId !== 'all'
      ? bankAccounts.find((a) => String(a.id) === selectedBankId) ?? null
      : null;

  const bankQabdh = selectedBankAccount
    ? selectedBankAccount.qabdh
    : (data?.bank_report.total_qabdh ?? 0);
  const bankSarf = selectedBankAccount
    ? selectedBankAccount.sarf
    : (data?.bank_report.total_sarf ?? 0);
  const bankBalance = selectedBankAccount
    ? selectedBankAccount.balance
    : (data?.bank_report.total_balance ?? 0);

  const bankAllZero = bankQabdh === 0 && bankSarf === 0 && bankBalance === 0;
  const bankChartData: PieSegment[] = bankAllZero
    ? [{ id: 'empty', label: 'لا توجد حركات', value: 1, color: '#64748b', formattedValue: '' }]
    : ([
        { id: 'qabdh', label: 'إجمالي المقبوضات', value: Math.max(0, bankQabdh), color: COLOR_QABDH, formattedValue: fmt(bankQabdh) },
        { id: 'sarf', label: 'إجمالي المصروفات', value: Math.max(0, bankSarf), color: COLOR_SARF, formattedValue: fmt(bankSarf) },
        { id: 'balance', label: 'الرصيد', value: Math.max(0, bankBalance), color: COLOR_BALANCE, formattedValue: fmt(bankBalance) },
      ] as PieSegment[]).filter((s) => s.value > 0);

  // --- Card 3 Calculations: Tasks ---
  const tasksReport = data?.tasks_report;
  const totalCount = tasksReport?.total.count || 0;

  const tasksChartData: PieSegment[] = tasksReport
    ? [
        {
          id: 'processing',
          label: 'المهام قيد المعالجة',
          value: tasksReport.processing.count,
          color: TASK_PIE_COLORS.processing,
          formattedValue: `${tasksReport.processing.count} مهمة (${fmt(tasksReport.processing.amount)})`,
        },
        {
          id: 'completed_unpaid',
          label: 'المهام مكتملة غير مدفوعة',
          value: tasksReport.completed_unpaid.count,
          color: TASK_PIE_COLORS.completed_unpaid,
          formattedValue: `${tasksReport.completed_unpaid.count} مهمة (${fmt(tasksReport.completed_unpaid.amount)})`,
        },
        {
          id: 'completed_paid',
          label: 'المهام المنجزة',
          value: tasksReport.completed_paid.count,
          color: TASK_PIE_COLORS.completed_paid,
          formattedValue: `${tasksReport.completed_paid.count} مهمة (${fmt(tasksReport.completed_paid.amount)})`,
        },
      ].filter((s) => s.value > 0)
    : [];

  const displayTasksChartData: PieSegment[] = totalCount === 0
    ? [{ id: 'empty', label: 'لا توجد مهام', value: 1, color: '#64748b', formattedValue: '' }]
    : tasksChartData;

  const cashboxTargetIdStr = selectedCashboxAccount ? String(selectedCashboxAccount.id) : undefined;
  const bankTargetIdStr = selectedBankAccount ? String(selectedBankAccount.id) : undefined;

  return (
    <div className="flex flex-col gap-3.5 h-full overflow-y-auto pr-0.5 dir-rtl" dir="rtl">
      {isLoading && !data && (
        <div
          style={{
            backgroundImage: 'var(--token-report-card-bg)',
            borderColor: 'var(--token-report-card-border)',
          }}
          className="rounded-2xl p-6 flex justify-center items-center shadow-xs border"
        >
          <Spinner />
        </div>
      )}

      {/* ── CARD 1: تقرير الصناديق والحسابات الأخرى ───────────────────── */}
      <div
        style={{
          backgroundImage: 'var(--token-report-card-bg)',
          borderColor: 'var(--token-report-card-border)',
          boxShadow: 'var(--token-report-card-shadow)',
        }}
        className="rounded-2xl border flex flex-col transition-all overflow-hidden"
      >
        {/* Compact Card Header */}
        <div
          style={{
            backgroundImage: 'var(--token-report-card-header-bg)',
            borderBottomColor: 'var(--token-report-card-border)',
          }}
          className="px-3.5 py-2.5 border-b flex items-center justify-between gap-2 backdrop-blur-xs"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 shadow-xs" />
            <h3
              style={{ color: 'var(--token-report-card-title)' }}
              className="text-xs font-bold truncate tracking-tight"
            >
              تقرير الصناديق والحسابات الأخرى
            </h3>
          </div>

          {/* Card-specific Period Filter */}
          <select
            value={cashboxPeriod}
            onChange={(e) => handleCashboxPeriodChange(e.target.value as PeriodType)}
            style={{
              background: 'var(--token-report-card-input-bg)',
              borderColor: 'var(--token-report-card-input-border)',
              color: 'var(--token-report-card-text)',
            }}
            className="border rounded-lg px-2.5 py-1 text-[11px] font-bold focus:outline-none cursor-pointer shadow-2xs transition-colors"
          >
            <option value="current_month">الشهر الحالي</option>
            <option value="all">جميع البيانات</option>
            <option value="custom">فترة مخصصة</option>
          </select>
        </div>

        {/* Custom Date Range Picker for Card 1 */}
        {cashboxPeriod === 'custom' && (
          <div
            style={{
              backgroundImage: 'var(--token-report-card-header-bg)',
              borderBottomColor: 'var(--token-report-card-border)',
            }}
            className="px-3 py-2 border-b grid grid-cols-2 gap-2"
          >
            <div>
              <DatePicker
                selected={cashboxStartDate ? new Date(cashboxStartDate) : null}
                onChange={(date: Date | null) => setCashboxStartDate(toISODate(date))}
                dateFormat="yyyy-MM-dd"
                placeholderText="من تاريخ"
                locale={arSA}
                className="w-full h-7 px-2 text-xs rounded-md border text-right font-medium"
              />
            </div>
            <div>
              <DatePicker
                selected={cashboxEndDate ? new Date(cashboxEndDate) : null}
                onChange={(date: Date | null) => setCashboxEndDate(toISODate(date))}
                dateFormat="yyyy-MM-dd"
                placeholderText="إلى تاريخ"
                locale={arSA}
                className="w-full h-7 px-2 text-xs rounded-md border text-right font-medium"
              />
            </div>
          </div>
        )}

        {/* Card Body */}
        <div className="p-3.5 space-y-3 flex-1 flex flex-col justify-between">
          {/* Account Selector */}
          <div>
            <select
              value={selectedCashboxId}
              onChange={(e) => handleCashboxChange(e.target.value)}
              style={{
                background: 'var(--token-report-card-input-bg)',
                borderColor: 'var(--token-report-card-input-border)',
                color: 'var(--token-report-card-text)',
              }}
              className="w-full border rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none cursor-pointer shadow-2xs transition-colors"
            >
              <option value="all">جميع الصناديق والحسابات الأخرى (الإجمالي)</option>
              {cashboxAccounts.map((a) => (
                <option key={a.id} value={String(a.id)}>
                  {a.name} ({fmt(a.balance)})
                </option>
              ))}
            </select>
          </div>

          {/* 4 Action Buttons for Admin (سند قبض, سند صرف, تسوية قبض, تسوية صرف) */}
          <div className="grid grid-cols-4 gap-1.5">
            <button
              type="button"
              style={{
                backgroundImage: 'var(--token-report-btn-qabd-bg)',
                color: 'var(--token-report-btn-qabd-text)',
                borderColor: 'var(--token-report-btn-qabd-border)',
              }}
              className="h-7.5 px-1.5 rounded-lg text-[11px] font-bold border transition-all flex items-center justify-center cursor-pointer shadow-2xs active:scale-98"
              onClick={() =>
                openModal('unifiedTransaction', {
                  title: 'سند قبض',
                  defaultFromCardType: 'client',
                  defaultToCardType: cashboxTargetIdStr ? 'treasury' : undefined,
                  defaultToAccountId: cashboxTargetIdStr,
                  lockDirection: false,
                })
              }
              title="تسجيل سند قبض"
            >
              <span>سند قبض</span>
            </button>

            <button
              type="button"
              style={{
                backgroundImage: 'var(--token-report-btn-sarf-bg)',
                color: 'var(--token-report-btn-sarf-text)',
                borderColor: 'var(--token-report-btn-sarf-border)',
              }}
              className="h-7.5 px-1.5 rounded-lg text-[11px] font-bold border transition-all flex items-center justify-center cursor-pointer shadow-2xs active:scale-98"
              onClick={() =>
                openModal('unifiedTransaction', {
                  title: 'سند صرف',
                  defaultFromCardType: cashboxTargetIdStr ? 'treasury' : undefined,
                  defaultFromAccountId: cashboxTargetIdStr,
                  defaultToCardType: 'client',
                  lockDirection: false,
                })
              }
              title="تسجيل سند صرف"
            >
              <span>سند صرف</span>
            </button>

            <button
              type="button"
              style={{
                backgroundImage: 'var(--token-report-btn-settle-qabd-bg)',
                color: 'var(--token-report-btn-settle-qabd-text)',
                borderColor: 'var(--token-report-btn-settle-qabd-border)',
              }}
              className="h-7.5 px-1.5 rounded-lg text-[11px] font-bold border transition-all flex items-center justify-center cursor-pointer shadow-2xs active:scale-98"
              onClick={() =>
                openModal('unifiedTransaction', buildSettlementQabdPreset({ kind: 'treasury', id: cashboxTargetIdStr }))
              }
              title="تسجيل تسوية قبض"
            >
              <span>تسوية قبض</span>
            </button>

            <button
              type="button"
              style={{
                backgroundImage: 'var(--token-report-btn-settle-sarf-bg)',
                color: 'var(--token-report-btn-settle-sarf-text)',
                borderColor: 'var(--token-report-btn-settle-sarf-border)',
              }}
              className="h-7.5 px-1.5 rounded-lg text-[11px] font-bold border transition-all flex items-center justify-center cursor-pointer shadow-2xs active:scale-98"
              onClick={() =>
                openModal('unifiedTransaction', buildSettlementSarfPreset({ kind: 'treasury', id: cashboxTargetIdStr }))
              }
              title="تسجيل تسوية صرف"
            >
              <span>تسوية صرف</span>
            </button>
          </div>

          {/* Focused View of Report Numbers & Chart */}
          <div className="pt-1">
            <PieChartWidget data={cashboxChartData} size={135} showLegend={true} />
          </div>
        </div>
      </div>

      {/* ── CARD 2: تقرير البنوك ────────────────────────────────────────── */}
      <div
        style={{
          backgroundImage: 'var(--token-report-card-bg)',
          borderColor: 'var(--token-report-card-border)',
          boxShadow: 'var(--token-report-card-shadow)',
        }}
        className="rounded-2xl border flex flex-col transition-all overflow-hidden"
      >
        {/* Compact Header with Independent Filter */}
        <div
          style={{
            backgroundImage: 'var(--token-report-card-header-bg)',
            borderBottomColor: 'var(--token-report-card-border)',
          }}
          className="px-3.5 py-2.5 border-b flex items-center justify-between gap-2 backdrop-blur-xs"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0 shadow-xs" />
            <h3
              style={{ color: 'var(--token-report-card-title)' }}
              className="text-xs font-bold truncate tracking-tight"
            >
              تقرير البنوك
            </h3>
          </div>

          {/* Card-specific Period Filter */}
          <select
            value={bankPeriod}
            onChange={(e) => handleBankPeriodChange(e.target.value as PeriodType)}
            style={{
              background: 'var(--token-report-card-input-bg)',
              borderColor: 'var(--token-report-card-input-border)',
              color: 'var(--token-report-card-text)',
            }}
            className="border rounded-lg px-2.5 py-1 text-[11px] font-bold focus:outline-none cursor-pointer shadow-2xs transition-colors"
          >
            <option value="current_month">الشهر الحالي</option>
            <option value="all">جميع البيانات</option>
            <option value="custom">فترة مخصصة</option>
          </select>
        </div>

        {/* Custom Date Range Picker for Card 2 */}
        {bankPeriod === 'custom' && (
          <div
            style={{
              backgroundImage: 'var(--token-report-card-header-bg)',
              borderBottomColor: 'var(--token-report-card-border)',
            }}
            className="px-3 py-2 border-b grid grid-cols-2 gap-2"
          >
            <div>
              <DatePicker
                selected={bankStartDate ? new Date(bankStartDate) : null}
                onChange={(date: Date | null) => setBankStartDate(toISODate(date))}
                dateFormat="yyyy-MM-dd"
                placeholderText="من تاريخ"
                locale={arSA}
                className="w-full h-7 px-2 text-xs rounded-md border text-right font-medium"
              />
            </div>
            <div>
              <DatePicker
                selected={bankEndDate ? new Date(bankEndDate) : null}
                onChange={(date: Date | null) => setBankEndDate(toISODate(date))}
                dateFormat="yyyy-MM-dd"
                placeholderText="إلى تاريخ"
                locale={arSA}
                className="w-full h-7 px-2 text-xs rounded-md border text-right font-medium"
              />
            </div>
          </div>
        )}

        {/* Card Body */}
        <div className="p-3.5 space-y-3 flex-1 flex flex-col justify-between">
          {/* Account Selector */}
          <div>
            <select
              value={selectedBankId}
              onChange={(e) => handleBankChange(e.target.value)}
              style={{
                background: 'var(--token-report-card-input-bg)',
                borderColor: 'var(--token-report-card-input-border)',
                color: 'var(--token-report-card-text)',
              }}
              className="w-full border rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none cursor-pointer shadow-2xs transition-colors"
            >
              <option value="all">جميع البنوك (الإجمالي)</option>
              {bankAccounts.map((a) => (
                <option key={a.id} value={String(a.id)}>
                  {a.name} ({fmt(a.balance)})
                </option>
              ))}
            </select>
          </div>

          {/* 4 Action Buttons for Admin */}
          <div className="grid grid-cols-4 gap-1.5">
            <button
              type="button"
              style={{
                backgroundImage: 'var(--token-report-btn-qabd-bg)',
                color: 'var(--token-report-btn-qabd-text)',
                borderColor: 'var(--token-report-btn-qabd-border)',
              }}
              className="h-7.5 px-1.5 rounded-lg text-[11px] font-bold border transition-all flex items-center justify-center cursor-pointer shadow-2xs active:scale-98"
              onClick={() =>
                openModal('unifiedTransaction', {
                  title: 'سند قبض',
                  defaultFromCardType: 'client',
                  defaultToCardType: 'bank',
                  defaultToAccountId: bankTargetIdStr,
                  lockDirection: false,
                })
              }
              title="تسجيل سند قبض بنكي"
            >
              <span>سند قبض</span>
            </button>

            <button
              type="button"
              style={{
                backgroundImage: 'var(--token-report-btn-sarf-bg)',
                color: 'var(--token-report-btn-sarf-text)',
                borderColor: 'var(--token-report-btn-sarf-border)',
              }}
              className="h-7.5 px-1.5 rounded-lg text-[11px] font-bold border transition-all flex items-center justify-center cursor-pointer shadow-2xs active:scale-98"
              onClick={() =>
                openModal('unifiedTransaction', {
                  title: 'سند صرف',
                  defaultFromCardType: 'bank',
                  defaultFromAccountId: bankTargetIdStr,
                  defaultToCardType: 'client',
                  lockDirection: false,
                })
              }
              title="تسجيل سند صرف بنكي"
            >
              <span>سند صرف</span>
            </button>

            <button
              type="button"
              style={{
                backgroundImage: 'var(--token-report-btn-settle-qabd-bg)',
                color: 'var(--token-report-btn-settle-qabd-text)',
                borderColor: 'var(--token-report-btn-settle-qabd-border)',
              }}
              className="h-7.5 px-1.5 rounded-lg text-[11px] font-bold border transition-all flex items-center justify-center cursor-pointer shadow-2xs active:scale-98"
              onClick={() =>
                openModal('unifiedTransaction', buildSettlementQabdPreset({ kind: 'treasury', id: bankTargetIdStr }))
              }
              title="تسجيل تسوية قبض بنكية"
            >
              <span>تسوية قبض</span>
            </button>

            <button
              type="button"
              style={{
                backgroundImage: 'var(--token-report-btn-settle-sarf-bg)',
                color: 'var(--token-report-btn-settle-sarf-text)',
                borderColor: 'var(--token-report-btn-settle-sarf-border)',
              }}
              className="h-7.5 px-1.5 rounded-lg text-[11px] font-bold border transition-all flex items-center justify-center cursor-pointer shadow-2xs active:scale-98"
              onClick={() =>
                openModal('unifiedTransaction', buildSettlementSarfPreset({ kind: 'treasury', id: bankTargetIdStr }))
              }
              title="تسجيل تسوية صرف بنكية"
            >
              <span>تسوية صرف</span>
            </button>
          </div>

          {/* Focused View of Report Numbers & Chart */}
          <div className="pt-1">
            <PieChartWidget data={bankChartData} size={135} showLegend={true} />
          </div>
        </div>
      </div>

      {/* ── CARD 3: تقرير المهام الشامل ───────────────────────────────── */}
      <div
        style={{
          backgroundImage: 'var(--token-report-card-bg)',
          borderColor: 'var(--token-report-card-border)',
          boxShadow: 'var(--token-report-card-shadow)',
        }}
        className="rounded-2xl border flex flex-col transition-all overflow-hidden"
      >
        {/* Compact Header with Independent Filter & Add Action */}
        <div
          style={{
            backgroundImage: 'var(--token-report-card-header-bg)',
            borderBottomColor: 'var(--token-report-card-border)',
          }}
          className="px-3.5 py-2.5 border-b flex items-center justify-between gap-2 backdrop-blur-xs"
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

          <div className="flex items-center gap-1.5">
            <select
              value={tasksPeriod}
              onChange={(e) => handleTasksPeriodChange(e.target.value as PeriodType)}
              style={{
                background: 'var(--token-report-card-input-bg)',
                borderColor: 'var(--token-report-card-input-border)',
                color: 'var(--token-report-card-text)',
              }}
              className="border rounded-lg px-2.5 py-1 text-[11px] font-bold focus:outline-none cursor-pointer shadow-2xs transition-colors"
            >
              <option value="current_month">الشهر الحالي</option>
              <option value="all">جميع البيانات</option>
              <option value="custom">فترة مخصصة</option>
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

        {/* Custom Date Range Picker for Card 3 */}
        {tasksPeriod === 'custom' && (
          <div
            style={{
              backgroundImage: 'var(--token-report-card-header-bg)',
              borderBottomColor: 'var(--token-report-card-border)',
            }}
            className="px-3 py-2 border-b grid grid-cols-2 gap-2"
          >
            <div>
              <DatePicker
                selected={tasksStartDate ? new Date(tasksStartDate) : null}
                onChange={(date: Date | null) => setTasksStartDate(toISODate(date))}
                dateFormat="yyyy-MM-dd"
                placeholderText="من تاريخ"
                locale={arSA}
                className="w-full h-7 px-2 text-xs rounded-md border text-right font-medium"
              />
            </div>
            <div>
              <DatePicker
                selected={tasksEndDate ? new Date(tasksEndDate) : null}
                onChange={(date: Date | null) => setTasksEndDate(toISODate(date))}
                dateFormat="yyyy-MM-dd"
                placeholderText="إلى تاريخ"
                locale={arSA}
                className="w-full h-7 px-2 text-xs rounded-md border text-right font-medium"
              />
            </div>
          </div>
        )}

        {/* Card Body */}
        <div className="p-3.5 space-y-3 flex-1 flex flex-col justify-between">
          <div className="pt-1">
            <PieChartWidget data={displayTasksChartData} size={135} showLegend={true} />
          </div>

          {/* Clean, Non-glowing Metrics in Light & Dark */}
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
                {fmt(tasksReport?.total_task_cost ?? 0)}
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
              <span className="font-bold">الربح المتوقع / المحقق:</span>
              <span className="font-extrabold dir-ltr tabular-nums">{fmt(tasksReport?.estimated_profit ?? 0)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminReportsPanel;
