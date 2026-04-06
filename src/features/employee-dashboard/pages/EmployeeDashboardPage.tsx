import { useEffect, useState } from 'react';
import { applyPageBackground } from '@/shared/utils/backgroundUtils';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useEmployeeDashboard } from '@/features/employee-dashboard/api/employeeDashboardQueries';
import RecentTasksPanel from '../components/RecentTasksPanel';
import RecentClientsReceivablesPanel from '../components/RecentClientsReceivablesPanel';
import RecentTransactionsPanel from '../components/RecentTransactionsPanel';
import { useModalStore } from '@/shared/stores/modalStore';
import { Spinner } from '@/shared/ui/shadcn/spinner';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/shadcn/alert';

/**
 * EmployeeDashboardPage - Main dashboard for employee users
 * 
 * Features:
 * - 3-panel layout: Recent Tasks (0.25), Recent Receivables (0.25), Recent Transactions (0.5)
 * - Quick actions for task management
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
      {/* Main Dashboard Panels - no header */}
      <div
        className="grid gap-2"
        style={{
          height: 'calc(100vh - 80px)',
          overflow: 'visible',
          position: 'relative',
          gridTemplateColumns: '4fr 4fr 5fr'
        }}
      >
        {/* Recent Tasks Panel - 1 fraction */}
        <div className="mb-2" style={{ height: '100%', overflow: 'visible', position: 'relative', zIndex: 10 }}>
          {ledgerData && (
            <RecentTasksPanel tasks={ledgerData.recent_tasks || []} />
          )}
        </div>

        {/* Recent Receivables Panel - 1 fraction */}
        <div className="mb-2" style={{ height: '100%', overflow: 'hidden' }}>
          <RecentClientsReceivablesPanel />
        </div>

        {/* Recent Transactions Panel - 2 fractions */}
        <div className="mb-2" style={{ height: '100%', overflow: 'hidden' }}>
          {ledgerData && (
            <RecentTransactionsPanel
              ledgerData={ledgerData}
              onMonthChange={setSelectedMonth}
              onYearChange={setSelectedYear}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboardPage;
