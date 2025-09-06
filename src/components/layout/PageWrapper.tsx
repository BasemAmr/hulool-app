// import type { ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import Sidebar from './Sidebar';
import ModalManager from '../shared/ModalManager';
import TaskFollowUpPanel from '../tasks/followup/TaskFollowUpPanel';
import { useSidebarStore } from '../../stores/sidebarStore';
import styles from './Layout.module.scss';

const PageWrapper = () => {
  const location = useLocation();
  const { isCollapsed } = useSidebarStore();
  
  // Determine page type from current route
  const pageType = useMemo(() => {
    const path = location.pathname;
    if (path === '/dashboard') return 'dashboard';
    if (path === '/tasks') return 'tasks';
    if (path === '/clients') return 'clients';
    if (path === '/receivables') return 'receivables';
    if (path === '/settings') return 'settings';
    if (path.startsWith('/clients/')) return 'clientProfile';
    return 'default';
  }, [location.pathname]);

  return (
    <div className={styles.appLayout} data-page={pageType}>
      <main 
        className={styles.mainContent} 
        style={{ 
          marginRight: isCollapsed ? '0px' : '160px',
          transition: 'margin-right 0.3s ease'
        }}
      >
        <Outlet /> {/* Child routes will be rendered here */}
      </main>
      <Sidebar />
      <ModalManager />
      <TaskFollowUpPanel />
    </div>
  );
};

export default PageWrapper;