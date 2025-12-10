import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import Logo from '../ui/Logo';
import NotificationBell from './NotificationBell';
import {
    Home, ClipboardList, Users, DollarSign, LogOut,
    Search, ChevronDown, FileText
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
                {/* Logo */}
                <div className="flex-shrink-0 ml-4">
                    <Logo />
                </div>

                {/* Main Navigation - Desktop */}
                <div className="hidden md:flex items-center gap-1 flex-1 overflow-x-auto scrollbar-hide">
                    {employeeNavigationItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${isActive
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

                    {/* Notifications */}
                    <NotificationBell />

                    {/* User Profile */}
                    <DropdownMenu>
                        <DropdownMenuTrigger className="outline-none">
                            <div className="flex items-center gap-2 hover:bg-accent rounded-full p-1 pr-2 transition-colors border border-transparent hover:border-border">
                                <div className="text-right hidden md:block">
                                    <div className="text-sm font-medium leading-none">{user?.display_name || 'موظف'}</div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        موظف {user?.commission_rate && `(${user.commission_rate}%)`}
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
