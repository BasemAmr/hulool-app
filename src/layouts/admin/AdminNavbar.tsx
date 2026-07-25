import { useState, useRef, useEffect, useMemo } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useTranslation } from 'react-i18next';
import Logo from '@/shared/ui/primitives/Logo';
import NotificationBell from '@/layouts/admin/NotificationBell';
import ThemeToggleButton from '@/shared/ui/primitives/ThemeToggleButton';
import { 
  LayoutDashboard, NotebookText, Users, Settings, 
  Building, Calculator, Home, Briefcase, Plus, Receipt, 
  CreditCard, AlertTriangle, UserCog, Wallet, Landmark,
  Search, ChevronDown, Loader, TrendingUp, TrendingDown, FolderTree, FileSpreadsheet, LogOut
} from 'lucide-react';
import { useModalStore } from '@/shared/stores/modalStore';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
} from '@/shared/ui/shadcn/dropdown-menu';
import Button from '@/shared/ui/primitives/Button';
import { useGetEmployeesForSelection } from '@/features/employees/api/employeeQueries';
import { useGetTreasuryAccounts } from '@/features/financials/api/treasuryQueries';
import type { TreasuryAccount } from '@/api/types';

// ─── Smooth 0.3s Hover & Unpin-on-Any-Click Dropdown Component ──────────────
const NavHoverDropdown = ({
  trigger,
  children,
  align = 'end',
  className = 'w-56 text-right',
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'start' | 'end' | 'center';
  className?: string;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isOpen = isHovered || isPinned;

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsHovered(true);
  };

  const handleMouseLeave = (e: React.MouseEvent) => {
    if (isPinned) return;
    if (ref.current && e.relatedTarget && ref.current.contains(e.relatedTarget as Node)) {
      return;
    }
    timeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 300);
  };

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (isPinned) {
      setIsPinned(false);
      setIsHovered(false);
    } else {
      setIsPinned(true);
      setIsHovered(true);
    }
  };

  useEffect(() => {
    if (!isPinned) return;

    const handleAnyClick = (e: MouseEvent) => {
      if (ref.current && ref.current.contains(e.target as Node)) {
        return;
      }
      setIsPinned(false);
      setIsHovered(false);
    };

    document.addEventListener('click', handleAnyClick, true);
    return () => {
      document.removeEventListener('click', handleAnyClick, true);
    };
  }, [isPinned]);

  return (
    <div
      ref={ref}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div onClick={handleTriggerClick} className="cursor-pointer [&>*]:pointer-events-none">
        {trigger}
      </div>

      {isOpen && (
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={() => {
            setTimeout(() => {
              setIsPinned(false);
              setIsHovered(false);
            }, 0);
          }}
          className={`absolute ${
            align === 'start' ? 'left-0' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'right-0'
          } top-full pt-1 z-[9999]`}
        >
          <div className="absolute -top-3 left-0 right-0 h-4" />

          <div className={`rounded-md border border-border bg-card p-1 text-card-foreground shadow-xl outline-none ${className}`}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Admin Navbar Component ─────────────────────────────────────────────
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

  const match = location.pathname.match(/\/financial-center\/treasury-accounts\/(\d+)/);
  const activeAccountId = match ? match[1] : null;
  const isCashboxActive = activeAccountId ? cashboxAccounts.some((a: any) => String(a.id) === activeAccountId) : false;
  const isBankActive = activeAccountId ? bankAccounts.some((a: any) => String(a.id) === activeAccountId) : false;

  const taskNavigationItems = [
    { path: '/tasks', icon: NotebookText, label: 'الكل' },
    { path: '/tasks?type=Government', icon: Building, label: 'حكومية' },
    { path: '/tasks?type=Accounting', icon: Calculator, label: 'محاسبية' },
    { path: '/tasks?type=RealEstate', icon: Home, label: 'عقارية' },
    { path: '/tasks?type=Other', icon: Briefcase, label: 'أخرى' }
  ];

  const isFinancialActive = location.pathname.startsWith('/financial-center') && !isCashboxActive && !isBankActive;
  const isTasksActive = location.pathname.startsWith('/tasks');

  // Shared menuItem style with icon FIRST in JSX (renders on the RIGHT edge in RTL)
  const menuItemClass = "flex items-center justify-start gap-2.5 px-3 py-2 text-sm font-bold rounded hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors text-right";
  const managementItemClass = "flex items-center justify-start gap-2.5 px-3 py-2 text-sm font-extrabold rounded text-primary hover:underline hover:bg-primary/10 cursor-pointer transition-colors text-right";
  const listItemClass = "flex items-center justify-start px-3 py-2 text-sm font-bold rounded hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors text-right";

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60" dir="rtl">
      <div className="flex h-16 items-center px-4 gap-4">
        {/* Logo */}
        <div className="flex-shrink-0 ml-4">
          <Logo />
        </div>

        {/* Main Navigation - Desktop */}
        <div className="hidden md:flex items-center gap-1 flex-1 overflow-visible">
          {/* Dashboard link */}
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-md transition-colors whitespace-nowrap ${isActive
                ? 'bg-primary/10 text-primary'
                : 'text-text-secondary hover:bg-accent hover:text-accent-foreground'
              }`
            }
          >
            <LayoutDashboard size={16} />
            <span>{t('dashboard.title') || 'لوحة التحكم'}</span>
          </NavLink>

          {/* العملاء Dropdown */}
          <NavHoverDropdown
            trigger={
              <button className={`flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-md transition-colors outline-none cursor-pointer ${location.pathname.startsWith('/clients')
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-secondary hover:bg-accent hover:text-accent-foreground'
                }`}>
                <Users size={16} />
                <span>{t('clients.title') || 'العملاء'}</span>
                <ChevronDown size={14} className="text-text-secondary" />
              </button>
            }
          >
            <div onClick={() => navigate('/clients')} className={managementItemClass}>
              <Users size={16} className="text-primary flex-shrink-0" />
              <span>إدارة العملاء</span>
            </div>
            <div onClick={() => openModal('clientReport', {})} className={menuItemClass}>
              <FileSpreadsheet size={16} className="text-foreground flex-shrink-0" />
              <span>كشف حساب العميل</span>
            </div>
            <div onClick={() => openModal('clientForm', {})} className={menuItemClass}>
              <Plus size={16} className="text-foreground flex-shrink-0" />
              <span>إضافة عميل</span>
            </div>
            <div onClick={() => openModal('taskForm', {})} className={menuItemClass}>
              <Plus size={16} className="text-foreground flex-shrink-0" />
              <span>إضافة مهمة</span>
            </div>
            <div className="border-t border-border my-1" />
            <div onClick={() => navigate('/receivables')} className={menuItemClass}>
              <CreditCard size={16} className="text-foreground flex-shrink-0" />
              <span>مستحقات العملاء</span>
            </div>
          </NavHoverDropdown>

          {/* الموظفين Dropdown */}
          <NavHoverDropdown
            className="w-56 text-right max-h-[70vh] overflow-y-auto"
            trigger={
              <button className={`flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-md transition-colors outline-none cursor-pointer ${isEmployeesActive ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-accent hover:text-accent-foreground'}`}>
                <UserCog size={16} />
                <span>الموظفين</span>
                <ChevronDown size={14} className="text-text-secondary" />
              </button>
            }
          >
            <div onClick={() => navigate('/settings')} className={managementItemClass}>
              <UserCog size={16} className="text-primary flex-shrink-0" />
              <span>إدارة الموظفين</span>
            </div>
            <div onClick={() => openModal('employeeReport', {})} className={menuItemClass}>
              <FileSpreadsheet size={16} className="text-foreground flex-shrink-0" />
              <span>كشف حساب الموظف</span>
            </div>
            <div onClick={() => openModal('createEmployee', { isAdmin: canManageEmployeeType })} className={menuItemClass}>
              <Plus size={16} className="text-foreground flex-shrink-0" />
              <span>إضافة موظف</span>
            </div>
            <div className="border-t border-border my-1" />
            {employeesLoading ? (
              <div className="flex items-center justify-center py-4 gap-2 text-text-secondary">
                <Loader size={16} className="animate-spin" />
                <span className="text-xs">جاري التحميل...</span>
              </div>
            ) : employees.length === 0 ? (
              <div className="py-4 text-center text-xs text-text-secondary">
                لا توجد موظفين
              </div>
            ) : (
              employees.map((employee) => (
                <div
                  key={employee.id}
                  onClick={() => navigate(`/employees/${employee.id}/dashboard`)}
                  className={listItemClass}
                >
                  <span>{employee.display_name}</span>
                </div>
              ))
            )}
          </NavHoverDropdown>

          {/* الصندوق Dropdown */}
          <NavHoverDropdown
            className="min-w-48 text-right max-h-80 overflow-y-auto"
            trigger={
              <button className={`flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-md transition-colors outline-none cursor-pointer ${isCashboxActive ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-accent hover:text-accent-foreground'}`}>
                <Wallet size={16} />
                <span>الصندوق</span>
                <ChevronDown size={14} className="text-text-secondary" />
              </button>
            }
          >
            <div onClick={() => navigate('/financial-center/treasury-accounts?section=assets&category=cashbox')} className={managementItemClass}>
              <Wallet size={16} className="text-primary flex-shrink-0" />
              <span>إدارة الصناديق</span>
            </div>
            <div onClick={() => openModal('treasuryAccountReport', { subType: 'cashbox' })} className={menuItemClass}>
              <FileSpreadsheet size={16} className="text-foreground flex-shrink-0" />
              <span>كشف حساب الصندوق</span>
            </div>
            <div onClick={() => openModal('treasuryCreateAccount', { initialSectionId: 'assets', defaultSubType: 'cashbox' })} className={menuItemClass}>
              <Plus size={16} className="text-foreground flex-shrink-0" />
              <span>إضافة صندوق</span>
            </div>
            <div className="border-t border-border my-1" />
            {cashboxAccounts.length === 0 ? (
              <div className="py-4 px-4 text-center text-xs text-text-secondary">
                لا توجد صناديق
              </div>
            ) : (
              cashboxAccounts.map((account) => (
                <div
                  key={account.id}
                  onClick={() => navigate(`/financial-center/treasury-accounts/${account.id}`)}
                  className={listItemClass}
                >
                  <span className="whitespace-nowrap">{account.name}</span>
                </div>
              ))
            )}
          </NavHoverDropdown>

          {/* البنك Dropdown */}
          <NavHoverDropdown
            className="min-w-48 text-right max-h-80 overflow-y-auto"
            trigger={
              <button className={`flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-md transition-colors outline-none cursor-pointer ${isBankActive ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-accent hover:text-accent-foreground'}`}>
                <Landmark size={16} />
                <span>البنك</span>
                <ChevronDown size={14} className="text-text-secondary" />
              </button>
            }
          >
            <div onClick={() => navigate('/financial-center/treasury-accounts?section=assets&category=bank')} className={managementItemClass}>
              <Landmark size={16} className="text-primary flex-shrink-0" />
              <span>إدارة البنوك</span>
            </div>
            <div onClick={() => openModal('treasuryAccountReport', { subType: 'bank' })} className={menuItemClass}>
              <FileSpreadsheet size={16} className="text-foreground flex-shrink-0" />
              <span>كشف حساب البنك</span>
            </div>
            <div onClick={() => openModal('treasuryCreateAccount', { initialSectionId: 'assets', defaultSubType: 'bank' })} className={menuItemClass}>
              <Plus size={16} className="text-foreground flex-shrink-0" />
              <span>إضافة حساب بنكي</span>
            </div>
            <div className="border-t border-border my-1" />
            {bankAccounts.length === 0 ? (
              <div className="py-4 px-4 text-center text-xs text-text-secondary">
                لا توجد حسابات بنكية
              </div>
            ) : (
              bankAccounts.map((account) => (
                <div
                  key={account.id}
                  onClick={() => navigate(`/financial-center/treasury-accounts/${account.id}`)}
                  className={listItemClass}
                >
                  <span className="whitespace-nowrap">{account.name}</span>
                </div>
              ))
            )}
          </NavHoverDropdown>

          {/* المركز المالي Dropdown */}
          <NavHoverDropdown
            className="w-64 text-right"
            trigger={
              <button className={`flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-md transition-colors outline-none cursor-pointer ${isFinancialActive ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-accent hover:text-accent-foreground'}`}>
                <Wallet size={16} />
                <span>المركز المالي</span>
                <ChevronDown size={14} className="text-text-secondary" />
              </button>
            }
          >
            <div onClick={() => openModal('clientReport', {})} className={menuItemClass}>
              <FileSpreadsheet size={16} className="text-foreground flex-shrink-0" />
              <span>كشف حساب العميل</span>
            </div>
            <div onClick={() => openModal('employeeReport', {})} className={menuItemClass}>
              <FileSpreadsheet size={16} className="text-foreground flex-shrink-0" />
              <span>كشف حساب الموظف</span>
            </div>
            <div onClick={() => openModal('accountReport', {})} className={menuItemClass}>
              <FileSpreadsheet size={16} className="text-foreground flex-shrink-0" />
              <span>تقرير حسابات</span>
            </div>
            <div className="border-t border-border my-1" />
            <div onClick={() => navigate('/financial-center/treasury-accounts')} className={menuItemClass}>
              <FolderTree size={16} className="text-foreground flex-shrink-0" />
              <span>شجرة الحسابات</span>
            </div>
          </NavHoverDropdown>

          {/* المهام Dropdown */}
          <NavHoverDropdown
            className="w-48 text-right"
            trigger={
              <button className={`flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-md transition-colors outline-none cursor-pointer ${isTasksActive ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-accent hover:text-accent-foreground'}`}>
                <NotebookText size={16} />
                <span>المهام</span>
                <ChevronDown size={14} className="text-text-secondary" />
              </button>
            }
          >
            {taskNavigationItems.map((item) => {
              const ItemIcon = item.icon;
              return (
                <div
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={menuItemClass}
                >
                  <ItemIcon size={16} className="text-foreground flex-shrink-0" />
                  <span>{item.label}</span>
                </div>
              );
            })}
          </NavHoverDropdown>

          {/* Settings link */}
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-md transition-colors whitespace-nowrap ${isActive
                ? 'bg-primary/10 text-primary'
                : 'text-text-secondary hover:bg-accent hover:text-accent-foreground'
              }`
            }
          >
            <Settings size={16} />
            <span>{t('settings.title') || 'الإعدادات'}</span>
          </NavLink>

          {/* ── Quick Transactions Bar (Center AFTER all menu links) ───────────── */}
          <div className="flex items-center gap-1.5 ms-2 px-2 py-0.5 rounded-lg border border-border/60 bg-muted/30">
            <Button
              variant="outline-success"
              size="sm"
              className="h-7 px-2 text-xs font-bold gap-1 whitespace-nowrap"
              onClick={() =>
                openModal('unifiedTransaction', {
                  title: 'سند قبض',
                  defaultFromCardType: 'client',
                  defaultToCardType: 'treasury',
                  lockDirection: false,
                })
              }
            >
              <TrendingUp size={12} />
              <span>سند قبض</span>
            </Button>

            <Button
              variant="outline-danger"
              size="sm"
              className="h-7 px-2 text-xs font-bold gap-1 whitespace-nowrap"
              onClick={() =>
                openModal('unifiedTransaction', {
                  title: 'سند صرف',
                  defaultFromCardType: 'treasury',
                  defaultToCardType: 'client',
                  lockDirection: false,
                })
              }
            >
              <TrendingDown size={12} />
              <span>سند صرف</span>
            </Button>

            <NavHoverDropdown
              align="end"
              className="w-36 text-right"
              trigger={
                <Button
                  variant="outline-secondary"
                  size="sm"
                  className="h-7 px-2 text-xs font-bold gap-1 whitespace-nowrap cursor-pointer"
                >
                  <span>تسوية</span>
                  <ChevronDown size={11} />
                </Button>
              }
            >
              <div
                className="flex items-center justify-start gap-2 text-xs font-bold text-status-success-text cursor-pointer hover:bg-status-success-bg/20 py-2 px-2 rounded"
                onClick={() =>
                  openModal('unifiedTransaction', {
                    title: 'تسوية قبض',
                    defaultFromCardType: 'client',
                    defaultToCardType: 'settlement',
                    lockDirection: false,
                  })
                }
              >
                <TrendingUp size={13} />
                <span>تسوية قبض</span>
              </div>
              <div
                className="flex items-center justify-start gap-2 text-xs font-bold text-status-danger-text cursor-pointer hover:bg-status-danger-bg/20 py-2 px-2 rounded"
                onClick={() =>
                  openModal('unifiedTransaction', {
                    title: 'تسوية صرف',
                    defaultFromCardType: 'settlement',
                    defaultToCardType: 'client',
                    lockDirection: false,
                  })
                }
              >
                <TrendingDown size={13} />
                <span>تسوية صرف</span>
              </div>
            </NavHoverDropdown>
          </div>
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
              <button className="flex items-center justify-center w-9 h-9 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm cursor-pointer">
                <Plus size={20} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 text-right z-[9999]">
              <DropdownMenuItem onClick={() => openModal('taskForm', {})} className="cursor-pointer flex flex-row-reverse justify-end gap-2 py-2 text-sm font-bold">
                <span>إضافة مهمة</span>
                <Plus size={16} />
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openModal('invoiceForm', {})} className="cursor-pointer flex flex-row-reverse justify-end gap-2 py-2 text-sm font-bold">
                <span>إضافة فاتورة</span>
                <Receipt size={16} />
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openModal('recordCreditModal', {})} className="cursor-pointer flex flex-row-reverse justify-end gap-2 py-2 text-sm font-bold">
                <span>إضافة دفعة مقدمة</span>
                <CreditCard size={16} />
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => openModal('unifiedTransaction', { title: 'سند قبض', defaultFromCardType: 'client', lockDirection: false })} className="cursor-pointer flex flex-row-reverse justify-end gap-2 text-status-success-text font-bold py-2 text-sm">
                <span>سند قبض</span>
                <TrendingUp size={16} className="text-status-success-text" />
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openModal('unifiedTransaction', { title: 'سند صرف', defaultToCardType: 'client', lockDirection: false })} className="cursor-pointer flex flex-row-reverse justify-end gap-2 text-status-danger-text font-bold py-2 text-sm">
                <span>سند صرف</span>
                <TrendingDown size={16} className="text-status-danger-text" />
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openModal('unifiedTransaction', { title: 'تسوية قبض', defaultFromCardType: 'client', defaultToCardType: 'settlement', lockDirection: false })} className="cursor-pointer flex flex-row-reverse justify-end gap-2 font-bold py-2 text-sm">
                <span>سند تسوية</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => openModal('urgentAlert', {})} className="text-destructive focus:text-destructive cursor-pointer flex flex-row-reverse justify-end gap-2 py-2 text-sm font-bold">
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
            <DropdownMenuTrigger className="outline-none cursor-pointer">
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
            <DropdownMenuContent align="end" className="w-56 text-right z-[9999]">
              <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer flex flex-row-reverse justify-end gap-2 py-2 text-sm font-bold">
                <span>الإعدادات</span>
                <Settings size={16} />
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer flex flex-row-reverse justify-end gap-2 py-2 text-sm font-bold">
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
