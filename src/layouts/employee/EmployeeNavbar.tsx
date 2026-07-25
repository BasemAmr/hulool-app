import { useState, useRef, useEffect, useMemo } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import Logo from '@/shared/ui/primitives/Logo';
import NotificationBell from '@/layouts/admin/NotificationBell';
import ThemeToggleButton from '@/shared/ui/primitives/ThemeToggleButton';
import {
  Home, ClipboardList, Users, LogOut,
  Search, ChevronDown, Plus, FileSpreadsheet,
  Settings, TrendingUp, TrendingDown, UserCog, Wallet, Landmark, CreditCard
} from 'lucide-react';
import { useGetMyTreasuryAccounts } from '@/features/financials/api/treasuryQueries';
import { useModalStore } from '@/shared/stores/modalStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/shared/ui/shadcn/dropdown-menu';
import Button from '@/shared/ui/primitives/Button';

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
    user?.type === 'admin' || user?.type === 'employee_admin' || user?.can_make_transactions;

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

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60" dir="rtl">
      <div className="flex h-16 items-center px-4 gap-4">
        {/* Right Group: Logo, Welcome, Navigation */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Logo */}
          <div className="flex-shrink-0 ml-4">
            <Logo />
          </div>

          {/* Welcome Message */}
          <div className="hidden xl:block mr-4 flex-shrink-0">
            <span className="text-sm font-bold text-text-primary">
              مرحباً {user?.display_name}
            </span>
          </div>

          {/* Main Navigation - Desktop */}
          <div className="hidden md:flex items-center gap-1 overflow-visible">
            {/* الصفحة الرئيسية */}
            <NavLink
              to="/employee/dashboard"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-md transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-secondary hover:bg-accent hover:text-accent-foreground'
                }`
              }
            >
              <Home size={16} />
              <span>الصفحة الرئيسية</span>
            </NavLink>

            {/* العملاء Dropdown */}
            <NavHoverDropdown
              trigger={
                <button className={`flex items-center gap-1.5 px-3 py-2 text-sm font-bold rounded-md transition-colors outline-none cursor-pointer ${
                  location.pathname.startsWith('/employee/clients')
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-secondary hover:bg-accent hover:text-accent-foreground'
                }`}>
                  <Users size={16} />
                  <span>العملاء</span>
                  <ChevronDown size={14} className="text-text-secondary opacity-70" />
                </button>
              }
            >
              <div onClick={() => navigate('/employee/clients')} className={managementItemClass}>
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
              <div onClick={() => navigate('/employee/receivables')} className={menuItemClass}>
                <CreditCard size={16} className="text-foreground flex-shrink-0" />
                <span>مستحقات العملاء</span>
              </div>
            </NavHoverDropdown>

            {/* الصناديق Dropdown */}
            <NavHoverDropdown
              className="min-w-48 text-right max-h-80 overflow-y-auto"
              trigger={
                <button className={`flex items-center gap-1.5 px-3 py-2 text-sm font-bold rounded-md transition-colors outline-none cursor-pointer ${
                  isCashboxActive ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-accent hover:text-accent-foreground'
                }`}>
                  <Wallet size={16} />
                  <span>الصناديق</span>
                  <ChevronDown size={14} className="text-text-secondary opacity-70" />
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
                  <div
                    key={account.id}
                    onClick={() => navigate(`/employee/treasury-accounts/${account.id}`)}
                    className={listItemClass}
                  >
                    <span className="whitespace-nowrap">{account.name}</span>
                  </div>
                ))
              )}
            </NavHoverDropdown>

            {/* البنوك Dropdown */}
            <NavHoverDropdown
              className="min-w-48 text-right max-h-80 overflow-y-auto"
              trigger={
                <button className={`flex items-center gap-1.5 px-3 py-2 text-sm font-bold rounded-md transition-colors outline-none cursor-pointer ${
                  isBankActive ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-accent hover:text-accent-foreground'
                }`}>
                  <Landmark size={16} />
                  <span>البنوك</span>
                  <ChevronDown size={14} className="text-text-secondary opacity-70" />
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
                  <div
                    key={account.id}
                    onClick={() => navigate(`/employee/treasury-accounts/${account.id}`)}
                    className={listItemClass}
                  >
                    <span className="whitespace-nowrap">{account.name}</span>
                  </div>
                ))
              )}
            </NavHoverDropdown>

            {/* حسابات أخرى Dropdown */}
            {otherAccounts.length > 0 && (
              <NavHoverDropdown
                className="min-w-48 text-right max-h-80 overflow-y-auto"
                trigger={
                  <button className={`flex items-center gap-1.5 px-3 py-2 text-sm font-bold rounded-md transition-colors outline-none cursor-pointer ${
                    isOtherActive ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-accent hover:text-accent-foreground'
                  }`}>
                    <span>حسابات أخرى</span>
                    <ChevronDown size={14} className="text-text-secondary opacity-70" />
                  </button>
                }
              >
                {otherAccounts.map((account) => (
                  <div
                    key={account.id}
                    onClick={() => navigate(`/employee/treasury-accounts/${account.id}`)}
                    className={listItemClass}
                  >
                    <span className="whitespace-nowrap">{account.name}</span>
                  </div>
                ))}
              </NavHoverDropdown>
            )}

            {/* المهام Dropdown */}
            <NavHoverDropdown
              className="w-48 text-right"
              trigger={
                <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-bold rounded-md text-text-secondary hover:bg-accent hover:text-accent-foreground transition-colors outline-none cursor-pointer">
                  <ClipboardList size={16} />
                  <span>المهام</span>
                  <ChevronDown size={14} className="text-text-secondary opacity-70" />
                </button>
              }
            >
              <div onClick={() => openModal('taskForm', {})} className={menuItemClass}>
                <Plus size={16} className="text-foreground flex-shrink-0" />
                <span>إضافة مهمة</span>
              </div>
              <div className="border-t border-border my-1" />
              <div onClick={() => navigate('/employee/tasks')} className={menuItemClass}>
                <ClipboardList size={16} className="text-foreground flex-shrink-0" />
                <span>صفحة المهام</span>
              </div>
            </NavHoverDropdown>

            {/* ── Quick Transactions Bar (Center AFTER all menu links) ───────────── */}
            {canMakeTransactions && (
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
            )}
          </div>
        </div>

        {/* Left Group: Search, Notification, Profile */}
        <div className="flex items-center gap-2 flex-1 justify-end">
          {/* Search */}
          <div className="relative hidden xxl:block w-48 ml-2">
            <div
              className="flex items-center w-full px-3 py-1.5 bg-background border border-input rounded-md text-sm text-text-secondary cursor-pointer hover:bg-background transition-colors"
              onClick={handleSearchFocus}
            >
              <Search size={16} className="ml-2" />
              <span>بحث...</span>
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
