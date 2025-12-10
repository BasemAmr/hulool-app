import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useSidebarStore } from '../../stores/sidebarStore';
import { useTranslation } from 'react-i18next';
import Logo from '../ui/Logo';
import NotificationBell from './NotificationBell';
import { Banknote, LayoutDashboard, LogOut, NotebookText, Users, Settings, Building, Calculator, Home, Briefcase, Plus, Receipt, ChevronDown, ChevronRight, Tags, CreditCard, AlertTriangle, UserCog, Wallet, FileText, CheckSquare } from 'lucide-react';
import { useModalStore } from '../../stores/modalStore';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';


const Sidebar = () => {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { isCollapsed, toggleCollapsed } = useSidebarStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isActionsOpen, setIsActionsOpen] = useState(true);

  const openModal = useModalStore((state) => state.openModal);

  const handleSearchFocus = () => {
    openModal('clientSearch', {}); // We'll add 'clientSearch' to modalStore
  };

  const handleAddTask = () => openModal('taskForm', {});
  const handleAddInvoice = () => openModal('invoiceForm', {});

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
      path: '/employees',
      icon: UserCog,
      label: 'إدارة الموظفين'
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

  const financialCenterItems = [
    {
      path: '/financial-center/accounts',
      icon: Wallet,
      label: 'نظرة عامة على الحسابات'
    },
    {
      path: '/financial-center/pending',
      icon: CheckSquare,
      label: 'الموافقات المعلقة'
    },
    {
      path: '/financial-center/invoices',
      icon: FileText,
      label: 'مركز الفواتير'
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
    <>
      <aside 
        className={`
          fixed top-0 right-0 h-screen flex flex-col bg-card border-l border-border z-40 
          transition-all duration-300 ease-in-out overflow-hidden
          ${isCollapsed ? 'w-0 border-l-0' : 'w-40'}
        `}
        style={{
          direction: 'rtl'
        }}
      >
        {/* Collapse Toggle Button - only show when not collapsed */}
        {!isCollapsed && (
          <button 
            className="absolute top-1/2 -left-3 -translate-y-1/2 w-6 h-6 bg-muted hover:bg-muted/80 border border-border rounded-full flex items-center justify-center cursor-pointer z-10 transition-all duration-200 text-black hover:scale-110"
            onClick={toggleCollapsed}
            title={isCollapsed ? 'توسيع الشريط الجانبي' : 'تصغير الشريط الجانبي'}
          >
            <ChevronRight size={16} />
          </button>
        )}

        {/* Header with Logo and Notifications */}
        <div className="px-3 py-3 border-b border-border bg-muted/30 flex items-center gap-2 min-h-[60px]">
            <div className="flex items-center justify-between w-full">
              <Logo />
              {!isCollapsed && (
                <NotificationBell className="ml-2" />
              )}
            </div>
        </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground scrollbar-track-transparent hover:scrollbar-thumb-primary">
        <div className="mb-4">
          <div className="text-xs text-black font-bold uppercase tracking-wider px-2 mb-1 text-right">القائمة الرئيسية</div>
          {mainNavigationItems.map((item) => (
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
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 bg-primary-foreground transition-opacity duration-200 ${location.pathname === item.path ? 'opacity-100' : 'opacity-0'}`}></span>
            </NavLink>
          ))}
        </div>

        <div className="mb-4">
          <div 
            className="text-xs text-black font-bold uppercase tracking-wider px-2 mb-1 text-right cursor-pointer flex items-center justify-between"
            onClick={() => setIsActionsOpen(!isActionsOpen)}
          >
            إجراءات
            {isActionsOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
          {isActionsOpen && (
            <>
              <button
                onClick={handleAddTask}
                className="w-full border-none bg-transparent text-right flex items-center gap-2 px-2 py-1.5 mx-1 text-foreground text-xs font-normal rounded-lg transition-all duration-200 hover:bg-accent hover:text-accent-foreground hover:-translate-x-1 focus:outline-none focus:bg-accent"
              >
                <span className="w-4 h-4 flex items-center justify-center text-sm transition-all duration-200 flex-shrink-0">
                  <Plus size={16} />
                </span>
                <span className="flex-1 text-right whitespace-nowrap">إضافة مهمة</span>
              </button>
              <button
                onClick={handleAddInvoice}
                className="w-full border-none bg-transparent text-right flex items-center gap-2 px-2 py-1.5 mx-1 text-foreground text-xs font-normal rounded-lg transition-all duration-200 hover:bg-accent hover:text-accent-foreground hover:-translate-x-1 focus:outline-none focus:bg-accent"
              >
                <span className="w-4 h-4 flex items-center justify-center text-sm transition-all duration-200 flex-shrink-0">
                  <Receipt size={16} />
                </span>
                <span className="flex-1 text-right whitespace-nowrap">إضافة فاتورة</span>
              </button>
              <button
                onClick={() => openModal('recordCreditModal', {})}
                className="w-full border-none bg-transparent text-right flex items-center gap-2 px-2 py-1.5 mx-1 text-foreground text-xs font-normal rounded-lg transition-all duration-200 hover:bg-accent hover:text-accent-foreground hover:-translate-x-1 focus:outline-none focus:bg-accent"
              >
                <span className="w-4 h-4 flex items-center justify-center text-sm transition-all duration-200 flex-shrink-0">
                  <CreditCard size={16} />
                </span>
                <span className="flex-1 text-right whitespace-nowrap">إضافة دفعة مقدمة</span>
              </button>
              <button
                onClick={() => openModal('urgentAlert', {})}
                className="w-full border-none bg-transparent text-right flex items-center gap-2 px-2 py-1.5 mx-1 text-foreground text-xs font-normal rounded-lg transition-all duration-200 hover:bg-accent hover:text-accent-foreground hover:-translate-x-1 focus:outline-none focus:bg-accent"
              >
                <span className="w-4 h-4 flex items-center justify-center text-sm transition-all duration-200 flex-shrink-0">
                  <AlertTriangle size={16} />
                </span>
                <span className="flex-1 text-right whitespace-nowrap">إضافة تنبيه عاجل</span>
              </button>
            </>
          )}
        </div>

        <div className="mb-4">
          <div className="text-xs text-black font-bold uppercase tracking-wider px-2 mb-1 text-right">المركز المالي</div>
          {financialCenterItems.map((item) => (
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
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 bg-primary-foreground transition-opacity duration-200 ${location.pathname === item.path ? 'opacity-100' : 'opacity-0'}`}></span>
            </NavLink>
          ))}
        </div>

        <div className="mb-4">
          <div className="text-xs text-black font-bold uppercase tracking-wider px-2 mb-1 text-right">إدارة المهام</div>
          {taskNavigationItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={() => 
                `flex items-center gap-2 px-2 py-1.5 mx-1 text-foreground text-xs font-normal no-underline rounded-lg transition-all duration-200 relative overflow-hidden hover:bg-accent hover:text-accent-foreground hover:-translate-x-1 hover:font-bold ${
                  isActiveTaskRoute(item.path) ? 'bg-primary text-primary-foreground font-bold shadow-md before:content-[""] before:absolute before:top-0 before:right-0 before:w-1 before:h-full before:bg-primary-foreground before:rounded-l-sm' : ''
                }`
              }
            >
              <span className="w-4 h-4 flex items-center justify-center text-sm transition-all duration-200 flex-shrink-0">
                <item.icon size={16} />
              </span>
              <span className="flex-1 text-right whitespace-nowrap">{item.label}</span>
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 bg-primary-foreground transition-opacity duration-200 ${isActiveTaskRoute(item.path) ? 'opacity-100' : 'opacity-0'}`}></span>
            </NavLink>
          ))}
        </div>

        <div className="mx-2 mb-2 relative">
          <input
            type="text"
            placeholder={t('globalSearch.placeholder') || 'البحث السريع...'}
            className="w-full px-2 pr-8 py-1.5 bg-muted/30 border border-border rounded-lg text-xs font-normal outline-none transition-all duration-200 cursor-pointer placeholder:text-right text-foreground hover:bg-muted/50 hover:border-primary/30 focus:bg-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
            onFocus={handleSearchFocus}
            readOnly // To prevent typing directly, just for triggering modal
          />
          <Search size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-black transition-all duration-200 pointer-events-none" />
        </div>
      </nav>

      {/* User Section */}
      <div className="p-2 border-t border-border bg-muted/30">
        <div className="flex items-center gap-2 p-1.5 bg-muted/50 rounded-lg transition-all duration-200 hover:bg-muted/70">
          <div 
            className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-base flex-shrink-0 shadow-sm border-2 border-primary/20"
          >
            <span>{user?.display_name?.charAt(0).toUpperCase() || 'م'}</span>
          </div>
          <div className="flex-1 text-right overflow-hidden">
            <div className="text-foreground text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis mb-0.5">{user?.display_name || 'مستخدم'}</div>
            <div className="text-black text-xs font-normal">محامي</div>
          </div>
          <button
            onClick={handleLogout}
            className="bg-transparent border-none text-black text-base cursor-pointer p-1.5 rounded transition-all duration-200 flex-shrink-0 hover:text-destructive hover:bg-destructive/10 hover:scale-105 active:scale-95"
            title={t('common.logout') as string || 'تسجيل الخروج'}
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
    
    {/* Collapsed toggle button as portal - always visible when collapsed */}
    {isCollapsed && createPortal(
      <button 
        className="fixed top-1/2 -right-5 -translate-y-1/2 w-10 h-10 bg-primary hover:bg-primary/90 text-primary-foreground border-2 border-primary rounded-l-full flex items-center justify-center cursor-pointer z-[9999] shadow-lg transition-all duration-300 ease-in-out hover:-right-2.5 hover:shadow-xl"
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

export default Sidebar;
