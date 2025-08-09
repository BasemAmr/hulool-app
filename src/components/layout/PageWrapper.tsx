// import type { ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import Sidebar from './Sidebar';
import ModalManager from '../shared/ModalManager';
import styles from './Layout.module.scss';

const PageWrapper = () => {
  const location = useLocation();
  
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
      <main className={styles.mainContent}>
        <Outlet /> {/* Child routes will be rendered here */}
      </main>
      <Sidebar />
      <ModalManager />
    </div>
  );
};

export default PageWrapper;