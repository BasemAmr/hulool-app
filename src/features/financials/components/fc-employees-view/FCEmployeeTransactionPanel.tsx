import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import apiClient from '@/api/client';

interface FCEmployeeTransactionPanelProps {
  employeeId: number;
  employeeName: string;
}

interface RawTransaction {
  date: string;
  description: string;
  debit: number;
  credit: number;
  running_balance: number;
}

interface DashboardApiResponse {
  opening_balance: { balance: number; total_debit: number; total_credit: number; description: string };
  transactions: RawTransaction[];
  summary: {
    period_debit: number;
    period_credit: number;
    closing_balance: number;
  };
}

interface DashboardData {
  opening_balance: number;
  opening_total_debit: number;
  opening_total_credit: number;
  transactions: RawTransaction[];
  total_debit: number;
  total_credit: number;
  closing_balance: number;
}

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 0 }).format(val);

const FCEmployeeTransactionPanel: React.FC<FCEmployeeTransactionPanelProps> = ({
  employeeId,
  employeeName,
}) => {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const { data: dashboardData, isLoading } = useQuery<DashboardData>({
    queryKey: ['fc', 'employee-dashboard', employeeId, selectedMonth, selectedYear],
    queryFn: async () => {
      const { data } = await apiClient.get<DashboardApiResponse>(
        `/employees/${employeeId}/dashboard`,
        { params: { month: selectedMonth, year: selectedYear } }
      );
      return {
        opening_balance: data.opening_balance.balance,
        opening_total_debit: data.opening_balance.total_debit,
        opening_total_credit: data.opening_balance.total_credit,
        transactions: data.transactions || [],
        total_debit: data.summary.period_debit,
        total_credit: data.summary.period_credit,
        closing_balance: data.summary.closing_balance,
      };
    },
    enabled: !!employeeId,
  });

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMonth(Number(e.target.value));
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYear(Number(e.target.value));
  };

  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="bg-card border border-border-default rounded-lg shadow-sm">
      {/* ── Header ─────────────────────────────── */}
      <div className="px-5 py-4 border-b border-border-default">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-extrabold text-text-primary tracking-tight">{employeeName}</h3>
          {dashboardData && (
            <span
              className={`text-lg font-bold tabular-nums ${
                dashboardData.closing_balance >= 0
                  ? 'text-status-success-text'
                  : 'text-status-danger-text'
              }`}
            >
              {formatCurrency(dashboardData.closing_balance)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-3">
          <select
            value={selectedMonth}
            onChange={handleMonthChange}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium"
          >
            {ARABIC_MONTHS.map((month, index) => (
              <option key={index} value={index + 1}>
                {month}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={handleYearChange}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium"
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Body ──────────────────────────────── */}
      <div className="max-h-[32rem] overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
            <span className="mr-3 text-base text-text-secondary">جاري التحميل...</span>
          </div>
        ) : dashboardData && dashboardData.transactions.length > 0 ? (
          <table className="w-full border-collapse">
            <thead className="bg-bg-surface-muted sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 border border-border-default text-right text-sm font-extrabold text-text-primary">
                  التاريخ
                </th>
                <th className="px-4 py-3 border border-border-default text-right text-sm font-extrabold text-text-primary">
                  البيان
                </th>
                <th className="px-4 py-3 border border-border-default text-right text-sm font-extrabold text-text-primary">
                  مدين
                </th>
                <th className="px-4 py-3 border border-border-default text-right text-sm font-extrabold text-text-primary">
                  دائن
                </th>
                <th className="px-4 py-3 border border-border-default text-right text-sm font-extrabold text-text-primary">
                  الرصيد
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Opening balance row */}
              <tr className="bg-bg-surface">
                <td className="px-4 py-3 border border-border-default text-base text-text-primary font-bold">
                  رصيد افتتاحي
                </td>
                <td className="px-4 py-3 border border-border-default text-base text-text-secondary">
                  {dashboardData.opening_balance !== 0 && 'رصيد افتتاحي'}
                </td>
                <td className="px-4 py-3 border border-border-default text-left text-base font-bold tabular-nums bg-status-danger-bg/30">
                  <span className="text-status-danger-text">{formatCurrency(dashboardData.opening_total_debit)}</span>
                </td>
                <td className="px-4 py-3 border border-border-default text-left text-base font-bold tabular-nums bg-status-success-bg/30">
                  <span className="text-status-success-text">{formatCurrency(dashboardData.opening_total_credit)}</span>
                </td>
                <td className="px-4 py-3 border border-border-default text-left text-base font-bold tabular-nums">
                  <span
                    className={
                      dashboardData.opening_balance >= 0
                        ? 'text-status-success-text'
                        : 'text-status-danger-text'
                    }
                  >
                    {formatCurrency(Math.abs(dashboardData.opening_balance))}
                  </span>
                </td>
              </tr>

              {/* Transaction rows */}
              {dashboardData.transactions.map((txn, i) => (
                <tr
                  key={i}
                  className={`transition-colors ${
                    i % 2 === 0 ? 'bg-background' : 'bg-bg-surface'
                  } hover:bg-primary/5 group`}
                >
                  <td className="px-4 py-3 border border-border-default text-base text-text-secondary tabular-nums">
                    {txn.date}
                  </td>
                  <td className="px-4 py-3 border border-border-default text-base text-text-primary font-medium">
                    {txn.description}
                  </td>
                  <td className="px-4 py-3 border border-border-default text-left text-base font-bold tabular-nums bg-status-danger-bg/30">
                    <span className="text-status-danger-text">{formatCurrency(txn.debit)}</span>
                  </td>
                  <td className="px-4 py-3 border border-border-default text-left text-base font-bold tabular-nums bg-status-success-bg/30">
                    <span className="text-status-success-text">{formatCurrency(txn.credit)}</span>
                  </td>
                  <td className="px-4 py-3 border border-border-default text-left text-base font-bold tabular-nums">
                    <span
                      className={
                        txn.running_balance >= 0
                          ? 'text-status-success-text'
                          : 'text-status-danger-text'
                      }
                    >
                      {formatCurrency(Math.abs(txn.running_balance))}
                    </span>
                  </td>
                </tr>
              ))}

              {/* Summary row */}
              <tr className="bg-bg-surface-muted font-extrabold">
                <td className="px-4 py-3 border border-border-default text-base text-text-primary" colSpan={2}>
                  الإجمالي
                </td>
                <td className="px-4 py-3 border border-border-default text-left text-base font-extrabold tabular-nums bg-status-danger-bg/30">
                  <span className="text-status-danger-text">{formatCurrency(dashboardData.total_debit)}</span>
                </td>
                <td className="px-4 py-3 border border-border-default text-left text-base font-extrabold tabular-nums bg-status-success-bg/30">
                  <span className="text-status-success-text">{formatCurrency(dashboardData.total_credit)}</span>
                </td>
                <td className="px-4 py-3 border border-border-default text-left text-base font-extrabold tabular-nums">
                  <span
                    className={
                      dashboardData.closing_balance >= 0
                        ? 'text-status-success-text'
                        : 'text-status-danger-text'
                    }
                  >
                    {formatCurrency(Math.abs(dashboardData.closing_balance))}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center text-base text-text-secondary">
            لا توجد معاملات في هذا الشهر
          </div>
        )}
      </div>
    </div>
  );
};

export default FCEmployeeTransactionPanel;
