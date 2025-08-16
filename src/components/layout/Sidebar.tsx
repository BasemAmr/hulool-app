import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useTranslation } from 'react-i18next';
import Logo from '../ui/Logo';
import styles from './Layout.module.scss';
import { Banknote, LayoutDashboard, LogOut, NotebookText, Users, Settings, Building, Calculator, Home, Briefcase, Plus, Receipt, ChevronDown, ChevronRight, Tags } from 'lucide-react';
import { useModalStore } from '../../stores/modalStore';
import { Search } from 'lucide-react';
import { useState } from 'react';


const Sidebar = () => {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isActionsOpen, setIsActionsOpen] = useState(true);

  const openModal = useModalStore((state) => state.openModal);

  const handleSearchFocus = () => {
    openModal('clientSearch', {}); // We'll add 'clientSearch' to modalStore
  };

  const handleAddTask = () => openModal('taskForm', {});
  const handleAddReceivable = () => openModal('manualReceivable', {});

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const mainNavigationItems = [
    {
      path: '/dashboard',
      icon: LayoutDashboard,
      label: t('dashboard.title') || 'لوحة التحكم'
    },
    {
      path: '/clients',
      icon: Users,
      label: t('clients.title') || 'العملاء'
    },
    {
      path: '/receivables',
      icon: Banknote,
      label: t('receivables.title') || 'المستحقات'
    },
    {
      path: '/tags',
      icon: Tags,
      label: 'إدارة العلامات'
    },
    {
      path: '/settings',
      icon: Settings,
      label: t('settings.title') || 'الإعدادات'
    }
  ];

  const taskNavigationItems = [
    {
      path: '/tasks',
      icon: NotebookText,
      label: t('tasks.title') || 'المهام',
      isMainTasks: true
    },
    {
      path: '/tasks?type=Government',
      icon: Building,
      label: 'خدمات حكومية'
    },
    {
      path: '/tasks?type=Accounting',
      icon: Calculator,
      label: 'خدمات محاسبية'
    },
    {
      path: '/tasks?type=RealEstate',
      icon: Home,
      label: 'خدمات عقارية'
    },
    {
      path: '/tasks?type=Other',
      icon: Briefcase,
      label: 'خدمات أخرى'
    }
  ];

  const isActiveTaskRoute = (path: string) => {
    if (path === '/tasks') {
      return location.pathname === '/tasks' && !location.search;
    }
    const urlParams = new URLSearchParams(location.search);
    const typeParam = urlParams.get('type');
    const expectedType = path.split('type=')[1];
    return location.pathname === '/tasks' && typeParam === expectedType;
  };

  return (
    <aside className={styles.sidebar}>
      {/* Header with Logo */}
      <div className={styles.sidebarHeader}>
          <Logo />
      </div>

      {/* Navigation */}
      <nav className={styles.sidebarNav}>
        <div className={styles.navSection}>
          <div className={styles.sectionTitle}>القائمة الرئيسية</div>
          {mainNavigationItems.map((item) => (
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

        <div className={styles.navSection}>
          <div 
            className={styles.sectionTitle} 
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            onClick={() => setIsActionsOpen(!isActionsOpen)}
          >
            إجراءات
            {isActionsOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
          {isActionsOpen && (
            <>
              <button
                onClick={handleAddTask}
                className={`${styles.navLink} ${styles.actionButton}`}
                style={{ width: '100%', border: 'none', background: 'none', textAlign: 'right' }}
              >
                <span className={styles.navIcon}>
                  <Plus size={16} />
                </span>
                <span className={styles.navText}>إضافة مهمة</span>
              </button>
              <button
                onClick={handleAddReceivable}
                className={`${styles.navLink} ${styles.actionButton}`}
                style={{ width: '100%', border: 'none', background: 'none', textAlign: 'right' }}
              >
                <span className={styles.navIcon}>
                  <Receipt size={16} />
                </span>
                <span className={styles.navText}>إضافة مستحق</span>
              </button>
            </>
          )}
        </div>

        <div className={styles.navSection}>
          <div className={styles.sectionTitle}>إدارة المهام</div>
          {taskNavigationItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={() => 
                `${styles.navLink} ${isActiveTaskRoute(item.path) ? styles.active : ''}`
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

        <div className={styles.sidebarSearch}>
          <input
            type="text"
            placeholder={t('globalSearch.placeholder') || 'البحث السريع...'}
            className={styles.searchInput}
            onFocus={handleSearchFocus}
            readOnly // To prevent typing directly, just for triggering modal
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
            <div className={styles.userName}>{user?.display_name || 'مستخدم'}</div>
            <div className={styles.userRole}>محامي</div>
          </div>
          <button
            onClick={handleLogout}
            className={styles.logoutButton}
            title={t('common.logout') as string || 'تسجيل الخروج'}
          >
            <LogOut />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;