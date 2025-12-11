/**
 * AccountsOverviewPage
 * 
 * Admin page for viewing all accounts (employees, clients, company) in a unified view.
 * Features:
 * - Summary cards showing balances and pending items
 * - Searchable/filterable accounts table
 * - Click to expand account details
 * - Quick action buttons for creating transactions
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { applyPageBackground } from '../../utils/backgroundUtils';
import { useGetUnifiedAccounts } from '../../queries/financialCenterQueries';
import { useModalStore } from '../../stores/modalStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import Button from '../../components/ui/Button';
import { Spinner } from '../../components/ui/spinner';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import SaudiRiyalIcon from '../../components/ui/SaudiRiyalIcon';
import { Search, X, Plus, Users, Building, Briefcase, Clock, ChevronRight, AlertCircle } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';
import type { UnifiedAccount, AccountType } from '../../api/types';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

const AccountsOverviewPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [selectedAccount, setSelectedAccount] = useState<UnifiedAccount | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [perPage] = useState(50);
  const debouncedSearch = useDebounce(search, 500);
  const openModal = useModalStore((state) => state.openModal);

  // Fetch accounts with filters and pagination
  const { data, isLoading, error } = useGetUnifiedAccounts({
    type: filterType || undefined,
    search: debouncedSearch || undefined,
    page,
    per_page: perPage,
  });

  // Reset page to 1 when search or filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterType]);

  // Get type icon
  const getTypeIcon = (type: AccountType) => {
    switch (type) {
      case 'employee':
        return <Users size={16} className="text-blue-500" />;
      case 'client':
        return <Briefcase size={16} className="text-green-500" />;
      case 'company':
        return <Building size={16} className="text-purple-500" />;
      default:
        return null;
    }
  };

  // Get type label
  const getTypeLabel = (type: AccountType) => {
    switch (type) {
      case 'employee':
        return 'موظف';
      case 'client':
        return 'عميل';
      case 'company':
        return 'شركة';
      default:
        return type;
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    const formatted = new Intl.NumberFormat('ar-SA', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount));
    return amount < 0 ? `-${formatted}` : formatted;
  };

  // Format last activity
  const formatLastActivity = (date: string | null) => {
    if (!date) return 'لا يوجد نشاط';
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ar });
    } catch {
      return date;
    }
  };

  // Handle new transaction
  const handleNewTransaction = () => {
    // if (!selectedAccount) return;
    // Default to payout when no button context - user can change in modal if needed
    openModal('manualTransaction');
  };

  // Handle account click
  const handleAccountClick = (account: UnifiedAccount) => {
    setSelectedAccount(selectedAccount?.id === account.id && selectedAccount?.type === account.type ? undefined : account);
  };

  // Clear search
  const handleClearSearch = () => setSearch('');

  // Filter options
  const filterOptions = [
    { value: '', label: 'الكل' },
    { value: 'employee', label: 'الموظفين' },
    { value: 'client', label: 'العملاء' },
    { value: 'company', label: 'الشركة' },
  ];

  if (error) {
    return (
      <div className="w-full p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>خطأ في تحميل البيانات</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'حدث خطأ أثناء تحميل الحسابات'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="w-full p-4">
      {/* Compact Header - Title, Stats, and Button in ONE ROW */}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <h1 className="text-lg font-bold text-black">مركز الحسابات المالية</h1>
        
        {/* Inline Summary Stats */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <Users size={14} className="text-blue-500" />
            <span className="text-gray-600">رصيد الموظفين:</span>
            <span className="font-bold text-blue-600">
              {isLoading ? '...' : new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(data?.summary.total_employee_balance || 0)}
            </span>
            <span className="text-gray-500 text-xs">مستحقات للموظفين</span>
          </div>
          <div className="w-px h-4 bg-gray-300" />
          <div className="flex items-center gap-1">
            <Briefcase size={14} className="text-green-500" />
            <span className="text-gray-600">رصيد العملاء:</span>
            <span className="font-bold text-green-600">
              {isLoading ? '...' : new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(data?.summary.total_client_balance || 0)}
            </span>
            <span className="text-gray-500 text-xs">مستحقات على العملاء</span>
          </div>
          <div className="w-px h-4 bg-gray-300" />
          <div className="flex items-center gap-1">
            <Clock size={14} className="text-orange-500" />
            <span className="text-gray-600">عمولات معلقة:</span>
            <span className="font-bold text-orange-600">
              {isLoading ? '...' : new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(data?.summary.pending_commissions || 0)}
            </span>
            <span className="text-gray-500 text-xs">في انتظار الموافقة</span>
          </div>
        </div>

        <Button onClick={handleNewTransaction} variant="primary" size="sm">
          <Plus size={14} className="me-1" />
          معاملة جديدة
        </Button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-3 mb-4">
        {/* Search Input */}
        <div className="relative flex-1" style={{ maxWidth: '300px' }}>
          <Search 
            size={14} 
            className="absolute text-black/50" 
            style={{ left: '10px', top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background text-black focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="البحث في الحسابات..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '32px' }}
          />
          {search && (
            <button
              type="button"
              className="absolute text-black/50 p-0 hover:text-foreground"
              style={{ right: '10px', top: '50%', transform: 'translateY(-50%)' }}
              onClick={handleClearSearch}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter Buttons */}
        <div className="inline-flex rounded-md shadow-sm" role="group">
          {filterOptions.map((option) => (
            <Button
              key={option.value}
              variant={filterType === option.value ? 'primary' : 'outline-primary'}
              size="sm"
              onClick={() => setFilterType(option.value)}
              className="first:rounded-l-none last:rounded-r-none"
            >
              {option.label}
            </Button>
          ))}
        </div>

        {/* Results Count and Pagination Info */}
        {data && (
          <span className="text-sm text-black/50">
            صفحة {page} من {data.pagination?.pages || 1} | {data.pagination?.total || 0} حساب
          </span>
        )}
      </div>

      {/* Accounts Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Spinner>
                <span className="sr-only">جاري التحميل...</span>
              </Spinner>
            </div>
          ) : !data?.accounts.length ? (
            <div className="text-center py-12">
              <Search size={40} className="text-black/20 mx-auto mb-3" />
              <p className="text-black/50">لا توجد حسابات</p>
              {search && (
                <Button variant="outline-primary" size="sm" onClick={handleClearSearch} className="mt-2">
                  مسح البحث
                </Button>
              )}
            </div>
          ) : (
            <Table className="border-collapse border border-gray-300">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-start border border-gray-300 text-base px-3 py-2 w-[50px]"></TableHead>
                  <TableHead className="text-start border border-gray-300 text-base px-3 py-2">النوع</TableHead>
                  <TableHead className="text-start border border-gray-300 text-base px-3 py-2">الاسم</TableHead>
                  <TableHead className="text-start border border-gray-300 text-base px-3 py-2">الرصيد</TableHead>
                  <TableHead className="text-start border border-gray-300 text-base px-3 py-2 w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.accounts.map((account) => (
                  <>
                    <TableRow 
                      key={`${account.type}-${account.id}`}
                      className="cursor-pointer hover:bg-muted/80"
                      onClick={() => handleAccountClick(account)}
                    >
                      <TableCell className="border border-gray-300 text-start text-base px-3 py-2">
                        {getTypeIcon(account.type)}
                      </TableCell>
                      <TableCell className="border border-gray-300 text-start text-base px-3 py-2 font-medium">
                        {getTypeLabel(account.type)}
                      </TableCell>
                      <TableCell className="border border-gray-300 text-start text-base px-3 py-2">
                        <div>
                          <span className="font-medium text-black">{account.name}</span>
                          {account.email && (
                            <span className="block text-xs text-black/50">{account.email}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="border border-gray-300 text-start text-base px-3 py-2">
                        <span className={`font-medium ${account.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(account.balance)}
                        </span>
                      </TableCell>
                      <TableCell className="border border-gray-300 text-start text-base px-3 py-2">
                        <ChevronRight 
                          size={16} 
                          className={`text-black/30 transition-transform ${
                            selectedAccount?.id === account.id && selectedAccount?.type === account.type 
                              ? 'rotate-90' 
                              : ''
                          }`}
                        />
                      </TableCell>
                    </TableRow>
                    
                    {/* Expanded Details Row */}
                    {selectedAccount?.id === account.id && selectedAccount?.type === account.type && (
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={5} className="border border-gray-300 p-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2">
                              <h4 className="font-semibold text-black">
                                {account.name}
                              </h4>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-black/50">الرصيد الحالي:</span>
                                  <span className="font-medium mr-2">
                                    {new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(account.balance)}
                                  </span>
                                </div>
                                {account.pending_amount > 0 && (
                                  <div>
                                    <span className="text-black/50">المبلغ المعلق:</span>
                                    <span className="font-medium text-orange-600 mr-2">
                                      {new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(account.pending_amount)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {
                                account.type !== 'company' && (
                                  <>
                                    <Button
                                      variant="outline-primary"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openModal('manualTransaction', {
                                          preselectedAccount: account,
                                          direction: 'payout'
                                        });
                                      }}
                                    >
                                      <Plus size={14} className="me-1" />
                                     سند صرف
                                    </Button>
                                    <Button
                                      variant="outline-primary"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openModal('manualTransaction', {
                                          preselectedAccount: account,
                                          direction: 'repayment'
                                        });
                                      }}
                                    >
                                      سند قبض
                                    </Button>
                                  </>
                                )
                              }
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Navigate to account details using React Router
                                  if (account.type === 'employee') {
                                    navigate(`/employees/${account.id}`);
                                  } else if (account.type === 'client') {
                                    navigate(`/clients/${account.id}`);
                                  } else if (account.type === 'company') {
                                    navigate(`/company/${account.id}`);
                                  }
                                }}
                              >
                                عرض التفاصيل
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {data && data.pagination && data.pagination.pages > 1 && (
        <div className="flex justify-between items-center mt-4 p-4 border border-border rounded-lg bg-card">
          <div className="text-sm text-black/50">
            عرض {(page - 1) * perPage + 1} إلى {Math.min(page * perPage, data.pagination.total)} من {data.pagination.total}
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline-primary"
              size="sm"
              disabled={page === 1 || isLoading}
              onClick={() => setPage(Math.max(1, page - 1))}
            >
              السابق
            </Button>
            
            <div className="flex items-center gap-2">
              {Array.from({ length: data.pagination.pages }).map((_, i) => {
                const pageNum = i + 1;
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === page ? 'primary' : 'outline-primary'}
                    size="sm"
                    onClick={() => setPage(pageNum)}
                    disabled={isLoading}
                    className="min-w-[40px]"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline-primary"
              size="sm"
              disabled={page === (data.pagination?.pages || 1) || isLoading}
              onClick={() => setPage(Math.min(data.pagination?.pages || 1, page + 1))}
            >
              التالي
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountsOverviewPage;
