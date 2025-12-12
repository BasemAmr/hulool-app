// Admin view of employee transactions panel - Monthly ledger with Select filters
import React, { useState, useEffect } from 'react';
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

  const handleShowMore = () => {
    setVisibleTransactions(prev => prev + 20);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
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
  const period = ledgerData?.period || { month: selectedMonth, year: selectedYear };

  const displayedTransactions = transactions.slice(0, visibleTransactions);
  const hasMoreTransactions = transactions.length > visibleTransactions;

  return (
    <div 
      className="rounded-lg border border-border bg-card shadow-sm h-full"
      style={{
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-2 border-b border-border"
        style={{
          backgroundColor: '#28a745',
          color: '#fff',
          flexShrink: 0
        }}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h6 className="mb-0 font-bold text-white text-base">
              كشف حساب
            </h6>
            <Select value={selectedMonth.toString()} onValueChange={handleMonthChange}>
              <SelectTrigger className="w-[100px] h-7 bg-white text-black text-xs">
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
              <SelectTrigger className="w-[80px] h-7 bg-white text-black text-xs">
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

      {/* Body - Transactions Table */}
      <div className="p-0" style={{ flex: 1, overflow: 'hidden' }}>
        {transactions.length === 0 && opening_balance.balance === 0 ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-center">
              <p className="text-black mb-0 text-sm">
                لا توجد معاملات مالية
              </p>
            </div>
          </div>
        ) : (
          <div className="w-full h-full" style={{ overflow: 'auto' }}>
            <table className="w-full text-sm mb-0">
              <thead
                style={{
                  position: 'sticky',
                  top: 0,
                  backgroundColor: '#f0f0f0',
                  zIndex: 1
                }}
              >
                <tr>
                  <th style={{
                    fontSize: '0.7rem',
                    padding: '6px',
                    border: '1px solid #ddd',
                    textAlign: 'start',
                    fontWeight: 'bold'
                  }}>البيان</th>
                  <th style={{
                    fontSize: '0.7rem',
                    padding: '6px',
                    border: '1px solid #ddd',
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }}>المدين</th>
                  <th style={{
                    fontSize: '0.7rem',
                    padding: '6px',
                    border: '1px solid #ddd',
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }}>الدائن</th>
                  <th style={{
                    fontSize: '0.7rem',
                    padding: '6px',
                    border: '1px solid #ddd',
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }}>الرصيد</th>
                  <th style={{
                    fontSize: '0.7rem',
                    padding: '6px',
                    border: '1px solid #ddd',
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }}>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {/* Opening Balance Row */}
                <tr style={{
                  backgroundColor: '#e8f5e9',
                  fontWeight: 'bold'
                }}>
                  <td style={{
                    fontSize: '0.7rem',
                    padding: '6px',
                    border: '1px solid #ddd',
                    textAlign: 'start',
                    fontWeight: 'bold'
                  }}>
                    {opening_balance.description}
                  </td>
                  <td style={{
                    fontSize: '0.7rem',
                    padding: '6px',
                    border: '1px solid #ddd',
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }}>
                    <span className="text-green-600">
                      {opening_balance.total_debit > 0 ? `${formatCurrency(opening_balance.total_debit)}` : '-'}
                    </span>
                  </td>
                  <td style={{
                    fontSize: '0.7rem',
                    padding: '6px',
                    border: '1px solid #ddd',
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }}>
                    <span className="text-red-600">
                      {opening_balance.total_credit > 0 ? `${formatCurrency(opening_balance.total_credit)}` : '-'}
                    </span>
                  </td>
                  <td style={{
                    fontSize: '0.7rem',
                    padding: '6px',
                    border: '1px solid #ddd',
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }}>
                    <span className={opening_balance.balance >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(opening_balance.balance)}
                    </span>
                  </td>
                  <td style={{
                    fontSize: '0.7rem',
                    padding: '6px',
                    border: '1px solid #ddd',
                    textAlign: 'center'
                  }}>
                    -
                  </td>
                </tr>
                {/* Transaction Rows */}
                {displayedTransactions.map((transaction, index) => {
                  const bgColor = index % 2 === 0 ? '#c8e6c9' : '#e8f5e9';
                  return (
                    <tr key={transaction.id}>
                      <td style={{
                        fontSize: '0.7rem',
                        padding: '4px 6px',
                        textAlign: 'start',
                        border: '1px solid #ddd',
                        backgroundColor: bgColor
                      }}>
                        {transaction.description}
                      </td>
                      <td style={{
                        fontSize: '0.7rem',
                        padding: '4px 6px',
                        textAlign: 'center',
                        border: '1px solid #ddd',
                        backgroundColor: bgColor
                      }}>
                        <span className="text-green-600">
                          {transaction.direction === 'income' ? formatCurrency(transaction.amount) : '-'}
                        </span>
                      </td>
                      <td style={{
                        fontSize: '0.7rem',
                        padding: '4px 6px',
                        textAlign: 'center',
                        border: '1px solid #ddd',
                        backgroundColor: bgColor
                      }}>
                        <span className="text-red-600">
                          {transaction.direction === 'expense' ? formatCurrency(transaction.amount) : '-'}
                        </span>
                      </td>
                      <td style={{
                        fontSize: '0.7rem',
                        padding: '4px 6px',
                        textAlign: 'center',
                        border: '1px solid #ddd',
                        backgroundColor: bgColor,
                        fontWeight: '600'
                      }}>
                        <span className={transaction.running_balance >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatCurrency(transaction.running_balance)}
                        </span>
                      </td>
                      <td style={{
                        fontSize: '0.7rem',
                        padding: '4px 6px',
                        textAlign: 'center',
                        border: '1px solid #ddd',
                        backgroundColor: bgColor
                      }}>
                        <span style={{ fontSize: '10px' }}>
                          {formatDate(transaction.date).replace(/\/20/, '/')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {/* Totals Footer Row */}
                <tr style={{
                  backgroundColor: '#f0f0f0',
                  borderTop: '2px solid #999',
                  fontWeight: 'bold'
                }}>
                  <td style={{
                    fontSize: '0.7rem',
                    padding: '6px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    border: '1px solid #ddd'
                  }}>
                    الإجماليات
                  </td>
                  <td style={{
                    fontSize: '0.7rem',
                    padding: '6px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    border: '1px solid #ddd'
                  }}>
                    <span className="text-green-600">
                      {formatCurrency(summary.total_to_date_income)}
                    </span>
                  </td>
                  <td style={{
                    fontSize: '0.7rem',
                    padding: '6px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    border: '1px solid #ddd'
                  }}>
                    <span className="text-red-600">
                      {formatCurrency(summary.total_to_date_expenses)}
                    </span>
                  </td>
                  <td style={{
                    fontSize: '0.7rem',
                    padding: '6px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    border: '1px solid #ddd'
                  }}>
                    <span className={summary.balance_due >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(summary.balance_due)}
                    </span>
                  </td>
                  <td style={{
                    fontSize: '0.7rem',
                    padding: '6px',
                    border: '1px solid #ddd'
                  }}>
                    -
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer - Show More Button */}
      <div 
        className="px-4 py-2 bg-muted/30 border-t border-border text-center"
        style={{ flexShrink: 0 }}
      >
        {hasMoreTransactions && (
          <button
            onClick={handleShowMore}
            className="text-primary p-0 flex items-center justify-center gap-1 w-full hover:text-primary/80 transition-colors text-sm"
          >
            <MoreHorizontal size={16} />
            <span>عرض المزيد ({transactions.length - visibleTransactions} متبقي)</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default AdminEmployeeTransactionsPanel;
