import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import apiClient from '@/api/client';
import BaseModal from '@/shared/ui/layout/BaseModal';
import Button from '@/shared/ui/primitives/Button';
import { useToast } from '@/shared/hooks/useToast';
import { exportService } from '@/services/export/ExportService';
import { TOAST_MESSAGES } from '@/shared/constants/toastMessages';
import { FileSpreadsheet, DollarSign, ClipboardList } from 'lucide-react';
import { useGetEmployeesForSelection } from '@/features/employees/api/employeeQueries';
import type { EmployeeStatementReportData } from '@/services/export/exportTypes';

type ReportType = 'financial' | 'tasks';

interface EmployeeReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EmployeeReportModal = ({ isOpen, onClose }: EmployeeReportModalProps) => {
  const { success, error: showError } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [reportType, setReportType] = useState<ReportType | null>(null);
  const [employeeId, setEmployeeId] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<'monthly' | 'full'>('full');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const { data: employees = [], isLoading: employeesLoading } = useGetEmployeesForSelection();
  const selectedEmployee = employees.find(e => e.id.toString() === employeeId);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setReportType(null);
      setEmployeeId('');
      setSelectedPeriod('full');
      setSelectedMonth(new Date().getMonth() + 1);
      setSelectedYear(new Date().getFullYear());
    }
  }, [isOpen]);

  const arabicMonths = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  const yearOptions = Array.from({ length: 11 }, (_, i) => 2020 + i);

  const exportMutation = useMutation({
    mutationFn: async () => {
      if (!reportType || !employeeId || !selectedEmployee) throw new Error('Missing data');

      if (reportType === 'financial') {
        if (selectedPeriod === 'monthly') {
          const { data } = await apiClient.get(`/employees/${employeeId}/dashboard`, {
            params: { month: selectedMonth, year: selectedYear }
          });
          const ledgerData = data;

          const exportData: EmployeeStatementReportData = {
            employeeId: Number(employeeId),
            employeeName: selectedEmployee.display_name,
            period: {
              month: selectedMonth,
              year: selectedYear,
              month_name: arabicMonths[selectedMonth - 1],
            },
            openingBalance: {
              total_debit: ledgerData.opening_balance?.total_debit || 0,
              total_credit: ledgerData.opening_balance?.total_credit || 0,
              balance: ledgerData.opening_balance?.balance || 0,
            },
            transactions: (ledgerData.transactions || []).map((t: any) => ({
              id: t.id,
              date: t.date,
              description: t.description,
              amount: t.amount,
              running_balance: t.running_balance,
              direction: t.direction,
              transaction_type: t.transaction_type,
              client_name: t.client_name,
            })),
            summary: {
              period_income: ledgerData.summary?.period_income || 0,
              period_expenses: ledgerData.summary?.period_expenses || 0,
              closing_balance: ledgerData.summary?.closing_balance || 0,
              total_to_date_income: ledgerData.summary?.total_to_date_income || 0,
              total_to_date_expenses: ledgerData.summary?.total_to_date_expenses || 0,
            },
          };

          await exportService.exportEmployeeStatement(exportData);
        } else {
          const firstResponse = await apiClient.get(`/employees/${employeeId}/payouts`, {
            params: { page: 1, per_page: 100 }
          });
          const firstData = firstResponse.data;
          const totalPages = firstData?.pagination?.total_pages || 1;
          const summaryData = firstData?.data?.summary || {};

          let allTransactions = [...(firstData?.data?.transactions || [])];
          for (let page = 2; page <= totalPages; page++) {
            const response = await apiClient.get(`/employees/${employeeId}/payouts`, {
              params: { page, per_page: 100 }
            });
            const pageTransactions = response.data?.data?.transactions || [];
            allTransactions = [...allTransactions, ...pageTransactions];
          }

          if (allTransactions.length === 0) {
            throw new Error('No transaction data available');
          }

          const sortedTransactions = [...allTransactions].reverse();
          let runningBalance = 0;
          const transactionsWithBalance = sortedTransactions.map((t: any) => {
            const debit = parseFloat(t.debit || 0);
            const credit = parseFloat(t.credit || 0);
            const amount = debit > 0 ? debit : credit;
            const direction = debit > 0 ? 'income' : 'expense';
            runningBalance += debit - credit;
            return {
              id: t.id,
              date: t.transaction_date || t.date || t.created_at,
              description: t.task_name || t.description || '',
              amount,
              running_balance: runningBalance,
              direction: direction as 'income' | 'expense',
              transaction_type: t.transaction_type || '',
              client_name: t.client_name || null,
            };
          });

          const exportData: EmployeeStatementReportData = {
            employeeId: Number(employeeId),
            employeeName: selectedEmployee.display_name,
            period: { month: 0, year: 0, month_name: 'جميع الفترات' },
            openingBalance: { total_debit: 0, total_credit: 0, balance: 0 },
            transactions: transactionsWithBalance,
            summary: {
              period_income: summaryData?.total_earned || 0,
              period_expenses: summaryData?.total_expenses || 0,
              closing_balance: summaryData?.balance_due || 0,
              total_to_date_income: summaryData?.total_earned || 0,
              total_to_date_expenses: summaryData?.total_expenses || 0,
            },
          };

          await exportService.exportEmployeeStatement(exportData);
        }
      } else {
        const { data } = await apiClient.get(`/tasks/employee/${employeeId}`, {
          params: { page: 1, per_page: 1000 }
        });
        const tasks = data?.data?.tasks || data?.tasks || [];

        if (tasks.length === 0) {
          throw new Error('No task data available');
        }
      }
    },
    onSuccess: () => {
      success(TOAST_MESSAGES.EXPORT_SUCCESS);
      onClose();
    },
    onError: (err: Error) => {
      showError(TOAST_MESSAGES.EXPORT_FAILED, err.message);
    },
  });

  const canExport = reportType && employeeId && employeeId !== '0' && selectedEmployee;

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="تقرير موظف">
      <div className="space-y-5">
        {step === 1 && (
          <>
            <p className="text-sm font-medium text-text-secondary text-center">اختر نوع التقرير</p>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => { setReportType('tasks'); setStep(2); }}
                className={`p-6 rounded-xl border-2 text-center transition-all ${
                  reportType === 'tasks'
                    ? 'border-primary bg-primary/5'
                    : 'border-border-default hover:border-primary/40'
                }`}
              >
                <ClipboardList size={36} className="mx-auto mb-3 text-primary" />
                <span className="block text-lg font-bold text-text-primary">مهام</span>
                <span className="block text-xs text-text-secondary mt-1">تصدير المهام المسندة للموظف</span>
              </button>
              <button
                type="button"
                onClick={() => { setReportType('financial'); setStep(2); }}
                className={`p-6 rounded-xl border-2 text-center transition-all ${
                  reportType === 'financial'
                    ? 'border-primary bg-primary/5'
                    : 'border-border-default hover:border-primary/40'
                }`}
              >
                <DollarSign size={36} className="mx-auto mb-3 text-primary" />
                <span className="block text-lg font-bold text-text-primary">مالي</span>
                <span className="block text-xs text-text-secondary mt-1">تصدير كشف حساب الموظف المالي</span>
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-sm text-primary font-bold hover:underline"
              >
                &larr; تغيير نوع التقرير
              </button>
              <span className="text-sm font-bold text-text-primary px-3 py-1 rounded-full bg-primary/10">
                {reportType === 'tasks' ? 'مهام' : 'مالي'}
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">اختر الموظف</label>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="base-input w-full"
                disabled={employeesLoading}
              >
                <option value="">{employeesLoading ? 'جاري التحميل...' : '-- اختر موظف --'}</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id.toString()}>
                    {emp.display_name}
                  </option>
                ))}
              </select>
            </div>

            {reportType === 'financial' && employeeId && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">نطاق التقرير</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedPeriod('full')}
                      className={`flex-1 p-3 rounded-lg border-2 text-center transition-all ${
                        selectedPeriod === 'full'
                          ? 'border-primary bg-primary/5'
                          : 'border-border-default hover:border-primary/40'
                      }`}
                    >
                      <span className="block text-sm font-bold">كل المعاملات</span>
                      <span className="block text-xs text-text-secondary mt-1">جميع الفترات</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPeriod('monthly')}
                      className={`flex-1 p-3 rounded-lg border-2 text-center transition-all ${
                        selectedPeriod === 'monthly'
                          ? 'border-primary bg-primary/5'
                          : 'border-border-default hover:border-primary/40'
                      }`}
                    >
                      <span className="block text-sm font-bold">شهر محدد</span>
                      <span className="block text-xs text-text-secondary mt-1">تصفية حسب الشهر</span>
                    </button>
                  </div>
                </div>
                {selectedPeriod === 'monthly' && (
                  <div className="flex gap-2">
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      className="base-input flex-1"
                    >
                      {arabicMonths.map((month, index) => (
                        <option key={index + 1} value={index + 1}>{month}</option>
                      ))}
                    </select>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="base-input w-24"
                    >
                      {yearOptions.map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-border-default">
              <Button type="button" variant="outline-primary" onClick={onClose}>
                إلغاء
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => exportMutation.mutate()}
                isLoading={exportMutation.isPending}
                disabled={!canExport}
              >
                <FileSpreadsheet size={16} className="me-1" />
                {exportMutation.isPending ? 'جاري التصدير...' : 'تصدير إلى Excel'}
              </Button>
            </div>
          </>
        )}
      </div>
    </BaseModal>
  );
};

export default EmployeeReportModal;
