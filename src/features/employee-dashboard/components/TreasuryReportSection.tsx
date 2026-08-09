import React from 'react';
import { TreasurySubReportSection } from './TreasurySubReportSection';
import type {
  TreasuryReport,
  ReportPeriod,
} from '@/features/employee-dashboard/api/employeeDashboardQueries';

interface TreasuryReportSectionProps {
  report?: TreasuryReport;
  isLoading: boolean;
  filterMode: ReportPeriod;
  onFilterChange: (mode: ReportPeriod) => void;
}

export const TreasuryReportSection: React.FC<TreasuryReportSectionProps> = ({
  report,
  isLoading,
  filterMode,
  onFilterChange,
}) => {
  return (
    <div className="space-y-3">
      <TreasurySubReportSection
        title="تقرير الصندوق"
        storageKey="employee-dashboard-selected-cashbox-id"
        accounts={report?.cashbox_accounts ?? []}
        isLoading={isLoading}
        filterMode={filterMode}
        onFilterChange={onFilterChange}
      />
      <TreasurySubReportSection
        title="تقرير البنوك"
        storageKey="employee-dashboard-selected-bank-id"
        accounts={report?.bank_accounts ?? []}
        isLoading={isLoading}
        filterMode={filterMode}
        onFilterChange={onFilterChange}
      />
    </div>
  );
};

export default TreasuryReportSection;