import React, { useState } from 'react';
import TreasuryReportSection from './TreasuryReportSection';
import TasksReportSection from './TasksReportSection';
import { Alert, AlertDescription } from '@/shared/ui/shadcn/alert';
import { useEmployeeReports } from '@/features/employee-dashboard/api/employeeDashboardQueries';
import type { ReportPeriod } from '@/features/employee-dashboard/api/employeeDashboardQueries';

export const EmployeeReportsPanel: React.FC = () => {
  const [treasuryPeriod, setTreasuryPeriod] = useState<ReportPeriod>('current_month');
  const [tasksPeriod, setTasksPeriod] = useState<ReportPeriod>('current_month');

  const { data, isLoading, error } = useEmployeeReports(treasuryPeriod, tasksPeriod);

  return (
    <div className="flex flex-col gap-3 h-full overflow-y-auto pr-0.5">
      {error && (
        <Alert variant="destructive" className="py-2 text-xs">
          <AlertDescription>
            {(error as Error).message || 'حدث خطأ أثناء تحميل التقارير'}
          </AlertDescription>
        </Alert>
      )}

      {/* Section 1: Cashbox & Bank Treasury Accounts Report */}
      <TreasuryReportSection
        report={data?.treasury}
        isLoading={isLoading}
        filterMode={treasuryPeriod}
        onFilterChange={setTreasuryPeriod}
      />

      {/* Section 2: Tasks Status Report (with standalone filter) */}
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
