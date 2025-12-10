import { Outlet, useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import Navbar from './Navbar';
import ModalManager from '../shared/ModalManager';
import TaskFollowUpPanel from '../tasks/followup/TaskFollowUpPanel';

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
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50 rtl" data-page={pageType}>
      <Navbar />
       <main 
        className="flex-1 overflow-y-auto bg-gray-50 ltr"
        style={{ 
          scrollbarWidth: 'thin',
          scrollbarColor: 'hsl(var(--muted-foreground)) hsl(var(--secondary))'
        }}
      >
        <div className="[direction:rtl] p-6 min-h-full max-w-[1920px] mx-auto w-full">
          <Outlet /> {/* Child routes will be rendered here */}
         </div>
      </main> 
      <ModalManager />
      <TaskFollowUpPanel />
    </div>
  );
};

export default PageWrapper;