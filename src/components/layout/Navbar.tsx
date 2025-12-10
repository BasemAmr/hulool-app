import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useTranslation } from 'react-i18next';
import Logo from '../ui/Logo';
import NotificationBell from './NotificationBell';
import { 
  Banknote, LayoutDashboard, LogOut, NotebookText, Users, Settings, 
  Building, Calculator, Home, Briefcase, Plus, Receipt, 
  Tags, CreditCard, AlertTriangle, UserCog, Wallet, FileText, CheckSquare,
  Search, ChevronDown, Menu
} from 'lucide-react';
import { useModalStore } from '../../stores/modalStore';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '../ui/dropdown-menu';
import Button from '../ui/Button';
import { useState } from 'react';

const Navbar = () => {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const openModal = useModalStore((state) => state.openModal);

  const handleSearchFocus = () => {
    openModal('clientSearch', {});
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const mainNavigationItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: t('dashboard.title') || 'لوحة التحكم' },
    { path: '/clients', icon: Users, label: t('clients.title') || 'العملاء' },
    { path: '/employees', icon: UserCog, label: 'الموظفين' },
    { path: '/receivables', icon: Banknote, label: t('receivables.title') || 'المستحقات' },
    { path: '/tags', icon: Tags, label: 'العلامات' },
    { path: '/settings', icon: Settings, label: t('settings.title') || 'الإعدادات' }
  ];

  const financialCenterItems = [
    { path: '/financial-center/accounts', icon: Wallet, label: 'نظرة عامة' },
    { path: '/financial-center/pending', icon: CheckSquare, label: 'الموافقات' },
    { path: '/financial-center/invoices', icon: FileText, label: 'الفواتير' }
  ];

  const taskNavigationItems = [
    { path: '/tasks', icon: NotebookText, label: 'الكل', isMainTasks: true },
    { path: '/tasks?type=Government', icon: Building, label: 'حكومية' },
    { path: '/tasks?type=Accounting', icon: Calculator, label: 'محاسبية' },
    { path: '/tasks?type=RealEstate', icon: Home, label: 'عقارية' },
    { path: '/tasks?type=Other', icon: Briefcase, label: 'أخرى' }
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

  const isFinancialActive = location.pathname.startsWith('/financial-center');
  const isTasksActive = location.pathname.startsWith('/tasks');

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60" dir="rtl">
      <div className="flex h-16 items-center px-4 gap-4">
        {/* Logo */}
        <div className="flex-shrink-0 ml-4">
          <Logo />
        </div>

        {/* Main Navigation - Desktop */}
        <div className="hidden md:flex items-center gap-1 flex-1 overflow-x-auto scrollbar-hide">
          {mainNavigationItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                  isActive 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`
              }
            >
              <item.icon size={16} />
              <span>{item.label}</span>
            </NavLink>
          ))}

          {/* Financial Center Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors outline-none ${isFinancialActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}>
              <Wallet size={16} />
              <span>المركز المالي</span>
              <ChevronDown size={14} className="opacity-50" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 text-right">
              {financialCenterItems.map((item) => (
                <DropdownMenuItem key={item.path} asChild>
                  <NavLink to={item.path} className="flex items-center gap-2 w-full cursor-pointer flex-row-reverse justify-end">
                    <span>{item.label}</span>
                    <item.icon size={16} />
                  </NavLink>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Tasks Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors outline-none ${isTasksActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}>
              <NotebookText size={16} />
              <span>المهام</span>
              <ChevronDown size={14} className="opacity-50" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 text-right">
              {taskNavigationItems.map((item) => (
                <DropdownMenuItem key={item.path} asChild>
                  <NavLink to={item.path} className="flex items-center gap-2 w-full cursor-pointer flex-row-reverse justify-end">
                    <span>{item.label}</span>
                    <item.icon size={16} />
                  </NavLink>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-2 mr-auto">
          {/* Search */}
          <div className="relative hidden sm:block w-64 ml-2">
            <div 
              className="flex items-center w-full px-3 py-1.5 bg-muted/50 border border-input rounded-md text-sm text-muted-foreground cursor-pointer hover:bg-muted transition-colors"
              onClick={handleSearchFocus}
            >
              <Search size={16} className="ml-2" />
              <span>بحث سريع...</span>
              <span className="mr-auto text-xs border border-border px-1.5 rounded bg-background">Ctrl K</span>
            </div>
          </div>

          {/* Quick Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center justify-center w-9 h-9 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm">
                <Plus size={20} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 text-right">
              <DropdownMenuLabel className="text-right">إجراء سريع</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => openModal('taskForm', {})} className="cursor-pointer flex flex-row-reverse justify-end gap-2">
                <span>إضافة مهمة</span>
                <Plus size={16} /> 
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openModal('invoiceForm', {})} className="cursor-pointer flex flex-row-reverse justify-end gap-2">
                <span>إضافة فاتورة</span>
                <Receipt size={16} /> 
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openModal('recordCreditModal', {})} className="cursor-pointer flex flex-row-reverse justify-end gap-2">
                <span>إضافة دفعة مقدمة</span>
                <CreditCard size={16} /> 
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => openModal('urgentAlert', {})} className="text-destructive focus:text-destructive cursor-pointer flex flex-row-reverse justify-end gap-2">
                <span>تنبيه عاجل</span>
                <AlertTriangle size={16} /> 
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <NotificationBell />

          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger className="outline-none">
              <div className="flex items-center gap-2 hover:bg-accent rounded-full p-1 pr-2 transition-colors border border-transparent hover:border-border">
                <div className="text-right hidden md:block">
                  <div className="text-sm font-medium leading-none">{user?.display_name || 'مستخدم'}</div>
                  <div className="text-xs text-muted-foreground mt-1">محامي</div>
                </div>
                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold border border-primary/10">
                  {user?.display_name?.charAt(0).toUpperCase() || 'م'}
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 text-right">
              <DropdownMenuLabel className="text-right">حسابي</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer flex flex-row-reverse justify-end gap-2">
                <span>الإعدادات</span>
                <Settings size={16} /> 
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer flex flex-row-reverse justify-end gap-2">
                <span>تسجيل الخروج</span>
                <LogOut size={16} /> 
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
