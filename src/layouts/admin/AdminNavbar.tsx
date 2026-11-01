import { useState, useRef, useEffect, useMemo } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useTranslation } from 'react-i18next';
import Logo from '@/shared/ui/primitives/Logo';
import NotificationBell from '@/layouts/admin/NotificationBell';
import ThemeToggleButton from '@/shared/ui/primitives/ThemeToggleButton';
import FontSizeToggleButton from '@/shared/ui/primitives/FontSizeToggleButton';
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
import {
  buildSettlementQabdPreset,
  buildSettlementSarfPreset,
} from '@/features/financials/utils/settlementPresets';

// ─── Smooth Hover Dropdown Component (No Pinning) ──────────────
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
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = (e: React.MouseEvent) => {
    if (ref.current && e.relatedTarget && ref.current.contains(e.relatedTarget as Node)) {
      return;
    }
    setIsOpen(false);
  };

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  const handleContentClick = () => {
    setTimeout(() => {
      setIsOpen(false);
    }, 50);
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="relative inline-block cursor-pointer select-none"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="cursor-pointer inline-flex items-center" onClick={handleToggleClick}>
        {trigger}
      </div>

      {isOpen && (
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleContentClick}
          className={`absolute ${align === 'start' ? 'left-0' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'right-0'
            } top-full pt-1 z-[9999] cursor-pointer`}
        >
          <div className="absolute -top-3 left-0 right-0 h-4" />

          <div className={`rounded-xl nav-dropdown-panel p-1.5 backdrop-blur-md outline-none cursor-pointer ${className}`}>
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
  const menuItemClass = "flex items-center justify-start gap-2.5 px-3 py-2 text-xs font-bold rounded-lg nav-dropdown-item cursor-pointer transition-colors text-right";
  const managementItemClass = "flex items-center justify-start gap-2.5 px-3 py-2 text-xs font-extrabold rounded-lg nav-dropdown-management-item cursor-pointer transition-colors text-right";
  const listItemClass = "flex items-center justify-start px-3 py-2 text-xs font-bold rounded-lg nav-dropdown-item cursor-pointer transition-colors text-right";

  // Navigation link & dropdown trigger styling matching oceanic/sapphire navbar theme
  const navItemClass = (isActive: boolean) =>
    `flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-all outline-none cursor-pointer whitespace-nowrap ${
      isActive
        ? 'bg-white/25 dark:bg-sky-500/25 text-white dark:text-sky-100 border border-white/35 dark:border-sky-400/30 shadow-2xs'
        : 'text-white/90 dark:text-sky-100/85 hover:bg-white/15 dark:hover:bg-sky-500/15 hover:text-white border border-transparent'
    }`;

  return (
    <nav
      className="sticky top-0 z-50 w-full border-b select-none shadow-sm transition-all"
      style={{
        backgroundImage: 'var(--token-navbar-bg)',
        borderColor: 'var(--token-navbar-border)',
        color: 'var(--token-navbar-text)',
      }}
      dir="rtl"
    >
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
            className={({ isActive }) => navItemClass(isActive)}
          >
            <LayoutDashboard size={15} />
            <span>{t('dashboard.title') || 'لوحة التحكم'}</span>
          </NavLink>

          {/* العملاء Dropdown */}
          <NavHoverDropdown
            trigger={
              <button className={navItemClass(location.pathname.startsWith('/clients') || location.pathname.startsWith('/receivables'))}>
                <Users size={15} />
                <span>{t('clients.title') || 'العملاء'}</span>
                <ChevronDown size={13} className="opacity-80" />
              </button>
            }
          >
            <Link to={'/receivables'} className={managementItemClass}>
              <CreditCard size={16} className="text-current flex-shrink-0" />
              <span>تقرير العملاء</span>
            </Link>
            <Link to={'/clients'} className={menuItemClass}>
              <Users size={16} className="text-sky-600 dark:text-sky-400 flex-shrink-0" />
              <span>إدارة العملاء</span>
            </Link>
            <div onClick={() => openModal('clientForm', {})} className={menuItemClass}>
              <Plus size={16} className="text-sky-600 dark:text-sky-400 flex-shrink-0" />
              <span>إضافة عميل</span>
            </div>
            <div onClick={() => openModal('taskForm', {})} className={menuItemClass}>
              <Plus size={16} className="text-sky-600 dark:text-sky-400 flex-shrink-0" />
              <span>إضافة مهمة</span>
            </div>
          </NavHoverDropdown>

          {/* الموظفين Dropdown */}
          <NavHoverDropdown
            className="w-56 text-right max-h-[70vh] overflow-y-auto"
            trigger={
              <button className={navItemClass(isEmployeesActive)}>
                <UserCog size={15} />
                <span>الموظفين</span>
                <ChevronDown size={13} className="opacity-80" />
              </button>
            }
          >
            <Link to={'/settings'} className={managementItemClass}>
              <UserCog size={16} className="text-current flex-shrink-0" />
              <span>إدارة الموظفين</span>
            </Link>
            <div onClick={() => openModal('employeeReport', {})} className={menuItemClass}>
              <FileSpreadsheet size={16} className="text-sky-600 dark:text-sky-400 flex-shrink-0" />
              <span>كشف حساب الموظف</span>
            </div>
            <div onClick={() => openModal('createEmployee', { isAdmin: canManageEmployeeType })} className={menuItemClass}>
              <Plus size={16} className="text-sky-600 dark:text-sky-400 flex-shrink-0" />
              <span>إضافة موظف</span>
            </div>
            <div className="border-t my-1" style={{ borderColor: 'var(--token-navbar-dropdown-divider)' }} />
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
                <Link to={`/employees/${employee.id}/dashboard`} className={listItemClass}>
                  <span>{employee.display_name}</span>
                </Link>
              ))
            )}
          </NavHoverDropdown>

          {/* الصندوق Dropdown */}
          <NavHoverDropdown
            className="min-w-48 text-right max-h-80 overflow-y-auto"
            trigger={
              <button className={navItemClass(isCashboxActive)}>
                <Wallet size={15} />
                <span>الصندوق</span>
                <ChevronDown size={13} className="opacity-80" />
              </button>
            }
          >
            <Link to={'/financial-center/treasury-accounts?section=assets&category=cashbox'} className={managementItemClass}>
              <Wallet size={16} className="text-current flex-shrink-0" />
              <span>إدارة الصناديق</span>
            </Link>
            <div onClick={() => openModal('treasuryAccountReport', { subType: 'cashbox' })} className={menuItemClass}>
              <FileSpreadsheet size={16} className="text-sky-600 dark:text-sky-400 flex-shrink-0" />
              <span>كشف حساب الصندوق</span>
            </div>
            <div onClick={() => openModal('treasuryCreateAccount', { initialSectionId: 'assets', defaultSubType: 'cashbox' })} className={menuItemClass}>
              <Plus size={16} className="text-sky-600 dark:text-sky-400 flex-shrink-0" />
              <span>إضافة صندوق</span>
            </div>
            <div className="border-t my-1" style={{ borderColor: 'var(--token-navbar-dropdown-divider)' }} />
            {cashboxAccounts.length === 0 ? (
              <div className="py-4 px-4 text-center text-xs text-text-secondary">
                لا توجد صناديق
              </div>
            ) : (
              cashboxAccounts.map((account) => (
                <Link to={`/financial-center/treasury-accounts/${account.id}`} className={listItemClass}>
                  <span className="whitespace-nowrap">{account.name}</span>
                </Link>
              ))
            )}
          </NavHoverDropdown>

          {/* البنك Dropdown */}
          <NavHoverDropdown
            className="min-w-48 text-right max-h-80 overflow-y-auto"
            trigger={
              <button className={navItemClass(isBankActive)}>
                <Landmark size={15} />
                <span>البنك</span>
                <ChevronDown size={13} className="opacity-80" />
              </button>
            }
          >
            <Link to={'/financial-center/treasury-accounts?section=assets&category=bank'} className={managementItemClass}>
              <Landmark size={16} className="text-current flex-shrink-0" />
              <span>إدارة البنوك</span>
            </Link>
            <div onClick={() => openModal('treasuryAccountReport', { subType: 'bank' })} className={menuItemClass}>
              <FileSpreadsheet size={16} className="text-sky-600 dark:text-sky-400 flex-shrink-0" />
              <span>كشف حساب البنك</span>
            </div>
            <div onClick={() => openModal('treasuryCreateAccount', { initialSectionId: 'assets', defaultSubType: 'bank' })} className={menuItemClass}>
              <Plus size={16} className="text-sky-600 dark:text-sky-400 flex-shrink-0" />
              <span>إضافة حساب بنكي</span>
            </div>
            <div className="border-t my-1" style={{ borderColor: 'var(--token-navbar-dropdown-divider)' }} />
            {bankAccounts.length === 0 ? (
              <div className="py-4 px-4 text-center text-xs text-text-secondary">
                لا توجد حسابات بنكية
              </div>
            ) : (
              bankAccounts.map((account) => (
                <Link to={`/financial-center/treasury-accounts/${account.id}`} className={listItemClass}>
                  <span className="whitespace-nowrap">{account.name}</span>
                </Link>
              ))
            )}
          </NavHoverDropdown>

          {/* المركز المالي Dropdown */}
          <NavHoverDropdown
            className="w-64 text-right"
            trigger={
              <button className={navItemClass(isFinancialActive)}>
                <Wallet size={15} />
                <span>المركز المالي</span>
                <ChevronDown size={13} className="opacity-80" />
              </button>
            }
          >
            <div onClick={() => openModal('clientReport', {})} className={menuItemClass}>
              <FileSpreadsheet size={16} className="text-sky-600 dark:text-sky-400 flex-shrink-0" />
              <span>كشف حساب العميل</span>
            </div>
            <div onClick={() => openModal('employeeReport', {})} className={menuItemClass}>
              <FileSpreadsheet size={16} className="text-sky-600 dark:text-sky-400 flex-shrink-0" />
              <span>كشف حساب الموظف</span>
            </div>
            <div onClick={() => openModal('accountReport', {})} className={menuItemClass}>
              <FileSpreadsheet size={16} className="text-sky-600 dark:text-sky-400 flex-shrink-0" />
              <span>تقرير حسابات</span>
            </div>
            <div className="border-t my-1" style={{ borderColor: 'var(--token-navbar-dropdown-divider)' }} />
            <Link to={'/financial-center/treasury-accounts'} className={menuItemClass}>
              <FolderTree size={16} className="text-sky-600 dark:text-sky-400 flex-shrink-0" />
              <span>شجرة الحسابات</span>
            </Link>
          </NavHoverDropdown>

          {/* المهام Dropdown */}
          <NavHoverDropdown
            className="w-48 text-right"
            trigger={
              <button className={navItemClass(isTasksActive)}>
                <NotebookText size={15} />
                <span>المهام</span>
                <ChevronDown size={13} className="opacity-80" />
              </button>
            }
          >
            {taskNavigationItems.map((item) => {
              const ItemIcon = item.icon;
              return (
                <Link to={item.path} className={menuItemClass}>
                  <ItemIcon size={16} className="text-sky-600 dark:text-sky-400 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </NavHoverDropdown>

          {/* Settings link */}
          <NavLink
            to="/settings"
            className={({ isActive }) => navItemClass(isActive)}
          >
            <Settings size={15} />
            <span>{t('settings.title') || 'الإعدادات'}</span>
          </NavLink>

          {/* ── Quick Transactions Bar: Settlement only for Admin ───────────── */}
          <div className="ms-2 shrink-0">
            <NavHoverDropdown
              align="end"
              className="w-36 text-right"
              trigger={
                <button
                  type="button"
                  className="h-7.5 px-3 text-xs font-bold gap-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white border border-white/35 flex items-center whitespace-nowrap cursor-pointer shadow-2xs transition-all active:scale-95"
                >
                  <span>تسوية</span>
                  <ChevronDown size={11} className="text-white/80" />
                </button>
              }
            >
              <div
                className="flex items-center justify-start gap-2 text-xs font-bold text-status-success-text cursor-pointer hover:bg-status-success-bg/20 py-2 px-2 rounded"
                onClick={() =>
                  openModal('unifiedTransaction', buildSettlementQabdPreset({ kind: 'cashbox' }))
                }
              >
                <TrendingUp size={13} />
                <span>تسوية قبض</span>
              </div>
              <div
                className="flex items-center justify-start gap-2 text-xs font-bold text-status-danger-text cursor-pointer hover:bg-status-danger-bg/20 py-2 px-2 rounded"
                onClick={() =>
                  openModal('unifiedTransaction', buildSettlementSarfPreset({ kind: 'cashbox' }))
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
              className="flex items-center w-full px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-colors shadow-2xs bg-white/20 dark:bg-slate-900/50 border border-white/30 dark:border-sky-500/30 text-white placeholder:text-white/70 hover:bg-white/25"
              onClick={handleSearchFocus}
            >
              <Search size={14} className="ml-2 text-white/80" />
              <span className="text-white/85">بحث سريع...</span>
              <span className="mr-auto text-[10px] font-mono border border-white/30 dark:border-sky-500/30 px-1.5 py-0.5 rounded bg-white/15 dark:bg-slate-800 text-white">Ctrl K</span>
            </div>
          </div>

          {/* Quick Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 text-white border border-white/30 transition-all shadow-2xs active:scale-95 cursor-pointer">
                <Plus size={18} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 text-right z-[9999] nav-dropdown-panel rounded-xl p-1.5 backdrop-blur-md"
            >
              <DropdownMenuItem onClick={() => openModal('taskForm', {})} className="cursor-pointer flex flex-row-reverse justify-end gap-2.5 py-2 px-3 text-xs font-bold rounded-lg nav-dropdown-item">
                <span>إضافة مهمة</span>
                <Plus size={15} className="text-sky-600 dark:text-sky-400" />
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openModal('invoiceForm', {})} className="cursor-pointer flex flex-row-reverse justify-end gap-2.5 py-2 px-3 text-xs font-bold rounded-lg nav-dropdown-item">
                <span>إضافة فاتورة</span>
                <Receipt size={15} className="text-sky-600 dark:text-sky-400" />
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openModal('recordCreditModal', {})} className="cursor-pointer flex flex-row-reverse justify-end gap-2.5 py-2 px-3 text-xs font-bold rounded-lg nav-dropdown-item">
                <span>إضافة دفعة مقدمة</span>
                <CreditCard size={15} className="text-sky-600 dark:text-sky-400" />
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1" style={{ backgroundColor: 'var(--token-navbar-dropdown-divider)' }} />
              <DropdownMenuItem onClick={() => openModal('unifiedTransaction', buildSettlementQabdPreset({ kind: 'cashbox' }))} className="cursor-pointer flex flex-row-reverse justify-end gap-2.5 font-bold py-2 px-3 text-xs rounded-lg nav-dropdown-item">
                <span>سند تسوية</span>
                <TrendingUp size={15} className="text-emerald-500" />
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1" style={{ backgroundColor: 'var(--token-navbar-dropdown-divider)' }} />
              <DropdownMenuItem onClick={() => openModal('urgentAlert', {})} className="text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer flex flex-row-reverse justify-end gap-2.5 py-2 px-3 text-xs font-bold rounded-lg">
                <span>تنبيه عاجل</span>
                <AlertTriangle size={15} />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications & Theme */}
          <ThemeToggleButton />
          <NotificationBell />

          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger className="outline-none cursor-pointer">
              <div className="flex items-center gap-2 rounded-full p-1 pr-2 transition-colors border border-white/25 hover:bg-white/15 cursor-pointer">
                <div className="text-right hidden md:block">
                  <div className="text-xs font-bold leading-none text-white">{user?.display_name || 'Admin'}</div>
                  <div className="text-[10px] text-white/80 mt-1">محامي</div>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/25 text-white flex items-center justify-center font-bold text-xs border border-white/40 shadow-2xs">
                  {user?.display_name?.charAt(0).toUpperCase() || 'A'}
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 text-right z-[9999] nav-dropdown-panel rounded-xl p-1.5 backdrop-blur-md"
            >
              <FontSizeToggleButton variant="menu-item" />
              <DropdownMenuSeparator className="my-1" style={{ backgroundColor: 'var(--token-navbar-dropdown-divider)' }} />
              <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer flex flex-row-reverse justify-end gap-2.5 py-2 px-3 text-xs font-bold rounded-lg nav-dropdown-item">
                <span>الإعدادات</span>
                <Settings size={15} className="text-sky-600 dark:text-sky-400" />
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1" style={{ backgroundColor: 'var(--token-navbar-dropdown-divider)' }} />
              <DropdownMenuItem onClick={handleLogout} className="text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer flex flex-row-reverse justify-end gap-2.5 py-2 px-3 text-xs font-bold rounded-lg">
                <span>تسجيل الخروج</span>
                <LogOut size={15} />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
