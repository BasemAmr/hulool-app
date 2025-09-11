import { Outlet, useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import EmployeeSidebar from './EmployeeSidebar';
import ModalManager from '../shared/ModalManager';
import TaskFollowUpPanel from '../tasks/followup/TaskFollowUpPanel';
import { useSidebarStore } from '../../stores/sidebarStore';
import styles from './Layout.module.scss';

/**
 * EmployeePageWrapper - Main layout wrapper for employee pages
 * 
 * Similar to PageWrapper but with employee-specific:
 * - Sidebar navigation
 * - Employee-focused modals
 * - Employee role context
 */
const EmployeePageWrapper = () => {
  const location = useLocation();
  const { isCollapsed } = useSidebarStore();

  // Determine page type for background styling (if needed)
  const pageType = useMemo(() => {
    const path = location.pathname;
    if (path.includes('/employee/dashboard')) return 'employee-dashboard';
    if (path.includes('/employee/tasks')) return 'employee-tasks';
    if (path.includes('/employee/clients')) return 'employee-clients';
    if (path.includes('/employee/financials')) return 'employee-financials';
    if (path.includes('/employee/notifications')) return 'employee-notifications';
    return 'employee-default';
  }, [location.pathname]);

  return (
    <>
      <div className={styles.appLayout} data-page-type={pageType}>
        <EmployeeSidebar />
        <main className={`${styles.mainContent}`}
         style={{ 
          marginRight: isCollapsed ? '0px' : '160px',
          transition: 'margin-right 0.3s ease'
        }}
        >
          <Outlet />
        </main>
      </div>
      <ModalManager />
      <TaskFollowUpPanel />
    </>
  );
};

export default EmployeePageWrapper;
