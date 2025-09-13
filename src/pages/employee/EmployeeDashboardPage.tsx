import { useEffect } from 'react';
import { applyPageBackground } from '../../utils/backgroundUtils';
import { useAuthStore } from '../../stores/authStore';
import { useEmployeeDashboard } from '../../queries/employeeDashboardQueries';
import RecentTasksPanel from '../../components/employee/RecentTasksPanel';
import RecentClientsReceivablesPanel from '../../components/employee/RecentClientsReceivablesPanel';
import RecentTransactionsPanel from '../../components/employee/RecentTransactionsPanel';
import { useModalStore } from '../../stores/modalStore';
import { Spinner, Alert } from 'react-bootstrap';
import { Receipt, FileText, CreditCard } from 'lucide-react';

/**
 * EmployeeDashboardPage - Main dashboard for employee users
 * 
 * Features:
 * - 3-panel layout: Recent Tasks, Recent Receivables, Recent Transactions
 * - Quick actions for task management
 */
const EmployeeDashboardPage = () => {
  const user = useAuthStore((state) => state.user);
  const { data: dashboardData, isLoading, error } = useEmployeeDashboard();
  const openModal = useModalStore(state => state.openModal);

  useEffect(() => {
    applyPageBackground('employee-dashboard');
  }, []);

  if (isLoading) {
    return (
      <div className="container-fluid p-2">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
          <Spinner animation="border" role="status" variant="primary">
            <span className="visually-hidden">جاري التحميل...</span>
          </Spinner>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid p-2">
        <Alert variant="danger">
          <Alert.Heading>خطأ في تحميل البيانات</Alert.Heading>
          <p>{error.message || 'حدث خطأ أثناء تحميل بيانات لوحة التحكم'}</p>
        </Alert>
      </div>
    );
  }

  const handleAddTask = () => openModal('taskForm', {});
  const handleAddReceivable = () => openModal('manualReceivable', {});
  const handleRecordCredit = () => openModal('recordCreditModal', {});

  return (
    <div className="container-fluid p-2" style={{ height: '100vh', overflow: 'visible' }}>
      {/* Compact Header */}
      <div className="row mt-2 mb-2">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center">
        {/* Quick Action Buttons (left) */}
        <div className="d-flex gap-2">
          <button
            onClick={handleAddTask}
            className="btn btn-outline-primary btn-sm"
            style={{ fontSize: 'var(--font-size-xs)' }}
          >
            <FileText size={14} className="me-1" />
            إضافة مهمة
          </button>
          <button
            onClick={handleAddReceivable}
            className="btn btn-outline-secondary btn-sm"
            style={{ fontSize: 'var(--font-size-xs)' }}
          >
            <Receipt size={14} className="me-1" />
            إضافة مستحق
          </button>
          <button
            onClick={handleRecordCredit}
            className="btn btn-outline-success btn-sm"
            style={{ fontSize: 'var(--font-size-xs)' }}
          >
            <CreditCard size={14} className="me-1" />
            إضافة دفعة
          </button>
        </div>
        {/* Employee Name (center) */}
        <div className="flex-grow-1 d-flex justify-content-center">
          <h1 className="h4 mb-0 text-center">مرحبا {user?.display_name}</h1>
        </div>
        {/* Empty right side for perfect centering */}
        <div style={{ width: '1px', visibility: 'hidden' }} />
          </div>
        </div>
      </div>

      {/* Main Dashboard Panels */}
      <div className="row" style={{ height: 'calc(100vh - 120px)', overflow: 'visible', position: 'relative' }}>
        {/* Recent Tasks Panel - col-4 */}
        <div className="col-4 mb-2" style={{ height: '100%', overflow: 'visible', position: 'relative', zIndex: 10 }}>
          {dashboardData?.recent_tasks && (
            <RecentTasksPanel tasks={dashboardData.recent_tasks} />
          )}
        </div>

        {/* Placeholder for other panels - col-4 each */}
        <div className="col-4 mb-2" style={{ height: '100%', overflow: 'visible' }}>
          <RecentClientsReceivablesPanel />
        </div>

        <div className="col-4 mb-2" style={{ height: '100%', overflow: 'visible' }}>
          {dashboardData?.recent_transactions && dashboardData?.financial_summary && (
            <RecentTransactionsPanel 
              transactions={dashboardData.recent_transactions} 
              financialSummary={dashboardData.financial_summary}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboardPage;
