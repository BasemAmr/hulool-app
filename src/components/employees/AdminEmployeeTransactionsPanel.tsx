// Admin view of employee transactions panel - Monthly ledger with infinite scroll
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MoreHorizontal } from 'lucide-react';
import apiClient from '../../api/apiClient';
import { formatDate } from '../../utils/dateUtils';
import {
  ShadcnSelect as Select,
  ShadcnSelectContent as SelectContent,
  ShadcnSelectItem as SelectItem,
  ShadcnSelectTrigger as SelectTrigger,
  ShadcnSelectValue as SelectValue,
} from '../ui/shadcn-select';

interface AdminEmployeeTransactionsPanelProps {
  employeeId: number;
}

interface MonthlyTransaction {
  id: number;
  date: string;
  description: string;
  from_account: string;
  to_account: string;
  amount: number;
  running_balance: number;
  direction: 'income' | 'expense' | null;
  transaction_type: string;
  reference_type: string | null;
  reference_id: string | null;
}

interface OpeningBalance {
  total_debit: number;
  total_credit: number;
  balance: number;
  description: string;
}

interface MonthlySummary {
  period_income: number;
  period_expenses: number;
  net_change: number;
  closing_balance: number;
  total_to_date_income: number;
  total_to_date_expenses: number;
  balance_due: number;
}

interface MonthlyLedgerData {
  period: {
    month: number;
    year: number;
    month_name: string;
  };
  opening_balance: OpeningBalance;
  transactions: MonthlyTransaction[];
  summary: MonthlySummary;
}

const AdminEmployeeTransactionsPanel: React.FC<AdminEmployeeTransactionsPanelProps> = ({ employeeId }) => {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [visibleTransactions, setVisibleTransactions] = useState(20);
  const [isAutoLoading, setIsAutoLoading] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  const arabicMonths = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  const yearOptions = Array.from({ length: 11 }, (_, i) => 2020 + i);

  // Fetch monthly ledger using admin endpoint
  const { data: ledgerData, isLoading } = useQuery({
    queryKey: ['admin', 'employee', employeeId, 'dashboard', selectedMonth, selectedYear],
    queryFn: async (): Promise<MonthlyLedgerData> => {
      const response = await apiClient.get(`/employees/${employeeId}/dashboard`, {
        params: { month: selectedMonth, year: selectedYear }
      });
      return response.data;
    },
    staleTime: 1 * 60 * 1000,
    refetchInterval: 30000,
  });

  // Reset visible count when month/year changes
  useEffect(() => {
    setVisibleTransactions(20);
  }, [selectedMonth, selectedYear]);

  // Auto-load more when scrolled to bottom or table doesn't fill container
  useEffect(() => {
    const checkAndLoadMore = () => {
      if (!scrollContainerRef.current || !tableRef.current || isAutoLoading) return;

      const container = scrollContainerRef.current;
      const table = tableRef.current;
      const transactions = ledgerData?.transactions || [];
      const hasMore = transactions.length > visibleTransactions;

      if (!hasMore) return;

      // Check if scrolled near bottom (within 200px)
      const isNearBottom =
        container.scrollHeight - (container.scrollTop + container.clientHeight) < 200;

      // Check if table height < container height (room for more)
      const tableHeight = table.offsetHeight;
      const containerHeight = container.clientHeight;
      const hasSpace = tableHeight < containerHeight - 100;

      if ((isNearBottom || hasSpace) && !isAutoLoading) {
        setIsAutoLoading(true);
        setTimeout(() => {
          setVisibleTransactions((prev) => prev + 20);
          setIsAutoLoading(false);
        }, 300);
      }
    };

    const scrollListener = () => checkAndLoadMore();
    const resizeListener = () => checkAndLoadMore();

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', scrollListener);
      window.addEventListener('resize', resizeListener);
      // Initial check
      checkAndLoadMore();
    }

    return () => {
      if (container) {
        container.removeEventListener('scroll', scrollListener);
        window.removeEventListener('resize', resizeListener);
      }
    };
  }, [ledgerData, visibleTransactions, isAutoLoading]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(Math.abs(amount));
  };

  const handleMonthChange = (value: string) => {
    setSelectedMonth(parseInt(value, 10));
  };

  const handleYearChange = (value: string) => {
    setSelectedYear(parseInt(value, 10));
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center rounded-lg border border-border bg-card shadow-sm">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  const transactions = ledgerData?.transactions || [];
  const summary = ledgerData?.summary || { 
    balance_due: 0, 
    total_to_date_income: 0, 
    total_to_date_expenses: 0 
  };
  const opening_balance = ledgerData?.opening_balance || { 
    total_debit: 0, 
    total_credit: 0, 
    balance: 0, 
    description: 'رصيد افتتاحي' 
  };

  const displayedTransactions = transactions.slice(0, visibleTransactions);
  const hasMoreTransactions = transactions.length > visibleTransactions;

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm h-full flex flex-col">
      {/* Header - Green with Month/Year selectors */}
      <div className="px-4 py-2 border-b border-border bg-green-600 text-white flex-shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h6 className="m-0 font-bold text-white text-base">كشف حساب</h6>
            <Select value={selectedMonth.toString()} onValueChange={handleMonthChange}>
              <SelectTrigger className="w-[100px] h-7 bg-white text-black text-base">
                <SelectValue placeholder="الشهر" />
              </SelectTrigger>
              <SelectContent>
                {arabicMonths.map((month, index) => (
                  <SelectItem key={index + 1} value={(index + 1).toString()}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedYear.toString()} onValueChange={handleYearChange}>
              <SelectTrigger className="w-[80px] h-7 bg-white text-black text-base">
                <SelectValue placeholder="السنة" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <span className="text-sm text-white font-bold">
            رصيد: {formatCurrency(summary.balance_due)} ر.س
          </span>
        </div>
      </div>

      {/* Body - Transactions Table with auto-scroll */}
      <div className="flex-1 overflow-hidden p-0">
        {transactions.length === 0 && opening_balance.balance === 0 ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-center">
              <p className="text-black mb-0 text-sm">لا توجد معاملات مالية</p>
            </div>
          </div>
        ) : (
          <div
            ref={scrollContainerRef}
            className="w-full h-full overflow-auto"
          >
            <table ref={tableRef} className="w-full text-sm border-collapse">
              <thead className="sticky top-0 bg-gray-100 z-10">
                <tr>
                  <th className="text-base px-1.5 py-1.5 border border-gray-300 text-start font-bold">
                    البيان
                  </th>
                  <th className="text-base px-1.5 py-1.5 border border-gray-300 text-center font-bold">
                    المدين
                  </th>
                  <th className="text-base px-1.5 py-1.5 border border-gray-300 text-center font-bold">
                    الدائن
                  </th>
                  <th className="text-base px-1.5 py-1.5 border border-gray-300 text-center font-bold">
                    الرصيد
                  </th>
                  <th className="text-base px-1.5 py-1.5 border border-gray-300 text-center font-bold">
                    التاريخ
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Opening Balance Row */}
                <tr className="bg-green-50 font-bold">
                  <td className="text-base px-1.5 py-1.5 border border-gray-300 text-start font-bold">
                    {opening_balance.description}
                  </td>
                  <td className="text-base px-1.5 py-1.5 border border-gray-300 text-center font-bold">
                    <span className="text-green-600">
                      {opening_balance.total_debit > 0 ? formatCurrency(opening_balance.total_debit) : '-'}
                    </span>
                  </td>
                  <td className="text-base px-1.5 py-1.5 border border-gray-300 text-center font-bold">
                    <span className="text-red-600">
                      {opening_balance.total_credit > 0 ? formatCurrency(opening_balance.total_credit) : '-'}
                    </span>
                  </td>
                  <td className="text-base px-1.5 py-1.5 border border-gray-300 text-center font-bold">
                    <span className={opening_balance.balance >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(opening_balance.balance)}
                    </span>
                  </td>
                  <td className="text-base px-1.5 py-1.5 border border-gray-300 text-center">-</td>
                </tr>

                {/* Transaction Rows */}
                {displayedTransactions.map((transaction, index) => {
                  const bgColor = index % 2 === 0 ? 'bg-green-100' : 'bg-green-50';
                  return (
                    <tr key={transaction.id} className={bgColor}>
                      <td className="text-base px-1.5 py-1 border border-gray-300 text-start font-bold">
                        {transaction.description}
                      </td>
                      <td className="text-base px-1.5 py-1 border border-gray-300 text-center font-bold">
                        <span className="text-green-600">
                          {transaction.direction === 'income' ? formatCurrency(transaction.amount) : '-'}
                        </span>
                      </td>
                      <td className="text-base px-1.5 py-1 border border-gray-300 text-center font-bold">
                        <span className="text-red-600">
                          {transaction.direction === 'expense' ? formatCurrency(transaction.amount) : '-'}
                        </span>
                      </td>
                      <td className="text-base px-1.5 py-1 border border-gray-300 text-center font-semibold">
                        <span className={transaction.running_balance >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatCurrency(transaction.running_balance)}
                        </span>
                      </td>
                      <td className="text-base px-1.5 py-1 border border-gray-300 text-center font-bold">
                        <span className="text-[10px]">
                          {formatDate(transaction.date)}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {/* Auto-load indicator */}
                {isAutoLoading && (
                  <tr className="bg-blue-50">
                    <td colSpan={5} className="text-base px-1.5 py-2 text-center border border-gray-300">
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin h-3 w-3 border-b-2 border-blue-600 rounded-full"></div>
                        <span className="text-gray-600">جاري التحميل...</span>
                      </div>
                    </td>
                  </tr>
                )}

                {/* Totals Footer Row */}
                <tr className="bg-gray-100 border-t-2 border-gray-400 font-bold">
                  <td className="text-base px-1.5 py-1.5 border border-gray-300 text-center font-bold">
                    الإجماليات
                  </td>
                  <td className="text-base px-1.5 py-1.5 border border-gray-300 text-center font-bold">
                    <span className="text-green-600">
                      {formatCurrency(summary.total_to_date_income)}
                    </span>
                  </td>
                  <td className="text-base px-1.5 py-1.5 border border-gray-300 text-center font-bold">
                    <span className="text-red-600">
                      {formatCurrency(summary.total_to_date_expenses)}
                    </span>
                  </td>
                  <td className="text-base px-1.5 py-1.5 border border-gray-300 text-center font-bold">
                    <span className={summary.balance_due >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(summary.balance_due)}
                    </span>
                  </td>
                  <td className="text-base px-1.5 py-1.5 border border-gray-300">-</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer - Show more button (fallback if auto-load disabled) */}
      {hasMoreTransactions && (
        <div className="px-4 py-2 bg-gray-50 border-t border-border text-center flex-shrink-0">
          <button
            onClick={() => setVisibleTransactions(prev => prev + 20)}
            disabled={isAutoLoading}
            className="text-primary p-0 flex items-center justify-center gap-1 w-full hover:text-primary/80 disabled:opacity-50 transition-colors text-sm"
          >
            <MoreHorizontal size={16} />
            <span>عرض المزيد ({transactions.length - visibleTransactions} متبقي)</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminEmployeeTransactionsPanel;
