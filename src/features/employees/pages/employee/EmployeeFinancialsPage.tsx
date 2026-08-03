import { useEffect, useState } from 'react';
import { applyPageBackground } from '@/shared/utils/backgroundUtils';
import { useEmployeeDashboard } from '@/features/employee-dashboard/api/employeeDashboardQueries';
import RecentTransactionsPanel from '@/features/employee-dashboard/components/RecentTransactionsPanel';
import { Spinner } from '@/shared/ui/shadcn/spinner';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/shadcn/alert';

/**
 * EmployeeFinancialsPage - Employee financial ledger page
 * 
 * Renders RecentTransactionsPanel fed directly by the monthly ledger API call.
 */
const EmployeeFinancialsPage = () => {
  const [selectedMonth, setSelectedMonth] = useState<number | undefined>(undefined);
  const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined);
  const { data: ledgerData, isLoading, error } = useEmployeeDashboard(selectedMonth, selectedYear);

  useEffect(() => {
    applyPageBackground('employee-financials');
  }, []);

  if (isLoading) {
    return (
      <div className="w-full p-4">
        <div className="flex justify-center items-center" style={{ minHeight: '50vh' }}>
          <Spinner>
            <span className="sr-only">جاري التحميل...</span>
          </Spinner>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-4">
        <Alert variant="destructive">
          <AlertTitle>خطأ في تحميل البيانات</AlertTitle>
          <AlertDescription>{error.message || 'حدث خطأ أثناء تحميل سجل المعاملات'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="w-full p-4">
      {ledgerData && (
        <RecentTransactionsPanel
          ledgerData={ledgerData}
          onMonthChange={setSelectedMonth}
          onYearChange={setSelectedYear}
        />
      )}
    </div>
  );
};

export default EmployeeFinancialsPage;
