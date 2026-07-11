import React, { useState } from 'react';
import BaseModal from '@/shared/ui/layout/BaseModal';
import { useModalStore } from '@/shared/stores/modalStore';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';

type AccountType = 'treasury' | 'employee' | 'client' | 'cashbox';

interface FCAccountLedgerProps {
  type: AccountType;
  id: number;
  name: string;
}

const FCAccountLedgerModal: React.FC = () => {
  const props = useModalStore((state) => state.props) as FCAccountLedgerProps;
  const closeModal = useModalStore((state) => state.closeModal);

  const { type, id, name } = props;

  // Month/year selectors for employee type
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  // Fetch data based on account type
  const { data, isLoading, error } = useQuery({
    queryKey: ['fcAccountLedger', type, id, selectedMonth, selectedYear],
    queryFn: async () => {
      switch (type) {
        case 'client': {
          const response = await apiClient.get(`/clients/${id}/receivables`);
          return response.data.data;
        }
        case 'employee': {
          const response = await apiClient.get(`/employees/${id}/dashboard`, {
            params: { month: selectedMonth, year: selectedYear },
          });
          return response.data.data;
        }
        case 'treasury': {
          const response = await apiClient.get(`/treasury-accounts/${id}`);
          return response.data.data;
        }
        case 'cashbox': {
          // For cashbox, we'll fetch from a similar endpoint or show basic info
          const response = await apiClient.get(`/cash-boxes/${id}`);
          return response.data.data;
        }
        default:
          return null;
      }
    },
    enabled: !!id && !!type,
  });

  const handleClose = () => {
    closeModal();
  };

  const months = [
    { value: 1, label: 'يناير' },
    { value: 2, label: 'فبراير' },
    { value: 3, label: 'مارس' },
    { value: 4, label: 'أبريل' },
    { value: 5, label: 'مايو' },
    { value: 6, label: 'يونيو' },
    { value: 7, label: 'يوليو' },
    { value: 8, label: 'أغسطس' },
    { value: 9, label: 'سبتمبر' },
    { value: 10, label: 'أكتوبر' },
    { value: 11, label: 'نوفمبر' },
    { value: 12, label: 'ديسمبر' },
  ];

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);

  return (
    <BaseModal
      isOpen={true}
      onClose={handleClose}
      title={`كشف حساب - ${name}`}
      className="min-w-[80%]"
    >
      <div className="p-4">
        {isLoading && (
          <div className="flex justify-center items-center p-8">
            <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="ml-2 text-foreground/60">جاري التحميل...</span>
          </div>
        )}

        {error && (
          <div className="text-center p-8 text-red-500">
            خطأ في تحميل البيانات: {(error as Error).message}
          </div>
        )}

        {!isLoading && !error && data && (
          <>
            {/* Client Account Ledger */}
            {type === 'client' && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="p-3 text-text-secondary font-medium">التاريخ</th>
                      <th className="p-3 text-text-secondary font-medium">البيان</th>
                      <th className="p-3 text-text-secondary font-medium">المبلغ</th>
                      <th className="p-3 text-text-secondary font-medium">الرصيد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.items?.map((item: any, index: number) => (
                      <tr key={index} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="p-3 text-foreground/70">{item.date}</td>
                        <td className="p-3 text-foreground">{item.description}</td>
                        <td className={`p-3 font-medium ${item.amount < 0 ? 'text-red-500' : 'text-green-500'}`}>
                          {item.amount?.toLocaleString('ar-SA')}
                        </td>
                        <td className="p-3 text-foreground font-medium">
                          {item.balance?.toLocaleString('ar-SA')}
                        </td>
                      </tr>
                    ))}
                    {(!data?.items || data.items.length === 0) && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-foreground/50">
                          لا توجد معاملات
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Employee Account Ledger */}
            {type === 'employee' && (
              <div>
                {/* Month/Year Selectors */}
                <div className="flex gap-4 mb-4 p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-text-secondary">الشهر:</label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      className="px-3 py-1.5 border border-border rounded-md bg-background text-foreground text-sm"
                    >
                      {months.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-text-secondary">السنة:</label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="px-3 py-1.5 border border-border rounded-md bg-background text-foreground text-sm"
                    >
                      {years.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Transactions Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-right">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="p-3 text-text-secondary font-medium">التاريخ</th>
                        <th className="p-3 text-text-secondary font-medium">البيان</th>
                        <th className="p-3 text-text-secondary font-medium">مدين</th>
                        <th className="p-3 text-text-secondary font-medium">دائن</th>
                        <th className="p-3 text-text-secondary font-medium">الرصيد</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.transactions?.map((tx: any) => (
                        <tr key={tx.id} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="p-3 text-foreground/70">{tx.date}</td>
                          <td className="p-3 text-foreground">{tx.description}</td>
                          <td className="p-3 text-red-500 font-medium">
                            {tx.debit ? tx.debit.toLocaleString('ar-SA') : '-'}
                          </td>
                          <td className="p-3 text-green-500 font-medium">
                            {tx.credit ? tx.credit.toLocaleString('ar-SA') : '-'}
                          </td>
                          <td className="p-3 text-foreground font-medium">
                            {tx.running_balance?.toLocaleString('ar-SA')}
                          </td>
                        </tr>
                      ))}
                      {(!data?.transactions || data.transactions.length === 0) && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-foreground/50">
                            لا توجد معاملات في هذا الشهر
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Summary */}
                {data?.summary && (
                  <div className="mt-4 p-4 bg-muted/30 rounded-lg grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-text-secondary">إجمالي الدخل:</span>
                      <span className="mr-2 font-medium text-green-500">
                        {data.summary.period_income?.toLocaleString('ar-SA')} ريال
                      </span>
                    </div>
                    <div>
                      <span className="text-text-secondary">إجمالي المصروفات:</span>
                      <span className="mr-2 font-medium text-red-500">
                        {data.summary.period_expenses?.toLocaleString('ar-SA')} ريال
                      </span>
                    </div>
                    <div>
                      <span className="text-text-secondary">الرصيد المستحق:</span>
                      <span className="mr-2 font-medium text-foreground">
                        {data.summary.balance_due?.toLocaleString('ar-SA')} ريال
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Treasury Account Details */}
            {type === 'treasury' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <span className="text-sm text-text-secondary block mb-1">اسم الحساب</span>
                    <span className="text-foreground font-medium">{data.name}</span>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <span className="text-sm text-text-secondary block mb-1">نوع الحساب</span>
                    <span className="text-foreground font-medium">{data.sub_type}</span>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <span className="text-sm text-text-secondary block mb-1">الرصيد الحالي</span>
                    <span className={`text-xl font-bold ${data.balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {data.balance?.toLocaleString('ar-SA')} ريال
                    </span>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <span className="text-sm text-text-secondary block mb-1">تاريخ الإنشاء</span>
                    <span className="text-foreground font-medium">
                      {new Date(data.created_at).toLocaleDateString('ar-SA')}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Cashbox Account Details */}
            {type === 'cashbox' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <span className="text-sm text-text-secondary block mb-1">اسم الصندوق</span>
                    <span className="text-foreground font-medium">{data.name}</span>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <span className="text-sm text-text-secondary block mb-1">الرصيد الحالي</span>
                    <span className={`text-xl font-bold ${data.balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {data.balance?.toLocaleString('ar-SA')} ريال
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </BaseModal>
  );
};

export default FCAccountLedgerModal;
