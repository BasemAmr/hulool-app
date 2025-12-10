import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useSidebarStore } from '../../stores/sidebarStore';
import Logo from '../ui/Logo';
import NotificationBell from './NotificationBell';
import { 
  Home, 
  ClipboardList, 
  Users, 
  DollarSign, 
  Bell, 
  LogOut, 
  ChevronRight, 
  PlusCircle,
  Search
} from 'lucide-react';
import { useModalStore } from '../../stores/modalStore';
import { createPortal } from 'react-dom';

/**
 * EmployeeSidebar - Navigation sidebar for employee users
 * 
 * Provides employee-specific navigation including:
 * - Dashboard, Tasks, Clients, Financials, Notifications
 * - Employee-specific actions
 * - Role-based visibility
 */
const EmployeeSidebar = () => {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { isCollapsed, toggleCollapsed } = useSidebarStore();
  const navigate = useNavigate();

  const openModal = useModalStore((state) => state.openModal);

  const handleSearchFocus = () => {
    openModal('clientSearch', {}); // Employee can still search clients
  };


  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  // Employee-specific navigation items
  const employeeNavigationItems = [
    {
      path: '/employee/dashboard',
      icon: Home,
      label: 'لوحة التحكم'
    },
    {
      path: '/employee/tasks',
      icon: ClipboardList,
      label: 'المهام المكلف بها'
    },
    {
      path: '/employee/clients',
      icon: Users,
      label: 'العملاء'
    },
    {
      path: '/employee/financials',
      icon: DollarSign,
      label: 'الماليات والعمولات'
    },
    {
      path: '/employee/notifications',
      icon: Bell,
      label: 'الإشعارات'
    }
  ];

  // Quick actions for employees
  const employeeActions = [
    {
      label: 'إضافة مهمة جديدة',
      icon: PlusCircle,
      action: () => openModal('taskForm', {})
    }
  ];

  return (
    <>
      <aside 
        className={`
          fixed top-0 right-0 h-screen flex flex-col bg-card border-l border-border z-40 
          transition-all duration-300 ease-in-out overflow-hidden backdrop-blur-sm
          ${isCollapsed ? 'w-0 border-l-0' : 'w-40'}
        `}
        style={{
          direction: 'rtl'
        }}
      >
        {/* Collapse Toggle Button */}
        {!isCollapsed && (
          <button 
            className="absolute top-1/2 -left-3 -translate-y-1/2 w-6 h-6 bg-muted border border-border rounded-full flex items-center justify-center cursor-pointer z-10 transition-all duration-200 text-black hover:bg-muted/80 hover:scale-110"
            onClick={toggleCollapsed}
            title={isCollapsed ? 'توسيع الشريط الجانبي' : 'تصغير الشريط الجانبي'}
          >
            <ChevronRight size={16} />
          </button>
        )}

        {/* Header with Logo and Notifications */}
        <div className="px-3 py-3 border-b border-border bg-muted/30 flex items-center gap-2 min-h-[60px]">
          <div className="flex items-center justify-between w-full">
            <Logo compact />
            {!isCollapsed && (
              <NotificationBell className="ml-2" />
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-2 overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/50 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground">
          {/* Employee Navigation */}
          <div className="mb-4">
            <div className="text-xs text-black font-bold uppercase tracking-wider px-2 mb-1 text-right">منطقة الموظف</div>
            {employeeNavigationItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-2 py-1.5 mx-1 text-foreground text-xs font-normal no-underline rounded-lg transition-all duration-200 relative overflow-hidden hover:bg-accent hover:text-accent-foreground hover:-translate-x-1 hover:font-bold ${
                    isActive ? 'bg-primary text-primary-foreground font-bold shadow-md before:content-[""] before:absolute before:top-0 before:right-0 before:w-1 before:h-full before:bg-primary-foreground before:rounded-l-sm' : ''
                  }`
                }
              >
                <span className="w-4 h-4 flex items-center justify-center text-sm transition-all duration-200 flex-shrink-0">
                  <item.icon size={16} />
                </span>
                <span className="flex-1 text-right whitespace-nowrap">{item.label}</span>
                <span className={`w-1.5 h-1.5 rounded-full bg-primary-foreground flex-shrink-0 transition-opacity duration-200 ${item.path === location.pathname ? 'opacity-100' : 'opacity-0'}`}></span>
              </NavLink>
            ))}
          </div>

          {/* Employee Actions */}
          <div className="mb-4">
            <div className="text-xs text-black font-bold uppercase tracking-wider px-2 mb-1 text-right">إجراءات سريعة</div>
            {employeeActions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className="w-full border-none bg-transparent text-right flex items-center gap-2 px-2 py-1.5 mx-1 text-foreground text-xs font-normal rounded-lg transition-all duration-200 hover:bg-accent hover:text-accent-foreground hover:-translate-x-1 focus:outline-none focus:bg-accent"
              >
                <span className="w-4 h-4 flex items-center justify-center text-sm transition-all duration-200 flex-shrink-0">
                  <action.icon size={16} />
                </span>
                <span className="flex-1 text-right whitespace-nowrap">{action.label}</span>
              </button>
            ))}
          </div>

          {/* Quick Search */}
          <div className="mx-2 mb-2 relative">
            <input
              type="text"
              placeholder="البحث في العملاء..."
              className="w-full px-2 pr-8 py-1.5 bg-muted/30 border border-border rounded-lg text-xs font-normal outline-none transition-all duration-200 cursor-pointer placeholder:text-right hover:bg-muted/50 hover:border-muted-foreground/40 focus:bg-muted/50 focus:border-primary focus:ring-2 focus:ring-primary/25"
              onFocus={handleSearchFocus}
              readOnly
            />
            <Search size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-black/70 transition-all duration-200 pointer-events-none" />
          </div>
        </nav>

        {/* User Section */}
        <div className="p-2 border-t border-border bg-muted/30">
          <div className="flex items-center gap-2 p-1.5 bg-muted/50 rounded-lg transition-all duration-200 hover:bg-muted">
            <div 
              className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-base flex-shrink-0 shadow-sm border-2 border-white/20 bg-primary text-primary-foreground"
            >
              <span>{user?.display_name?.charAt(0).toUpperCase() || 'م'}</span>
            </div>
            <div className="flex-1 text-right overflow-hidden">
              <div className="text-foreground text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis mb-0.5">{user?.display_name || 'موظف'}</div>
              <div className="text-black text-xs font-normal">
                موظف {user?.commission_rate && `(${user.commission_rate}%)`}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="bg-transparent border-none text-black text-base cursor-pointer p-1.5 rounded transition-all duration-200 flex-shrink-0 hover:text-destructive hover:bg-destructive/10 hover:scale-105 active:scale-95"
              title="تسجيل الخروج"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
      
      {/* Collapsed toggle button as portal */}
      {isCollapsed && createPortal(
        <button 
          className="fixed top-1/2 -right-5 -translate-y-1/2 w-10 h-10 border-2 rounded-l-full flex items-center justify-center cursor-pointer z-[9999] shadow-lg text-primary-foreground transition-all duration-300 ease-in-out hover:-right-2.5 bg-primary hover:bg-primary/90 border-primary"
          onClick={toggleCollapsed}
          title="توسيع الشريط الجانبي"
        >
          <ChevronRight className="rotate-180" size={18} />
        </button>,
        document.body
      )}
    </>
  );
};

export default EmployeeSidebar;

/**
 * EmployeeSidebar - Navigation sidebar for employee users
 * 
 * Provides employee-specific navigation including:
 * - Dashboard, Tasks, Clients, Financials, Notifications
 * - Employee-specific actions
 * - Role-based visibility
 */
