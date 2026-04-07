// src/components/employee/RecentTransactionsPanel.tsx
import React, { useState, useEffect, useRef } from 'react';
import { MoreHorizontal, Loader2 } from 'lucide-react';
import { formatDate } from '@/shared/utils/dateUtils';
import type { MonthlyLedgerData } from '@/features/employee-dashboard/api/employeeDashboardQueries';
import {
  ShadcnSelect as Select,
  ShadcnSelectContent as SelectContent,
  ShadcnSelectItem as SelectItem,
  ShadcnSelectTrigger as SelectTrigger,
  ShadcnSelectValue as SelectValue,
} from '@/shared/ui/shadcn/select';

interface MonthlyTransaction {
  id: number;
  date: string;
  description: string;
  from_account: string;
  to_account: string;
  amount: number;
  running_balance: number;
  direction: 'income' | 'expense';
  transaction_type: string;
  reference_type?: string;
  reference_id?: string | null;
  client_name?: string;
  client_phone?: string;
}

interface OpeningBalance {
  description: string;
  total_debit: number;
  total_credit: number;
  balance: number;
}

interface MonthlySummary {
  total_to_date_income: number;
  total_to_date_expenses: number;
  balance_due: number;
}

interface Period {
  month: number;
  year: number;
}

interface RecentTransactionsPanelProps {
  ledgerData: MonthlyLedgerData;
  onMonthChange?: (month: number) => void;
  onYearChange?: (year: number) => void;
}

const RecentTransactionsPanel: React.FC<RecentTransactionsPanelProps> = ({ 
  ledgerData, 
  onMonthChange, 
  onYearChange 
}) => {
  const [visibleTransactions, setVisibleTransactions] = useState(20);
  const [isAutoLoading, setIsAutoLoading] = useState(false);
  const [maxClientWidth, setMaxClientWidth] = useState(120);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const clientCellsRef = useRef<Map<number, HTMLTableCellElement>>(new Map());
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { transactions = [], summary = { total_to_date_income: 0, total_to_date_expenses: 0, balance_due: 0 }, opening_balance = { description: 'الرصيد الافتتاحي', total_debit: 0, total_credit: 0, balance: 0 }, period } = ledgerData || {};

  // Reset visible count when ledger data changes
  useEffect(() => {
    setVisibleTransactions(20);
    setIsAutoLoading(false);
    setMaxClientWidth(120);
    clientCellsRef.current.clear();
    if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
  }, [period?.month, period?.year]);

  // Reset loading state after visible transactions change
  useEffect(() => {
    if (isAutoLoading && loadingTimeoutRef.current === null) {
      loadingTimeoutRef.current = setTimeout(() => {
        setIsAutoLoading(false);
        loadingTimeoutRef.current = null;
      }, 200);
    }
    return () => {
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    };
  }, [visibleTransactions, isAutoLoading]);

  // Auto-load checker effect with proper timing
  useEffect(() => {
    const checkAndLoadMore = () => {
      if (!scrollContainerRef.current) return;
      const scrollContainer = scrollContainerRef.current;
      const scrollPos = scrollContainer.scrollHeight - scrollContainer.scrollTop;
      const threshold = 200;
      const hasSpace = scrollContainer.clientHeight < scrollContainer.scrollHeight;

      if ((scrollPos < threshold || !hasSpace) && visibleTransactions < transactions.length && !isAutoLoading) {
        setIsAutoLoading(true);
        setVisibleTransactions(prev => Math.min(prev + 20, transactions.length));
      }
    };

    const container = scrollContainerRef.current;
    if (!container) return;

    const debounceTimer = setTimeout(checkAndLoadMore, 300);
    container.addEventListener('scroll', checkAndLoadMore);
    
    // Initial check on mount
    setTimeout(checkAndLoadMore, 100);

    return () => {
      clearTimeout(debounceTimer);
      container.removeEventListener('scroll', checkAndLoadMore);
    };
  }, [visibleTransactions, transactions.length, isAutoLoading]);

  // Dynamic width effect for client column
  useEffect(() => {
    const maxWidth = Array.from(clientCellsRef.current.values())
      .reduce((max, cell) => Math.max(max, cell.offsetWidth), 120);
    setMaxClientWidth(Math.min(maxWidth + 30, 330));
  }, [visibleTransactions, transactions.length]);

  const arabicMonths = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(Math.abs(amount));
  };

  const getTransactionTypeLabel = (type: string, direction: 'income' | 'expense'): string => {
    if (direction === 'income') return 'سند قبض';
    if (direction === 'expense') return 'سند صرف';
    return type;
  };

  const handleMonthChange = (value: string) => {
    const newMonth = parseInt(value, 10);
    if (onMonthChange) {
      onMonthChange(newMonth);
    }
  };

  const handleYearChange = (value: string) => {
    const newYear = parseInt(value, 10);
    if (onYearChange) {
      onYearChange(newYear);
    }
  };

  const handleShowMore = () => {
    setVisibleTransactions(prev => Math.min(prev + 20, transactions.length));
  };

  const displayedTransactions = transactions.slice(0, visibleTransactions);
  const hasMoreTransactions = transactions.length > visibleTransactions;

  // Generate year options (2020-2030)
  const yearOptions = Array.from({ length: 11 }, (_, i) => 2020 + i);

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm h-full flex flex-col">
      {/* Header — single left-border accent, white background */}
      <div className="px-4 py-3 border-b border-border border-l-4 border-l-primary bg-background flex-shrink-0">
          <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h6 className="mb-0 font-semibold text-text-primary text-sm">
              كشف حساب
            </h6>
            <Select value={period.month.toString()} onValueChange={handleMonthChange}>
              <SelectTrigger className="h-8 w-[120px] bg-background text-xs text-text-primary">
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
            <Select value={period.year.toString()} onValueChange={handleYearChange}>
              <SelectTrigger className="h-8 w-[100px] bg-background text-xs text-text-primary">
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
          <span className="text-sm text-text-secondary font-semibold">
            رصيد: {formatCurrency(summary.balance_due)} ر.س
          </span>
        </div>
      </div>

      {/* Body - Transactions Table */}
      <div className="flex-1 overflow-hidden p-0">
        {transactions.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-center">
              <p className="text-text-primary mb-0 text-sm">
                لا توجد معاملات مالية
              </p>
            </div>
          </div>
        ) : (
          <div ref={scrollContainerRef} className="w-full h-full overflow-auto">
            <table ref={tableRef} className="w-full text-sm mb-0 border-collapse">
              <thead className="sticky top-0 z-10 bg-background">
                <tr>
                  <th className="px-2 py-2 border border-border-strong text-start font-bold text-base text-text-primary" style={{ width: `${maxClientWidth + 40}px`, minWidth: `${maxClientWidth + 40}px` }}>اسم العميل</th>
                  <th className="px-2 py-2 border border-border-strong text-start font-bold text-base text-text-primary">البيان</th>
                  <th className="px-2 py-2 border border-border-strong text-center font-bold text-base text-text-primary" style={{ width: '70px', minWidth: '70px' }}>المدين</th>
                  <th className="px-2 py-2 border border-border-strong text-center font-bold text-base text-text-primary" style={{ width: '70px', minWidth: '70px' }}>الدائن</th>
                  <th className="px-2 py-2 border border-border-strong text-center font-bold text-base text-text-primary" style={{ width: '80px', minWidth: '80px' }}>الرصيد</th>
                  <th className="px-2 py-2 border border-border-strong text-center font-bold text-base text-text-primary" style={{ width: '60px', minWidth: '60px' }}>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {/* Opening Balance Row */}
                <tr className="bg-status-success-bg font-bold">
                  <td className="px-2 py-2 border border-border-strong text-start font-bold text-base text-text-primary" style={{ width: `${maxClientWidth + 40}px`, minWidth: `${maxClientWidth + 40}px` }}>-</td>
                  <td className="px-2 py-2 border border-border-strong text-start font-bold text-base text-text-primary">
                    {opening_balance.description}
                  </td>
                  <td className="px-2 py-2 border border-border-strong text-center font-bold text-base">
                    <span className="text-status-success-text">
                      {opening_balance.total_debit > 0 ? formatCurrency(opening_balance.total_debit) : '-'}
                    </span>
                  </td>
                  <td className="px-2 py-2 border border-border-strong text-center font-bold text-base">
                    <span className="text-status-danger-text">
                      {opening_balance.total_credit > 0 ? formatCurrency(opening_balance.total_credit) : '-'}
                    </span>
                  </td>
                  <td className="px-2 py-2 border border-border-strong text-center font-bold text-base">
                    <span className={opening_balance.balance >= 0 ? 'text-status-success-text' : 'text-status-danger-text'}>
                      {formatCurrency(opening_balance.balance)}
                    </span>
                  </td>
                  <td className="px-2 py-2 border border-border-strong text-center font-bold text-base text-text-primary" style={{ width: '60px', minWidth: '60px' }}>-</td>
                </tr>
                {/* Transaction Rows */}
                {displayedTransactions.map((transaction, index) => {
                  const rowBg = index % 2 === 0 ? 'bg-bg-surface' : 'bg-bg-surface-hover';
                  const t = transaction;
                  const direction = (t.direction as 'income' | 'expense') ?? 'income';
                  const clientDisplay = t.client_name || getTransactionTypeLabel(t.transaction_type, direction);
                  return (
                    <tr key={transaction.id} className={`${rowBg} hover:bg-background transition-colors`}>
                      <td
                        ref={(el) => {
                          if (el) clientCellsRef.current.set(transaction.id, el);
                        }}
                        className="px-2 py-1.5 border border-border-default text-start font-semibold text-sm text-text-primary"
                        style={{ width: `${maxClientWidth + 40}px`, minWidth: `${maxClientWidth + 40}px` }}
                      >
                        {clientDisplay}
                      </td>
                      <td className="px-2 py-1.5 border border-border-default text-start text-sm text-text-secondary">
                        {transaction.description}
                      </td>
                      {/* Debit (income): only green when it IS income */}
                      <td className="px-2 py-1.5 border border-border-default text-center font-semibold text-sm">
                        {transaction.direction === 'income' ? (
                          <span className="text-status-success-text">{formatCurrency(transaction.amount)}</span>
                        ) : (
                          <span className="text-text-primary">-</span>
                        )}
                      </td>
                      {/* Credit (expense): only red when it IS expense */}
                      <td className="px-2 py-1.5 border border-border-default text-center font-semibold text-sm">
                        <span className={transaction.direction === 'expense' ? 'text-status-danger-text' : 'text-text-primary'}>
                          {transaction.direction === 'expense' ? (
                            formatCurrency(transaction.amount)
                          ) : (
                            <span className="text-text-primary">-</span>
                          )}
                        </span>
                      </td>
                      {/* Running balance: color only when negative (deficit) */}
                      <td className="px-2 py-1.5 border border-border-default text-center font-semibold text-sm">
                        <span className={transaction.running_balance < 0 ? 'text-status-danger-text' : 'text-text-primary'}>
                          {formatCurrency(transaction.running_balance)}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 border border-border-default text-center text-sm text-text-primary" style={{ width: '60px', minWidth: '60px' }}>
                        {formatDate(transaction.date).replace(/\/20/, '/')}
                      </td>
                    </tr>
                  );
                })}
                {/* Loading Row */}
                {isAutoLoading && (
                  <tr className="bg-background">
                    <td colSpan={6} className="px-2 py-4 text-center">
                      <Loader2 className="inline animate-spin text-text-primary" size={20} />
                    </td>
                  </tr>
                )}
                {/* Totals Footer Row */}
                <tr className="bg-background border-t-2 border-border-strong">
                  <td className="px-2 py-2 border border-border-default text-center font-semibold text-sm text-text-primary" style={{ width: `${maxClientWidth + 40}px`, minWidth: `${maxClientWidth + 40}px` }}>-</td>
                  <td className="px-2 py-2 border border-border-default text-center font-semibold text-sm text-text-primary">الإجماليات</td>
                  <td className="px-2 py-2 border border-border-default text-center font-semibold text-sm">
                    <span className="text-status-success-text">{formatCurrency(summary.total_to_date_income)}</span>
                  </td>
                  <td className="px-2 py-2 border border-border-default text-center font-semibold text-sm">
                    <span className="text-status-danger-text">{formatCurrency(summary.total_to_date_expenses)}</span>
                  </td>
                  <td className="px-2 py-2 border border-border-default text-center font-semibold text-sm">
                    <span className={summary.balance_due < 0 ? 'text-status-danger-text' : 'text-text-primary'}>
                      {formatCurrency(summary.balance_due)}
                    </span>
                  </td>
                  <td className="px-2 py-2 border border-border-default text-center text-sm text-text-primary" style={{ width: '60px', minWidth: '60px' }}>-</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-background border-t border-border-default text-center flex-shrink-0">
        {hasMoreTransactions && (
          <button
            onClick={handleShowMore}
            className="text-text-secondary p-0 flex items-center justify-center gap-1 w-full hover:text-text-primary transition-colors text-sm"
          >
            <MoreHorizontal size={16} />
            <span>عرض المزيد ({transactions.length - visibleTransactions} متبقي)</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default RecentTransactionsPanel;
