import { useEffect, useState } from 'react';
import { applyPageBackground } from '@/shared/utils/backgroundUtils';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useEmployeeDashboard } from '@/features/employee-dashboard/api/employeeDashboardQueries';
import RecentTasksPanel from '../components/RecentTasksPanel';
import RecentClientsReceivablesPanel from '../components/RecentClientsReceivablesPanel';
import EmployeeReportsPanel from '../components/EmployeeReportsPanel';
import { Spinner } from '@/shared/ui/shadcn/spinner';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/shadcn/alert';

/**
 * EmployeeDashboardPage - Redesigned 3-column dashboard for employee users
 * 
 * Layout:
 * - Column 1: Employee Reporting Panel (Treasury Accounts & Tasks Reports with Pie Charts & Filters)
 * - Column 2: Recent Tasks Column (1.25x typography scaling, without TreasuryAccountSelectorWidget)
 * - Column 3: Client Receivables Column (1.25x typography scaling)
 */
const EmployeeDashboardPage = () => {
  const user = useAuthStore((state) => state.user);
  const [selectedMonth, setSelectedMonth] = useState<number | undefined>(undefined);
  const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined);
  const { data: ledgerData, isLoading, error } = useEmployeeDashboard(selectedMonth, selectedYear);

  useEffect(() => {
    applyPageBackground('employee-dashboard');
  }, []);

  if (isLoading) {
    return (
      <div className="w-full p-2">
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
      <div className="w-full p-2">
        <Alert variant="destructive">
          <AlertTitle>خطأ في تحميل البيانات</AlertTitle>
          <AlertDescription>{error.message || 'حدث خطأ أثناء تحميل بيانات لوحة التحكم'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="w-full px-2 pb-2" style={{ height: '100vh', overflow: 'visible' }}>
      {/* Main Dashboard Panels - 3 Columns */}
      <div
        className="grid grid-cols-1 md:grid-cols-3 gap-3"
        style={{
          height: 'calc(100vh - 80px)',
          overflow: 'visible',
          position: 'relative'
        }}
      >
        {/* Column 1: Reporting Features Panel (Treasury & Tasks Reports) */}
        <div className="mb-2" style={{ height: '100%', overflow: 'hidden' }}>
          <EmployeeReportsPanel />
        </div>

        {/* Column 2: Recent Tasks Column */}
        <div className="mb-2 flex flex-col gap-2" style={{ height: '100%', overflow: 'visible', position: 'relative', zIndex: 10 }}>
          {ledgerData && (
            <RecentTasksPanel tasks={ledgerData.recent_tasks || []} />
          )}
        </div>

        {/* Column 3: Recent Receivables Column */}
        <div className="mb-2" style={{ height: '100%', overflow: 'hidden' }}>
          <RecentClientsReceivablesPanel />
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboardPage;
