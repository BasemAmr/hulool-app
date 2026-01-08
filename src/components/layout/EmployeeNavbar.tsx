import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import Logo from '../ui/Logo';
import NotificationBell from './NotificationBell';
import {
    Home, ClipboardList, Users, DollarSign, LogOut,
    Search, ChevronDown, FileText,
    TrendingUp, TrendingDown, Receipt, UserPlus
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

    // Employee navigation items
    const employeeNavigationItems = [
        { path: '/employee/dashboard', icon: Home, label: 'لوحة التحكم' },
        { path: '/employee/tasks', icon: ClipboardList, label: 'مهامي' },
        { path: '/employee/clients', icon: Users, label: 'العملاء' },
        { path: '/employee/receivables', icon: FileText, label: 'مستحقات العملاء' },
        { path: '/employee/financials', icon: DollarSign, label: 'الماليات' },
    ];

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
                        <span className="text-sm font-bold text-black">
                            مرحباً {user?.display_name}
                        </span>
                    </div>

                    {/* Main Navigation - Desktop */}
                    <div className="hidden md:flex items-center gap-1 overflow-x-auto scrollbar-hide">
                        {employeeNavigationItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) =>
                                    `flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-md transition-colors whitespace-nowrap ${isActive
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                    }`
                                }
                            >
                                <item.icon size={16} />
                                <span>{item.label}</span>
                            </NavLink>
                        ))}
                    </div>
                </div>

                {/* Center Group: Quick Action Buttons */}
                <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
                    <button
                        onClick={() => openModal('clientForm', {})}
                        className="px-3 py-1.5 text-sm font-bold border border-blue-600 text-blue-600 rounded-md hover:bg-blue-600 hover:text-white transition-colors"
                    >
                        <UserPlus size={14} className="inline me-1" />
                        إضافة عميل
                    </button>
                    <button
                        onClick={() => openModal('taskForm', {})}
                        className="px-3 py-1.5 text-sm font-bold border border-primary text-primary rounded-md hover:bg-primary hover:text-white transition-colors"
                    >
                        <FileText size={14} className="inline me-1" />
                        إضافة مهمة
                    </button>
                    <button
                        onClick={() => openModal('invoiceForm', {})}
                        className="px-3 py-1.5 text-sm font-bold border border-border text-black rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                        <Receipt size={14} className="inline me-1" />
                        إضافة فاتورة
                    </button>
                    <button
                        onClick={() => openModal('manualTransaction', { direction: 'repayment', accountType: 'client' })}
                        className="px-3 py-1.5 text-sm font-bold border border-green-600 text-green-600 rounded-md hover:bg-green-600 hover:text-white transition-colors"
                    >
                        <TrendingUp size={14} className="inline me-1" />
                        سند قبض
                    </button>
                    <button
                        onClick={() => openModal('manualTransaction', { direction: 'payout', accountType: 'client' })}
                        className="px-3 py-1.5 text-sm font-bold border border-red-600 text-red-600 rounded-md hover:bg-red-600 hover:text-white transition-colors"
                    >
                        <TrendingDown size={14} className="inline me-1" />
                        سند صرف
                    </button>
                </div>

                {/* Left Group: Search, Notification, Profile */}
                <div className="flex items-center gap-2 flex-1 justify-end">
                    {/* Search */}
                    <div className="relative hidden xxl:block w-48 ml-2">
                        <div
                            className="flex items-center w-full px-3 py-1.5 bg-muted/50 border border-input rounded-md text-sm text-muted-foreground cursor-pointer hover:bg-muted transition-colors"
                            onClick={handleSearchFocus}
                        >
                            <Search size={16} className="ml-2" />
                            <span>بحث...</span>
                        </div>
                    </div>

                    {/* Notifications */}
                    <NotificationBell />

                    {/* User Profile */}
                    <DropdownMenu>
                        <DropdownMenuTrigger className="outline-none">
                            <div className="flex items-center gap-2 hover:bg-accent rounded-full p-1 pr-2 transition-colors border border-transparent hover:border-border">
                                <div className="text-right hidden md:block">
                                    <div className="text-sm font-medium leading-none">{user?.display_name || 'موظف'}</div>
                                    <div className="text-xs text-muted-foreground mt-1 text-[10px]">
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
