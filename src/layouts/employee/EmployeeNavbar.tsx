import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import Logo from '@/shared/ui/primitives/Logo';
import NotificationBell from '@/layouts/admin/NotificationBell';
import ThemeToggleButton from '@/shared/ui/primitives/ThemeToggleButton';
import {
    Home, ClipboardList, Users, DollarSign, LogOut,
    Search, ChevronDown, FileText,
    Receipt, UserPlus,
    Settings, Wallet
} from 'lucide-react';
import { useGetMyTreasuryAccounts } from '@/features/financials/api/treasuryQueries';
import { useModalStore } from '@/shared/stores/modalStore';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/shared/ui/shadcn/dropdown-menu';
import { useMemo } from 'react';

/**
 * EmployeeNavbar - Horizontal navigation bar for employee users
 * Matches admin navbar style but with employee-specific navigation
 */
const EmployeeNavbar = () => {
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);
    const navigate = useNavigate();
    const openModal = useModalStore((state) => state.openModal);

    const handleSearchFocus = () => {
        openModal('clientSearch', {});
    };

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

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

    const location = useLocation();
    const match = location.pathname.match(/\/employee\/treasury-accounts\/(\d+)/);
    const activeAccountId = match ? match[1] : null;
    const isCashboxActive = activeAccountId ? cashboxAccounts.some((a) => String(a.id) === activeAccountId) : false;
    const isBankActive = activeAccountId ? bankAccounts.some((a) => String(a.id) === activeAccountId) : false;
    const isOtherActive = activeAccountId ? otherAccounts.some((a) => String(a.id) === activeAccountId) : false;

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
                    <div className="hidden md:flex items-center gap-1 overflow-x-auto scrollbar-hide">
                        {/* الصفحة الرئيسية */}
                        <NavLink
                            to="/employee/dashboard"
                            className={({ isActive }) =>
                                `flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-md transition-colors whitespace-nowrap ${isActive
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-text-secondary hover:bg-accent hover:text-accent-foreground'
                                }`
                            }
                        >
                            <Home size={16} />
                            <span>الصفحة الرئيسية</span>
                        </NavLink>

                        {/* العملاء Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger className="flex items-center gap-1.5 px-3 py-2 text-sm font-bold rounded-md text-text-secondary hover:bg-accent hover:text-accent-foreground transition-colors outline-none">
                                <Users size={16} />
                                <span>العملاء</span>
                                <ChevronDown size={14} className="text-text-secondary opacity-70" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 text-right">
                                <DropdownMenuItem onClick={() => openModal('clientForm', {})} className="cursor-pointer flex flex-row-reverse justify-end gap-3 px-3 py-2 text-sm font-bold">
                                    <span>إضافة عميل</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => openModal('invoiceForm', {})} className="cursor-pointer flex flex-row-reverse justify-end gap-3 px-3 py-2 text-sm font-bold">
                                    <span>إضافة فاتورة</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <NavLink to="/employee/clients" className="flex items-center gap-3 w-full cursor-pointer flex-row-reverse justify-end px-3 py-2 text-sm font-bold">
                                        <span>صفحة إدارة العملاء</span>
                                    </NavLink>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <NavLink to="/employee/receivables" className="flex items-center gap-3 w-full cursor-pointer flex-row-reverse justify-end px-3 py-2 text-sm font-bold">
                                        <span>مستحقات العملاء</span>
                                    </NavLink>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* الصناديق Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger className={`flex items-center gap-1.5 px-3 py-2 text-sm font-bold rounded-md transition-colors outline-none ${isCashboxActive ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-accent hover:text-accent-foreground'}`}>
                                <span>الصناديق</span>
                                <ChevronDown size={14} className="text-text-secondary opacity-70" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-0 text-center max-h-80 overflow-y-auto">
                                {cashboxAccounts.length === 0 ? (
                                    <div className="py-4 px-4 text-xs text-text-secondary whitespace-nowrap">
                                        لا توجد صناديق
                                    </div>
                               ) : (
                                    cashboxAccounts.map((account) => (
                                        <DropdownMenuItem key={account.id} asChild>
                                            <NavLink
                                                to={`/employee/treasury-accounts/${account.id}`}
                                                className="flex items-center justify-center w-full cursor-pointer px-4 py-2 text-sm font-bold"
                                            >
                                                <span className="whitespace-nowrap">{account.name}</span>
                                            </NavLink>
                                        </DropdownMenuItem>
                                    ))
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* البنوك Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger className={`flex items-center gap-1.5 px-3 py-2 text-sm font-bold rounded-md transition-colors outline-none ${isBankActive ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-accent hover:text-accent-foreground'}`}>
                                <span>البنوك</span>
                                <ChevronDown size={14} className="text-text-secondary opacity-70" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-0 text-center max-h-80 overflow-y-auto">
                                {bankAccounts.length === 0 ? (
                                    <div className="py-4 px-4 text-xs text-text-secondary whitespace-nowrap">
                                        لا توجد حسابات بنكية
                                    </div>
                                ) : (
                                    bankAccounts.map((account) => (
                                        <DropdownMenuItem key={account.id} asChild>
                                            <NavLink
                                                to={`/employee/treasury-accounts/${account.id}`}
                                                className="flex items-center justify-center w-full cursor-pointer px-4 py-2 text-sm font-bold"
                                            >
                                                <span className="whitespace-nowrap">{account.name}</span>
                                            </NavLink>
                                        </DropdownMenuItem>
                                    ))
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* حسابات أخرى Dropdown (only shows if accounts exist) */}
                        {otherAccounts.length > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger className={`flex items-center gap-1.5 px-3 py-2 text-sm font-bold rounded-md transition-colors outline-none ${isOtherActive ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-accent hover:text-accent-foreground'}`}>
                                    <span>حسابات أخرى</span>
                                    <ChevronDown size={14} className="text-text-secondary opacity-70" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="min-w-0 text-center max-h-80 overflow-y-auto">
                                    {otherAccounts.map((account) => (
                                        <DropdownMenuItem key={account.id} asChild>
                                            <NavLink
                                                to={`/employee/treasury-accounts/${account.id}`}
                                                className="flex items-center justify-center w-full cursor-pointer px-4 py-2 text-sm font-bold"
                                            >
                                                <span className="whitespace-nowrap">{account.name}</span>
                                            </NavLink>
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}

                        {/* المهام Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger className="flex items-center gap-1.5 px-3 py-2 text-sm font-bold rounded-md text-text-secondary hover:bg-accent hover:text-accent-foreground transition-colors outline-none">
                                <ClipboardList size={16} />
                                <span>المهام</span>
                                <ChevronDown size={14} className="text-text-secondary opacity-70" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 text-right">
                                <DropdownMenuItem onClick={() => openModal('taskForm', {})} className="cursor-pointer flex flex-row-reverse justify-end gap-3 px-3 py-2 text-sm font-bold">
                                    <span>إضافة مهمة</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <NavLink to="/employee/tasks" className="flex items-center gap-3 w-full cursor-pointer flex-row-reverse justify-end px-3 py-2 text-sm font-bold">
                                        <span>صفحة المهام</span>
                                    </NavLink>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Center Group: Quick Action Buttons */}
                <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
                    {(user?.type === 'admin' || user?.type === 'employee_admin' || user?.can_make_transactions) && (
                        <>
                            <button
                                onClick={() => openModal('unifiedTransaction', { title: 'سند قبض' })}
                                className="px-3 py-1.5 text-sm font-bold border border-status-success-border text-status-success-text rounded-md hover:bg-status-success-bg transition-colors"
                            >
                                سند قبض
                            </button>
                            <button
                                onClick={() => openModal('unifiedTransaction', { title: 'سند صرف' })}
                                className="px-3 py-1.5 text-sm font-bold border border-status-danger-border text-status-danger-text rounded-md hover:bg-status-danger-bg transition-colors"
                            >
                                سند صرف
                            </button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        className="px-3 py-1.5 text-sm font-bold border border-border text-text-primary rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                                    >
                                        سند تسوية
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="text-right">
                                    <DropdownMenuItem
                                        className="cursor-pointer flex flex-row-reverse justify-end gap-2 text-status-success-text font-bold"
                                        onClick={() => openModal('unifiedTransaction', {
                                            defaultFromCardType: 'settlement',
                                            title: 'تسوية قبض',
                                        })}
                                    >
                                        تسوية قبض
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        className="cursor-pointer flex flex-row-reverse justify-end gap-2 text-status-danger-text font-bold"
                                        onClick={() => openModal('unifiedTransaction', {
                                            defaultToCardType: 'settlement',
                                            title: 'تسوية صرف',
                                        })}
                                    >
                                        تسوية صرف
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </>
                    )}
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

                    {/* Notifications */}
                    <NotificationBell />

                    {/* User Profile */}
                    <DropdownMenu>
                        <DropdownMenuTrigger className="outline-none">
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
                        <DropdownMenuContent align="end" className="w-56 text-right">
                            <DropdownMenuLabel className="text-right">حسابي</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild className="cursor-pointer flex flex-row-reverse justify-end gap-2">
                                <Link to="/employee/settings">
                                    <span>الإعدادات</span>
                                    <Settings size={16} />
                                </Link>
                            </DropdownMenuItem>
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

export default EmployeeNavbar;
