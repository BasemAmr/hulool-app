import { useEffect, useState } from 'react';
import { applyPageBackground } from '../../utils/backgroundUtils';
import { useAuthStore } from '../../stores/authStore';
import { useEmployeeDashboard } from '../../queries/employeeDashboardQueries';
import RecentTasksPanel from '../../components/employee/RecentTasksPanel';
import RecentClientsReceivablesPanel from '../../components/employee/RecentClientsReceivablesPanel';
import RecentTransactionsPanel from '../../components/employee/RecentTransactionsPanel';
import { useModalStore } from '../../stores/modalStore';
import { Spinner } from '../../components/ui/spinner';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Receipt, FileText, CreditCard } from 'lucide-react';

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
  const openModal = useModalStore(state => state.openModal);

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

  const handleAddTask = () => openModal('taskForm', {});
  const handleAddReceivable = () => openModal('manualReceivable', {});
  const handleRecordCredit = () => openModal('recordCreditModal', {});

  return (
    <div className="w-full p-2" style={{ height: '100vh', overflow: 'visible' }}>
      {/* Compact Header */}
      <div className="mt-2 mb-2">
        <div className="flex justify-between items-center">
          {/* Quick Action Buttons (left) */}
          <div className="flex gap-2">
            <button
              onClick={handleAddTask}
              className="px-3 py-1.5 text-xs border border-primary text-primary rounded-md hover:bg-primary hover:text-white transition-colors"
            >
              <FileText size={14} className="inline me-1" />
              إضافة مهمة
            </button>
            <button
              onClick={handleAddReceivable}
              className="px-3 py-1.5 text-xs border border-border text-black rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Receipt size={14} className="inline me-1" />
              إضافة مستحق
            </button>
            <button
              onClick={handleRecordCredit}
              className="px-3 py-1.5 text-xs border border-green-600 text-green-600 rounded-md hover:bg-green-600 hover:text-white transition-colors"
            >
              <CreditCard size={14} className="inline me-1" />
              إضافة دفعة
            </button>
          </div>
          {/* Employee Name (center) */}
          <div className="flex-grow flex justify-center">
            <h1 className="text-xl font-bold mb-0 text-center text-black">مرحبا {user?.display_name}</h1>
          </div>
          {/* Empty right side for perfect centering */}
          <div style={{ width: '1px', visibility: 'hidden' }} />
        </div>
      </div>

      {/* Main Dashboard Panels */}
      <div 
        className="grid gap-2" 
        style={{ 
          height: 'calc(100vh - 120px)', 
          overflow: 'visible', 
          position: 'relative',
          gridTemplateColumns: '1fr 1fr 2fr' // 0.25, 0.25, 0.5
        }}
      >
        {/* Recent Tasks Panel - 1 fraction */}
        <div className="mb-2" style={{ height: '100%', overflow: 'visible', position: 'relative', zIndex: 10 }}>
          {ledgerData && (
            <RecentTasksPanel tasks={ledgerData.recent_tasks || []} />
          )}
        </div>

        {/* Recent Receivables Panel - 1 fraction */}
        <div className="mb-2" style={{ height: '100%', overflow: 'hidden', border: '1px solid #ddd' }}>
          <RecentClientsReceivablesPanel />
        </div>

        {/* Recent Transactions Panel - 2 fractions */}
        <div className="mb-2" style={{ height: '100%', overflow: 'hidden', border: '1px solid #ddd' }}>
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
