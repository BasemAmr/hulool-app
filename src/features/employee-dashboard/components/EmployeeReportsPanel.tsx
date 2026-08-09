import React, { useState } from 'react';
import { TreasurySubReportSection } from './TreasurySubReportSection';
import TasksReportSection from './TasksReportSection';
import { Alert, AlertDescription } from '@/shared/ui/shadcn/alert';
import { useEmployeeReports } from '../api/employeeDashboardQueries';
import type { ReportPeriod } from '../api/employeeDashboardQueries';

/**
 * EmployeeReportsPanel — 3 vertical sections with independent filter states:
 * 1. Cashbox Report  (TreasurySubReportSection - cashboxPeriod)
 * 2. Banks Report    (TreasurySubReportSection - bankPeriod)
 * 3. Tasks Report    (TasksReportSection - tasksPeriod)
 */
export const EmployeeReportsPanel: React.FC = () => {
  const [cashboxPeriod, setCashboxPeriod] = useState<ReportPeriod>('current_month');
  const [bankPeriod,    setBankPeriod]    = useState<ReportPeriod>('current_month');
  const [tasksPeriod,   setTasksPeriod]   = useState<ReportPeriod>('current_month');

  const { data, isLoading, error } = useEmployeeReports(cashboxPeriod, bankPeriod, tasksPeriod);

  return (
    <div className="flex flex-col gap-3 h-full overflow-y-auto pr-0.5">
      {error && (
        <Alert variant="destructive" className="py-2 text-xs">
          <AlertDescription>
            {(error as Error).message || 'حدث خطأ أثناء تحميل التقارير'}
          </AlertDescription>
        </Alert>
      )}

      {/* Section 1: Cashbox Accounts Report */}
      <TreasurySubReportSection
        title="تقرير الصندوق"
        storageKey="employee-dashboard-selected-cashbox-id"
        accounts={data?.treasury.cashbox_accounts ?? []}
        isLoading={isLoading}
        filterMode={cashboxPeriod}
        onFilterChange={setCashboxPeriod}
      />

      {/* Section 2: Bank Accounts Report */}
      <TreasurySubReportSection
        title="تقرير البنوك"
        storageKey="employee-dashboard-selected-bank-id"
        accounts={data?.treasury.bank_accounts ?? []}
        isLoading={isLoading}
        filterMode={bankPeriod}
        onFilterChange={setBankPeriod}
      />

      {/* Section 3: Tasks Report */}
      <TasksReportSection
        report={data?.tasks}
        isLoading={isLoading}
        filterMode={tasksPeriod}
        onFilterChange={setTasksPeriod}
      />
    </div>
  );
};

export default EmployeeReportsPanel;