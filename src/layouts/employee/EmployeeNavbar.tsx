import { useState, useRef, useEffect, useMemo } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import Logo from '@/shared/ui/primitives/Logo';
import NotificationBell from '@/layouts/admin/NotificationBell';
import ThemeToggleButton from '@/shared/ui/primitives/ThemeToggleButton';
import FontSizeToggleButton from '@/shared/ui/primitives/FontSizeToggleButton';
import {
  Home, ClipboardList, Users, LogOut,
  Search, ChevronDown, Plus, FileSpreadsheet,
  Settings, TrendingUp, TrendingDown, UserCog, Wallet, Landmark, CreditCard
} from 'lucide-react';
import { useGetMyTreasuryAccounts } from '@/features/financials/api/treasuryQueries';
import { useCanUseSettlement } from '@/features/financials/api/treasuryQueries';
import { useModalStore } from '@/shared/stores/modalStore';
import {
  buildSettlementQabdPreset,
  buildSettlementSarfPreset,
} from '@/features/financials/utils/settlementPresets';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/shared/ui/shadcn/dropdown-menu';
import Button from '@/shared/ui/primitives/Button';

// ─── Smooth Hover Dropdown Component (No Pinning) ──────────────
const NavHoverDropdown = ({
  trigger,
  children,
  align = 'start',
  className = '',
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

          <div className={`rounded-md border border-border bg-card p-1 text-card-foreground shadow-xl outline-none cursor-pointer ${className}`}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * EmployeeNavbar - Horizontal navigation bar for employee users
 */
const EmployeeNavbar = () => {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const location = useLocation();
  const openModal = useModalStore((state) => state.openModal);

  // Fetch treasury accounts assigned to the current employee
  const { data: myTreasuryAccounts = [] } = useGetMyTreasuryAccounts();
  // The navbar offers تسوية on every employee page; hide it when the employee has no
  // can_transact on the settlement account. Absent permission row counts as no access.
  const { canUseSettlement } = useCanUseSettlement();

  // Group accounts
  const cashboxAccounts = useMemo(
    () => myTreasuryAccounts.filter((a) => a.sub_type === 'cashbox'),
    [myTreasuryAccounts]
  );
  const bankAccounts = useMemo(
    () => myTreasuryAccounts.filter((a) => a.sub_type === 'bank'),
    [myTreasuryAccounts]
  );
  const otherAccounts = useMemo(() => {
    const parseMeta = (meta: any) => {
      if (!meta) return null;
      if (typeof meta === 'string') {
        try { return JSON.parse(meta); } catch { return null; }
      }
      return meta;
    };
    return myTreasuryAccounts.filter((t) => {
      const meta = parseMeta(t.metadata);
      const isSettlement =
        meta?.is_settlement === true ||
        meta?.is_settlement === 'true' ||
        meta?.type === 'settlement';
      return t.sub_type !== 'cashbox' && t.sub_type !== 'bank' && !isSettlement;
    });
  }, [myTreasuryAccounts]);

  const match = location.pathname.match(/\/employee\/treasury-accounts\/(\d+)/);
  const activeAccountId = match ? match[1] : null;
  const isCashboxActive = activeAccountId ? cashboxAccounts.some((a) => String(a.id) === activeAccountId) : false;
  const isBankActive = activeAccountId ? bankAccounts.some((a) => String(a.id) === activeAccountId) : false;
  const isOtherActive = activeAccountId ? otherAccounts.some((a) => String(a.id) === activeAccountId) : false;

  const canMakeTransactions =
    user?.type === 'admin' || user?.type === 'employee_admin' || user?.can_make_transactions !== false;

  const handleSearchFocus = () => {
    openModal('clientSearch', {});
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  // Shared menuItem style with icon FIRST in JSX
  const menuItemClass = "flex items-center justify-start gap-2.5 px-3 py-2 text-sm font-bold rounded hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors text-right";
  const managementItemClass = "flex items-center justify-start gap-2.5 px-3 py-2 text-sm font-extrabold rounded text-primary hover:underline hover:bg-primary/10 cursor-pointer transition-colors text-right";
  const listItemClass = "flex items-center justify-start px-3 py-2 text-sm font-bold rounded hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors text-right";

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
        {/* Right Group: Logo, Welcome, Navigation */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Logo */}
          <div className="flex-shrink-0 ml-4">
            <Logo />
          </div>

          {/* Welcome Message */}
          <div className="hidden xl:block mr-4 flex-shrink-0">
            <span className="text-sm font-bold text-white">
              مرحباً {user?.display_name}
            </span>
          </div>

          {/* Main Navigation - Desktop */}
          <div className="hidden md:flex items-center gap-1 overflow-visible">
            {/* الصفحة الرئيسية */}
            <NavLink
              to="/employee/dashboard"
              className={({ isActive }) => navItemClass(isActive)}
            >
              <Home size={15} />
              <span>الصفحة الرئيسية</span>
            </NavLink>

            {/* العملاء Dropdown */}
            <NavHoverDropdown
              trigger={
                <button className={navItemClass(location.pathname.startsWith('/employee/clients') || location.pathname.startsWith('/employee/receivables'))}>
                  <Users size={15} />
                  <span>العملاء</span>
                  <ChevronDown size={13} className="opacity-80" />
                </button>
              }
            >
              <div className="min-w-48 text-right">
                <Link to={'/employee/receivables'} className={managementItemClass}>
                  <CreditCard size={16} className="text-primary flex-shrink-0" />
                  <span>تقرير العملاء</span>
                </Link>
                <Link to={'/employee/clients'} className={menuItemClass}>
                  <Users size={16} className="text-foreground flex-shrink-0" />
                  <span>إدارة العملاء</span>
                </Link>
                <div onClick={() => openModal('clientForm', {})} className={menuItemClass}>
                  <Plus size={16} className="text-foreground flex-shrink-0" />
                  <span>إضافة عميل</span>
                </div>
                <div onClick={() => openModal('taskForm', {})} className={menuItemClass}>
                  <Plus size={16} className="text-foreground flex-shrink-0" />
                  <span>إضافة مهمة</span>
                </div>
              </div>
            </NavHoverDropdown>

            {/* الصناديق Dropdown */}
            <NavHoverDropdown
              className="min-w-48 text-right max-h-80 overflow-y-auto"
              trigger={
                <button className={navItemClass(isCashboxActive)}>
                  <Wallet size={15} />
                  <span>الصناديق</span>
                  <ChevronDown size={13} className="opacity-80" />
                </button>
              }
            >
              <div onClick={() => openModal('treasuryAccountReport', { subType: 'cashbox' })} className={menuItemClass}>
                <FileSpreadsheet size={16} className="text-foreground flex-shrink-0" />
                <span>كشف حساب الصندوق</span>
              </div>
              <div className="border-t border-border my-1" />
              {cashboxAccounts.length === 0 ? (
                <div className="py-4 px-4 text-center text-xs text-text-secondary">
                  لا توجد صناديق
                </div>
              ) : (
                cashboxAccounts.map((account) => (
                  <Link to={`/employee/treasury-accounts/${account.id}`} className={listItemClass}>
                    <span className="whitespace-nowrap">{account.name}</span>
                  </Link>
                ))
              )}
            </NavHoverDropdown>

            {/* البنوك Dropdown */}
            <NavHoverDropdown
              className="min-w-48 text-right max-h-80 overflow-y-auto"
              trigger={
                <button className={navItemClass(isBankActive)}>
                  <Landmark size={15} />
                  <span>البنوك</span>
                  <ChevronDown size={13} className="opacity-80" />
                </button>
              }
            >
              <div onClick={() => openModal('treasuryAccountReport', { subType: 'bank' })} className={menuItemClass}>
                <FileSpreadsheet size={16} className="text-foreground flex-shrink-0" />
                <span>كشف حساب البنك</span>
              </div>
              <div className="border-t border-border my-1" />
              {bankAccounts.length === 0 ? (
                <div className="py-4 px-4 text-center text-xs text-text-secondary">
                  لا توجد حسابات بنكية
                </div>
              ) : (
                bankAccounts.map((account) => (
                  <Link to={`/employee/treasury-accounts/${account.id}`} className={listItemClass}>
                    <span className="whitespace-nowrap">{account.name}</span>
                  </Link>
                ))
              )}
            </NavHoverDropdown>

            {/* حسابات أخرى Dropdown */}
            {otherAccounts.length > 0 && (
              <NavHoverDropdown
                className="min-w-48 text-right max-h-80 overflow-y-auto"
                trigger={
                  <button className={navItemClass(isOtherActive)}>
                    <span>حسابات أخرى</span>
                    <ChevronDown size={13} className="opacity-80" />
                  </button>
                }
              >
                {otherAccounts.map((account) => (
                  <Link to={`/employee/treasury-accounts/${account.id}`} className={listItemClass}>
                    <span className="whitespace-nowrap">{account.name}</span>
                  </Link>
                ))}
              </NavHoverDropdown>
            )}

            {/* المهام Dropdown */}
            <NavHoverDropdown
              className="w-48 text-right"
              trigger={
                <button className={navItemClass(location.pathname.startsWith('/employee/tasks'))}>
                  <ClipboardList size={15} />
                  <span>المهام</span>
                  <ChevronDown size={13} className="opacity-80" />
                </button>
              }
            >
              <div onClick={() => openModal('taskForm', {})} className={menuItemClass}>
                <Plus size={16} className="text-foreground flex-shrink-0" />
                <span>إضافة مهمة</span>
              </div>
              <div className="border-t border-border my-1" />
              <Link to={'/employee/tasks'} className={menuItemClass}>
                <ClipboardList size={16} className="text-foreground flex-shrink-0" />
                <span>صفحة المهام</span>
              </Link>
            </NavHoverDropdown>

            {/* معاملاتي / سجل المعاملات */}
            <NavLink
              to="/employee/financials?tab=history"
              className={({ isActive }) => navItemClass(isActive || location.pathname.startsWith('/employee/financials'))}
            >
              <FileSpreadsheet size={15} />
              <span>سجل المعاملات</span>
            </NavLink>
          </div>
        </div>

        {/* Left Group: Search, Notification, Profile */}
        <div className="flex items-center gap-2 ms-auto">
          {/* Search */}
          <div className="relative hidden xxl:block w-48 ml-2">
            <div
              className="flex items-center w-full px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-colors shadow-2xs bg-white/20 dark:bg-slate-900/50 border border-white/30 dark:border-sky-500/30 text-white placeholder:text-white/70 hover:bg-white/25"
              onClick={handleSearchFocus}
            >
              <Search size={14} className="ml-2 text-white/80" />
              <span className="text-white/85">بحث...</span>
            </div>
          </div>

          <ThemeToggleButton />
          <NotificationBell />

          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger className="outline-none cursor-pointer">
              <div className="flex items-center gap-2 hover:bg-accent rounded-full p-1 pr-2 transition-colors border border-transparent hover:border-border">
                <div className="text-right hidden md:block">
                  <div className="text-sm font-medium leading-none">{user?.display_name || 'موظف'}</div>
                  <div className="text-xs text-text-secondary mt-1 text-[10px]">
                    {user?.commission_rate && `عمولة ${user.commission_rate}%`}
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold border border-primary/10">
                  {user?.display_name?.charAt(0).toUpperCase() || 'م'}
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 text-right z-[9999]">
              <FontSizeToggleButton variant="menu-item" />
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="cursor-pointer flex flex-row-reverse justify-end gap-2 py-2 text-sm font-bold">
                <Link to="/employee/settings">
                  <span>الإعدادات</span>
                  <Settings size={16} />
                </Link>
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

export default EmployeeNavbar;
