import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { useMemo } from 'react';
import EmployeeNavbar from './EmployeeNavbar';
import ModalManager from '@/shared/modals/ModalManager';
import TaskFollowUpPanel from '@/features/tasks/components/followup/TaskFollowUpPanel';
import { useAuthStore } from '@/features/auth/store/authStore';

/**
 * EmployeePageWrapper - Main layout wrapper for employee pages
 * 
 * Similar to PageWrapper but with employee-specific:
 * - Navbar navigation (horizontal)
 * - Employee-focused modals
 * - Employee role context
 */
const EmployeePageWrapper = () => {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);

  // PIN check: redirect to onboarding if needed (skip if already on onboarding)
  if (!user?.pin_set && location.pathname !== '/employee/onboarding') {
    return <Navigate to="/employee/onboarding" replace />;
  }

  // Determine page type for background styling (if needed)
  const pageType = useMemo(() => {
    const path = location.pathname;
    if (path.includes('/employee/dashboard')) return 'employee-dashboard';
    if (path.includes('/employee/tasks')) return 'employee-tasks';
    if (path.includes('/employee/clients')) return 'employee-clients';
    if (path.includes('/employee/receivables')) return 'employee-receivables';
    if (path.includes('/employee/financials')) return 'employee-financials';
    if (path.includes('/employee/notifications')) return 'employee-notifications';
    return 'employee-default';
  }, [location.pathname]);

  return (
    <div className="rtl flex flex-col h-screen overflow-hidden bg-bg-surface" data-page-type={pageType}>
      <EmployeeNavbar />
      <main
        className="flex-1 overflow-y-auto h-full bg-bg-surface"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--token-border-strong) var(--token-bg-surface)'
        }}
      >
        <div className="p-6 min-h-full" dir="rtl">
          <Outlet />
        </div>
      </main>
      <ModalManager />
      <TaskFollowUpPanel />
    </div>
  );
};

export default EmployeePageWrapper;

