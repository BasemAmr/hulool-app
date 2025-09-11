import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useSidebarStore } from '../../stores/sidebarStore';
import Logo from '../ui/Logo';
import NotificationBell from './NotificationBell';
import styles from './Layout.module.scss';
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
      <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
        {/* Collapse Toggle Button */}
        {!isCollapsed && (
          <button 
            className={styles.collapseToggle}
            onClick={toggleCollapsed}
            title={isCollapsed ? 'توسيع الشريط الجانبي' : 'تصغير الشريط الجانبي'}
          >
            <ChevronRight className={isCollapsed ? styles.rotated : ''} size={16} />
          </button>
        )}

        {/* Header with Logo and Notifications */}
        <div className={styles.sidebarHeader}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <Logo />
            {!isCollapsed && (
              <NotificationBell className="ml-2" />
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className={styles.sidebarNav}>
          {/* Employee Navigation */}
          <div className={styles.navSection}>
            <div className={styles.sectionTitle}>منطقة الموظف</div>
            {employeeNavigationItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `${styles.navLink} ${isActive ? styles.active : ''}`
                }
              >
                <span className={styles.navIcon}>
                  <item.icon size={16} />
                </span>
                <span className={styles.navText}>{item.label}</span>
                <span className={styles.navIndicator}></span>
              </NavLink>
            ))}
          </div>

          {/* Employee Actions */}
          <div className={styles.navSection}>
            <div className={styles.sectionTitle}>إجراءات سريعة</div>
            {employeeActions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className={`${styles.navLink} ${styles.actionButton}`}
                style={{ width: '100%', border: 'none', background: 'none', textAlign: 'right' }}
              >
                <span className={styles.navIcon}>
                  <action.icon size={16} />
                </span>
                <span className={styles.navText}>{action.label}</span>
              </button>
            ))}
          </div>

          {/* Quick Search */}
          <div className={styles.sidebarSearch}>
            <input
              type="text"
              placeholder="البحث في العملاء..."
              className={styles.searchInput}
              onFocus={handleSearchFocus}
              readOnly
            />
            <Search size={16} className={styles.searchIcon} />
          </div>
        </nav>

        {/* User Section */}
        <div className={styles.sidebarFooter}>
          <div className={styles.userCard}>
            <div className={styles.userAvatar}>
              <span>{user?.display_name?.charAt(0).toUpperCase() || 'م'}</span>
            </div>
            <div className={styles.userDetails}>
              <div className={styles.userName}>{user?.display_name || 'موظف'}</div>
              <div className={styles.userRole}>
                موظف {user?.commission_rate && `(${user.commission_rate}%)`}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className={styles.logoutButton}
              title="تسجيل الخروج"
            >
              <LogOut />
            </button>
          </div>
        </div>
      </aside>
      
      {/* Collapsed toggle button as portal */}
      {isCollapsed && createPortal(
        <button 
          className={styles.collapsedTogglePortal}
          onClick={toggleCollapsed}
          title="توسيع الشريط الجانبي"
          style={{
            position: 'fixed',
            top: '50%',
            right: '-20px',
            transform: 'translateY(-50%)',
            width: '40px',
            height: '40px',
            background: 'rgba(34, 197, 94, 0.95)', // Green theme for employee
            border: '2px solid rgba(34, 197, 94, 1)',
            borderRadius: '50% 0 0 50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 9999,
            boxShadow: '-2px 2px 12px rgba(0,0,0,0.4)',
            color: 'white',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.right = '-10px';
            e.currentTarget.style.background = 'rgba(34, 197, 94, 1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.right = '-20px';
            e.currentTarget.style.background = 'rgba(34, 197, 94, 0.95)';
          }}
        >
          <ChevronRight className={styles.rotated} size={18} />
        </button>,
        document.body
      )}
    </>
  );
};

export default EmployeeSidebar;
