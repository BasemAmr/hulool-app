import { Outlet, useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import EmployeeNavbar from './EmployeeNavbar';
import ModalManager from '../shared/ModalManager';
import TaskFollowUpPanel from '../tasks/followup/TaskFollowUpPanel';

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
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50" data-page-type={pageType}>
      <EmployeeNavbar />
      <main
        className="flex-1 overflow-y-auto h-full bg-gray-50"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'hsl(var(--muted-foreground)) hsl(var(--secondary))'
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

