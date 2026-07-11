import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
import Logo from '@/shared/ui/primitives/Logo';
import NotificationBell from '@/layouts/admin/NotificationBell';
import ThemeToggleButton from '@/shared/ui/primitives/ThemeToggleButton';
import { 
  LayoutDashboard, LogOut, NotebookText, Users, Settings, 
  Building, Calculator, Home, Briefcase, Plus, Receipt, 
  CreditCard, AlertTriangle, UserCog, Wallet,
  Search, ChevronDown, Menu, Loader, TrendingUp, TrendingDown, FolderTree, FileSpreadsheet
} from 'lucide-react';
import { useModalStore } from '@/shared/stores/modalStore';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
} from '@/shared/ui/shadcn/dropdown-menu';
import Button from '@/shared/ui/primitives/Button';
import { useGetEmployeesForSelection } from '@/features/employees/api/employeeQueries';
import { useGetTreasuryAccounts } from '@/features/financials/api/treasuryQueries';
import type { TreasuryAccount } from '@/api/types';

const Navbar = () => {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const openModal = useModalStore((state) => state.openModal);
  const { data: employees = [], isLoading: employeesLoading } = useGetEmployeesForSelection();
  const canManageEmployeeType = user?.type === 'admin' || user?.type === 'employee_admin' || Boolean(user?.capabilities?.manage_options);

  const handleSearchFocus = () => {
    openModal('clientSearch', {});
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const isEmployeesActive = location.pathname.startsWith('/employees');

  const { data: treasuryAccounts = [] } = useGetTreasuryAccounts();

  const cashboxAccounts = useMemo(
    () => treasuryAccounts.filter((a: TreasuryAccount) => a.sub_type === 'cashbox'),
    [treasuryAccounts]
  );
  const bankAccounts = useMemo(
    () => treasuryAccounts.filter((a: TreasuryAccount) => a.sub_type === 'bank'),
    [treasuryAccounts]
  );

  const isCashboxActive = location.pathname.startsWith('/financial-center/cash-boxes/');
  const isBankActive = location.pathname.startsWith('/financial-center/treasury-accounts/');

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

  const isFinancialActive = location.pathname === '/financial-center';
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
          {/* Dashboard link */}
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-md transition-colors whitespace-nowrap ${
                isActive 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-text-secondary hover:bg-accent hover:text-accent-foreground'
              }`
            }
          >
            <LayoutDashboard size={16} />
            <span>{t('dashboard.title') || 'لوحة التحكم'}</span>
          </NavLink>

          {/* Clients Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className={`flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-md transition-colors outline-none ${
              location.pathname.startsWith('/clients')
                ? 'bg-primary/10 text-primary'
                : 'text-text-secondary hover:bg-accent hover:text-accent-foreground'
            }`}>
              <Users size={16} />
              <span>{t('clients.title') || 'العملاء'}</span>
              <ChevronDown size={14} className="text-text-secondary" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 text-right">
              <DropdownMenuLabel className="text-right font-extrabold text-base">
                إدارة العملاء
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => openModal('clientForm', {})} className="cursor-pointer flex flex-row-reverse justify-end gap-3 px-3 py-3">
                <Plus size={18} />
                <span className="text-base font-extrabold">إضافة عميل</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openModal('clientReport', {})} className="cursor-pointer flex flex-row-reverse justify-end gap-3 px-3 py-3">
                <FileSpreadsheet size={18} />
                <span className="text-base font-extrabold">تقرير عملاء</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <NavLink to="/clients" className="flex items-center gap-3 w-full cursor-pointer flex-row-reverse justify-end px-3 py-3">
                  <Users size={18} />
                  <span className="text-base font-extrabold">صفحة ادارة العملاء</span>
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <NavLink to="/receivables" className="flex items-center gap-3 w-full cursor-pointer flex-row-reverse justify-end px-3 py-3">
                  <span className="text-base font-extrabold">ادارة المستحقات المالية</span>
                </NavLink>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Employees Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className={`flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-md transition-colors outline-none ${isEmployeesActive ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-accent hover:text-accent-foreground'}`}>
              <UserCog size={16} />
              <span>الموظفين</span>
              <ChevronDown size={14} className="text-text-secondary" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 text-right max-h-[70vh] overflow-y-auto">
              <DropdownMenuLabel className="text-right font-extrabold text-base">
                إدارة الموظفين
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => openModal('createEmployee', { isAdmin: canManageEmployeeType })}
                className="cursor-pointer flex flex-row-reverse justify-end gap-2 px-3 py-2"
              >
                <Plus size={18} />
                <span className="text-base font-extrabold">إضافة موظف</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openModal('employeeReport', {})} className="cursor-pointer flex flex-row-reverse justify-end gap-3 px-3 py-3">
                <FileSpreadsheet size={18} />
                <span className="text-base font-extrabold">تقرير موظف</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {employeesLoading ? (
                <div className="flex items-center justify-center py-4 gap-2 text-text-secondary">
                  <Loader size={16} className="animate-spin" />
                  <span className="text-sm">جاري التحميل...</span>
                </div>
              ) : employees.length === 0 ? (
                <div className="py-4 text-center text-sm text-text-secondary">
                  لا توجد موظفين
                </div>
              ) : (
                employees.map((employee) => (
                  <DropdownMenuItem key={employee.id} asChild>
                    <NavLink 
                      to={`/employees/${employee.id}/dashboard`} 
                      className="flex font-bold items-center gap-2 w-full cursor-pointer flex-row-reverse justify-end px-3 py-2"
                    >
                      <span>{employee.display_name}</span>
                    </NavLink>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Cashbox Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className={`flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-md transition-colors outline-none ${isCashboxActive ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-accent hover:text-accent-foreground'}`}>
              <span>الصندوق</span>
              <ChevronDown size={14} className="text-text-secondary" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-0 text-center max-h-80 overflow-y-auto">
              <DropdownMenuLabel className="text-center font-extrabold text-sm px-4 py-2">
                الصندوق
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {cashboxAccounts.length === 0 ? (
                <div className="py-4 px-4 text-sm text-text-secondary whitespace-nowrap">
                  لا توجد صناديق
                </div>
              ) : (
                cashboxAccounts.map((account) => (
                  <DropdownMenuItem key={account.id} asChild>
                    <NavLink
                      to={`/financial-center/cash-boxes/${account.id}`}
                      className="flex items-center justify-center w-full cursor-pointer px-4 py-2"
                    >
                      <span className="font-bold text-sm whitespace-nowrap">{account.name}</span>
                    </NavLink>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Bank Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className={`flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-md transition-colors outline-none ${isBankActive ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-accent hover:text-accent-foreground'}`}>
              <span>البنك</span>
              <ChevronDown size={14} className="text-text-secondary" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-0 text-center max-h-80 overflow-y-auto">
              <DropdownMenuLabel className="text-center font-extrabold text-sm px-4 py-2">
                البنك
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {bankAccounts.length === 0 ? (
                <div className="py-4 px-4 text-sm text-text-secondary whitespace-nowrap">
                  لا توجد حسابات بنكية
                </div>
              ) : (
                bankAccounts.map((account) => (
                  <DropdownMenuItem key={account.id} asChild>
                    <NavLink
                      to={`/financial-center/treasury-accounts/${account.id}`}
                      className="flex items-center justify-center w-full cursor-pointer px-4 py-2"
                    >
                      <span className="font-bold text-sm whitespace-nowrap">{account.name}</span>
                    </NavLink>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Financial Center Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className={`flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-md transition-colors outline-none ${isFinancialActive ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-accent hover:text-accent-foreground'}`}>
              <Wallet size={16} />
              <span>المركز المالي</span>
              <ChevronDown size={14} className="text-text-secondary" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 text-right">
              <DropdownMenuLabel className="text-right font-extrabold text-sm bg-muted/50 px-3 py-2">
                تقارير
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={() => openModal('clientReport', {})} className="cursor-pointer flex flex-row-reverse justify-end gap-3 px-3 py-3">
                <FileSpreadsheet size={18} />
                <span className="text-base font-extrabold">تقرير العملاء</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openModal('employeeReport', {})} className="cursor-pointer flex flex-row-reverse justify-end gap-3 px-3 py-3">
                <FileSpreadsheet size={18} />
                <span className="text-base font-extrabold">تقرير الموظفين</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openModal('accountReport', {})} className="cursor-pointer flex flex-row-reverse justify-end gap-3 px-3 py-3">
                <FileSpreadsheet size={18} />
                <span className="text-base font-extrabold">تقرير حسابات</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <NavLink to="/financial-center/treasury-accounts" className="flex items-center gap-3 w-full cursor-pointer flex-row-reverse justify-end px-3 py-3">
                  <FolderTree size={18} />
                  <span className="text-base font-extrabold">شجرة الحسابات</span>
                </NavLink>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Tasks Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className={`flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-md transition-colors outline-none ${isTasksActive ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-accent hover:text-accent-foreground'}`}>
              <NotebookText size={16} />
              <span>المهام</span>
              <ChevronDown size={14} className="text-text-secondary" />
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

          {/* Settings link */}
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-md transition-colors whitespace-nowrap ${
                isActive 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-text-secondary hover:bg-accent hover:text-accent-foreground'
              }`
            }
          >
            <Settings size={16} />
            <span>{t('settings.title') || 'الإعدادات'}</span>
          </NavLink>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-2 mr-auto">
          {/* Search */}
          <div className="relative hidden sm:block w-64 ml-2">
            <div 
              className="flex items-center w-full px-3 py-1.5 bg-background border border-input rounded-md text-sm text-text-secondary cursor-pointer hover:bg-background transition-colors"
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
              <DropdownMenuItem onClick={() => openModal('unifiedTransaction', { title: 'سند قبض' })} className="cursor-pointer flex flex-row-reverse justify-end gap-2 text-status-success-text font-bold">
                <span>سند قبض</span>
                <TrendingUp size={16} className="text-status-success-text" />
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openModal('unifiedTransaction', { title: 'سند صرف' })} className="cursor-pointer flex flex-row-reverse justify-end gap-2 text-status-danger-text font-bold">
                <span>سند صرف</span>
                <TrendingDown size={16} className="text-status-danger-text" />
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openModal('unifiedTransaction', { title: 'سند تسوية' })} className="cursor-pointer flex flex-row-reverse justify-end gap-2 font-bold">
                <span>سند تسوية</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => openModal('urgentAlert', {})} className="text-destructive focus:text-destructive cursor-pointer flex flex-row-reverse justify-end gap-2">
                <span>تنبيه عاجل</span>
                <AlertTriangle size={16} /> 
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <ThemeToggleButton />
          <NotificationBell />

          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger className="outline-none">
              <div className="flex items-center gap-2 hover:bg-accent rounded-full p-1 pr-2 transition-colors border border-transparent hover:border-border">
                <div className="text-right hidden md:block">
                  <div className="text-sm font-bold leading-none">{user?.display_name || 'مستخدم'}</div>
                  <div className="text-xs text-text-secondary mt-1">محامي</div>
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
