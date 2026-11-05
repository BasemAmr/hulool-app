import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  useGetTreasuryAccount,
  useCommissionExpenseConfig,
} from '../api/treasuryQueries';
import { useGetAccountHistory, useDeleteTransaction } from '../api/accountQueries';
import { useGetEmployeesForSelection } from '@/features/employees/api/employeeQueries';
import HuloolDataGrid from '@/shared/grid/HuloolDataGrid';
import type { HuloolGridColumn } from '@/shared/grid/HuloolDataGrid';
import type { CellProps } from 'react-datasheet-grid';
import Button from '@/shared/ui/primitives/Button';
import {
  Award,
  FileSpreadsheet,
  ArrowRight,
  Search,
  X,
  RotateCcw,
  Printer,
  SlidersHorizontal,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  Settings,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/shared/ui/shadcn/dropdown-menu';
import {
  buildSettlementQabdPreset,
  buildSettlementSarfPreset,
} from '@/features/financials/utils/settlementPresets';
import type { FinancialTransaction, CashBoxVoucher } from '@/api/types';
import { LedgerFinalBalanceCell } from '@/shared/grid';
import { ledgerBalanceDelta } from '@/shared/ledger/ledgerDirection';
import { LedgerStatCell } from '@/shared/ledger/LedgerStatCell';
import { useModalStore } from '@/shared/stores/modalStore';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useToast } from '@/shared/hooks/useToast';
import { exportService } from '@/services/export/ExportService';
import { ExportChoiceModal } from '../modals/ExportChoiceModal';
import apiClient from '@/api/client';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { arSA } from 'date-fns/locale';
import {
  ShadcnSelect as Select,
  ShadcnSelectContent as SelectContent,
  ShadcnSelectItem as SelectItem,
  ShadcnSelectTrigger as SelectTrigger,
  ShadcnSelectValue as SelectValue,
} from '@/shared/ui/shadcn/select';
import { useDocumentTitle } from '@/app/router/useDocumentTitle';

export interface CommissionsFilterState {
  start_date: string;
  end_date: string;
  employee_id: string;
  search: string;
}

interface TransformedCommissionTransaction extends FinancialTransaction {
  debit: number;
  credit: number;
  balance: number;
  date: string;
  employee_name?: string;
  employee_id?: number;
  task_name?: string;
  client_name?: string;
  task_amount: number;
  expense_amount: number;
  net_amount: number;
  category?: string;
  debit_account_name?: string;
  credit_account_name?: string;
  creator_name?: string;
  is_summary?: boolean;
}

function toCashBoxVoucher(txn: TransformedCommissionTransaction): CashBoxVoucher {
  return {
    id: txn.id,
    account_id: txn.account_id,
    account_type: 'cashbox',
    transaction_type: 'CASHBOX_PAYMENT',
    type: 'CASHBOX_PAYMENT',
    date: txn.date,
    category: txn.category || 'EMPLOYEE_COMMISSION',
    description: txn.description,
    debit: txn.debit,
    credit: txn.credit,
    balance: txn.balance,
    related_transaction_id: (txn as any).related_transaction_id ?? 0,
    target_type: (txn as any).target_type ?? null,
    target_id: (txn as any).target_id ?? null,
    related_object_type: txn.related_object_type ?? '',
    related_object_id: txn.related_object_id ?? 0,
    created_by: txn.created_by ?? 0,
    creator_name: txn.creator_name,
    debit_account_name: txn.debit_account_name,
    credit_account_name: txn.credit_account_name,
  };
}

const ActionsCell = React.memo(({ rowData }: { rowData: TransformedCommissionTransaction }) => {
  const openModal = useModalStore((state) => state.openModal);
  const toast = useToast();
  const deleteMutation = useDeleteTransaction();
  const { isAdmin } = useAuthStore();

  const handleView = () => openModal('voucherDetails', { voucher: toCashBoxVoucher(rowData) });
  const handleEdit = () => openModal('voucherEdit', { boxId: rowData.account_id, voucher: toCashBoxVoucher(rowData), isTreasury: true });
  const handleDelete = () => {
    openModal('confirmDelete', {
      title: 'حذف حركة العمولة',
      message: 'هل أنت متأكد من حذف هذه الحركة؟ سيتم حذف قيد العمولة بالكامل وتحديث أرصدة الحسابات.',
      onConfirm: () => {
        deleteMutation.mutate(
          { id: rowData.id, reason: 'تم الحذف عبر كشف عمولات الموظفين' },
          {
            onSuccess: () => toast.success('تم حذف حركة العمولة بنجاح'),
            onError: (err: any) => toast.error('خطأ في الحذف', err.response?.data?.message || '')
          }
        );
      }
    });
  };

  const handlePrint = () => openModal('voucherPreview', { transactionId: rowData.id });

  return (
    <div className="flex gap-1.5 items-center justify-center h-full w-full">
      <Button variant="outline-primary" size="sm" onClick={handlePrint} className="px-2 h-7" title="طباعة السند">
        <Printer size={15} />
      </Button>
      <Button variant="outline-primary" size="sm" onClick={handleView} className="px-2.5 h-7 text-xs">
        عرض
      </Button>
      {isAdmin() && (
        <>
          <Button variant="outline-primary" size="sm" onClick={handleEdit} className="px-2.5 h-7 text-xs">
            تعديل
          </Button>
          <Button variant="outline-danger" size="sm" onClick={handleDelete} isLoading={deleteMutation.isPending} className="px-2.5 h-7 text-xs">
            حذف
          </Button>
        </>
      )}
    </div>
  );
});
ActionsCell.displayName = 'ActionsCell';

const formatNumberOnly = (amount: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount || 0);

const formatAbsNumber = (amount: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(amount || 0));

const TaskAmountCell = React.memo(({ rowData }: { rowData: TransformedCommissionTransaction }) => (
  <span className="hulool-cell-content" style={{ justifyContent: 'center', fontWeight: 700, color: 'var(--token-text-primary)' }}>
    {formatNumberOnly(rowData.task_amount)}
  </span>
));
TaskAmountCell.displayName = 'TaskAmountCell';

const ExpenseAmountCell = React.memo(({ rowData }: { rowData: TransformedCommissionTransaction }) => (
  <span className="hulool-cell-content" style={{ justifyContent: 'center', fontWeight: 700, color: 'var(--token-status-danger-text)' }}>
    {formatNumberOnly(rowData.expense_amount)}
  </span>
));
ExpenseAmountCell.displayName = 'ExpenseAmountCell';

const NetAmountCell = React.memo(({ rowData }: { rowData: TransformedCommissionTransaction }) => (
  <span className="hulool-cell-content" style={{ justifyContent: 'center', fontWeight: 700, color: 'var(--token-status-success-text)' }}>
    {formatNumberOnly(rowData.net_amount)}
  </span>
));
NetAmountCell.displayName = 'NetAmountCell';

const FinalBalanceCell = React.memo(({ rowData }: { rowData: TransformedCommissionTransaction }) => {
  const bal = Number((rowData as any)?.balance ?? 0);
  return (
    <span
      className="hulool-cell-content"
      style={{
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: '1.05rem',
        color: bal < 0 ? 'var(--token-text-danger)' : 'var(--token-text-success)',
      }}
    >
      {formatAbsNumber(bal)}
    </span>
  );
});
FinalBalanceCell.displayName = 'FinalBalanceCell';

const ALL_EMPLOYEES_VALUE = '__all__';

function parseDate(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(date: Date | null): string {
  if (!date) return '';
  return date.toLocaleDateString('en-CA');
}

const filterDateStyles = `
  .header-inline-filters .react-datepicker__input-container input {
    height: 2.25rem;
    padding-inline: 0.6rem;
    font-size: 0.85rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    background-color: var(--color-background);
    color: var(--color-foreground);
    outline: none;
    width: 105px;
    box-sizing: border-box;
    font-family: inherit;
    direction: rtl;
    text-align: right;
  }
  .header-inline-filters .react-datepicker-wrapper {
    width: auto;
  }
  .header-inline-filters .react-datepicker-popper {
    z-index: 60 !important;
  }
`;

export const EmployeeCommissionsAccountPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const accountId = Number(id);
  const navigate = useNavigate();
  const isAdmin = useAuthStore((state) => state.isAdmin());
  const openModal = useModalStore((state) => state.openModal);
  const [page, setPage] = useState(1);
  const [allTransactions, setAllTransactions] = useState<TransformedCommissionTransaction[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportChoice, setShowExportChoice] = useState(false);
  const toast = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [searchParams] = useSearchParams();
  const linkedSearch = searchParams.get('search') ?? '';
  const linkedEmployeeId = searchParams.get('employee_id') ?? '';

  const [filters, setFilters] = useState<CommissionsFilterState>({
    start_date: '',
    end_date: '',
    employee_id: linkedEmployeeId,
    search: linkedSearch,
  });

  const [localSearch, setLocalSearch] = useState(linkedSearch);

  useEffect(() => {
    setLocalSearch(filters.search);
  }, [filters.search]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (localSearch !== filters.search) {
        setFilters((prev) => ({ ...prev, search: localSearch }));
        setPage(1);
      }
    }, 350);
    return () => clearTimeout(handler);
  }, [localSearch, filters.search]);

  useEffect(() => {
    setPage(1);
    setAllTransactions([]);
  }, [accountId, filters.start_date, filters.end_date, filters.employee_id, filters.search]);

  const { data: account, isLoading: isLoadingAccount, error: accountError } = useGetTreasuryAccount(accountId);
  useDocumentTitle(account?.name ? `عمولات: ${account.name}` : 'كشف عمولات الموظفين');

  const { data: commissionConfig } = useCommissionExpenseConfig();
  const { data: employees = [] } = useGetEmployeesForSelection();

  const isDesignatedCommissionExpense = useMemo(() => {
    return commissionConfig?.assigned_account?.id === accountId;
  }, [commissionConfig, accountId]);

  const selectedEmployeeName = useMemo(() => {
    if (!filters.employee_id) return null;
    const emp = employees.find((e) => String(e.id) === String(filters.employee_id));
    return emp?.display_name || null;
  }, [filters.employee_id, employees]);

  const { data: historyData, isLoading: isLoadingHistory, error: historyError } = useGetAccountHistory(
    'treasury',
    accountId,
    page,
    {
      start_date: filters.start_date,
      end_date: filters.end_date,
      employee_id: filters.employee_id,
      search: filters.search,
    } as any
  );

  useEffect(() => {
    if (historyData?.transactions) {
      const rawTxns = historyData.transactions;
      const transformed: TransformedCommissionTransaction[] = rawTxns.map((txn: any) => {
        const rawDebit = txn.debit !== undefined ? txn.debit : (txn.direction === 'debit' ? txn.amount : 0);
        const rawCredit = txn.credit !== undefined ? txn.credit : (txn.direction === 'credit' ? txn.amount : 0);
        const rawBalance = txn.balance !== undefined ? txn.balance : txn.balance_after;
        const debit = Number(rawDebit || 0);
        const credit = Number(rawCredit || 0);
        const balance = Number(rawBalance || 0);

        let meta = txn.metadata;
        if (typeof meta === 'string') {
          try { meta = JSON.parse(meta); } catch {}
        }

        const task_amount = Number(txn.task_amount ?? meta?.task_amount ?? 0);
        const expense_amount = Number(txn.expense_amount ?? meta?.expense_amount ?? 0);
        const net_amount = Number(txn.net_amount ?? txn.net_earning ?? (task_amount - expense_amount));

        const rawDateStr = txn.transaction_date || txn.created_at || '';
        const date = rawDateStr.includes(' ') ? rawDateStr.replace(' ', 'T') : rawDateStr;
        const employee_name = txn.employee_name || txn.credit_account_name || '—';
        const employee_id = txn.employee_id || txn.target_id;
        const task_name = txn.task_name || '';
        const client_name = txn.client_name || '';
        const creator_name = txn.creator_name || '';

        return {
          ...txn,
          debit,
          credit,
          balance,
          date,
          employee_name,
          employee_id,
          task_name,
          client_name,
          task_amount,
          expense_amount,
          net_amount,
          creator_name,
        };
      });

      setAllTransactions((prev) => {
        if (page === 1) return transformed;
        const existingIds = new Set(prev.map((t) => t.id));
        const newTxns = transformed.filter((t) => !existingIds.has(t.id));
        return [...prev, ...newTxns];
      });
    }
  }, [historyData, page]);

  const totalPages = historyData?.pagination?.total_pages || 1;
  const hasMore = page < totalPages;
  const totalRecords = historyData?.pagination?.total || allTransactions.length;

  const loadMore = useCallback(() => {
    if (hasMore && !isLoadingHistory) setPage((p) => p + 1);
  }, [hasMore, isLoadingHistory]);

  useEffect(() => {
    const sentinel = scrollRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingHistory) loadMore();
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingHistory, loadMore]);

  const totalDebits = Number(historyData?.total_debits ?? 0);
  const totalCredits = Number(historyData?.total_credits ?? 0);
  const finalBalance = Number(historyData?.balance ?? 0);

  const gridData = allTransactions;
  const transactions = allTransactions;
  const isInitialLoad = isLoadingAccount;

  if (isInitialLoad) {
    return <div className="p-6 text-center text-text-secondary">جاري التحميل...</div>;
  }

  if (accountError || !account) {
    return <div className="p-6 text-center text-status-danger-text">حساب العمولات غير موجود أو لا تملك صلاحية الوصول إليه.</div>;
  }

  if (historyError) {
    return <div className="p-6 text-center text-status-danger-text">حدث خطأ أثناء تحميل كشف عمولات الموظفين.</div>;
  }

  const handleExportFiltered = async () => {
    try {
      setIsExporting(true);
      const exportItems = transactions.map((txn) => ({
        transaction_date: txn.date,
        transaction_type: txn.employee_name || 'عمولة موظف',
        description: txn.description,
        debit: Number(txn.task_amount || 0),
        credit: Number(txn.expense_amount || 0),
        balance: Number(txn.balance || 0),
        metadata: {
          employee_name: txn.employee_name,
          task_amount: txn.task_amount,
          expense_amount: txn.expense_amount,
          net_amount: txn.net_amount,
          commission_debit: txn.debit,
        },
      }));
      await exportService.exportTreasuryAccount({ title: `كشف عمولات الموظفين - ${account.name}`, items: exportItems });
      toast.success('تم التصدير بنجاح');
    } catch (err: any) {
      toast.error('فشل التصدير', err.message || '');
    } finally {
      setIsExporting(false);
    }
  };

  const fetchAllHistoryPages = async (extraParams: { start_date?: string; end_date?: string; employee_id?: string } = {}) => {
    let allTxns: any[] = [];
    let pageNum = 1;
    let totalPagesCount = 1;
    const PER_PAGE_LIMIT = 100;

    do {
      const { data } = await apiClient.get<any>(`/accounts/treasury/${accountId}/history`, {
        params: {
          page: pageNum,
          per_page: PER_PAGE_LIMIT,
          ...extraParams,
        },
      });

      let rawTxns: any[] = [];
      if (data?.data?.transactions) rawTxns = data.data.transactions;
      else if (data?.data?.data) rawTxns = data.data.data;
      else if (data?.transactions) rawTxns = data.transactions;
      else if (Array.isArray(data?.data)) rawTxns = data.data;

      allTxns = [...allTxns, ...rawTxns];

      const pagination = data?.pagination || data?.data?.pagination;
      totalPagesCount = pagination?.total_pages || 1;
      pageNum++;
    } while (pageNum <= totalPagesCount);

    return allTxns;
  };

  const handleExportFull = async () => {
    try {
      setIsExporting(true);
      const allTxns = await fetchAllHistoryPages(filters.employee_id ? { employee_id: filters.employee_id } : {});

      const exportItems = allTxns.map((txn: any) => ({
        transaction_date: txn.transaction_date || txn.created_at || '',
        transaction_type: txn.employee_name || txn.credit_account_name || 'عمولة موظف',
        description: txn.description,
        debit: Number(txn.task_amount || 0),
        credit: Number(txn.expense_amount || 0),
        balance: Number(txn.balance || 0),
        metadata: {
          employee_name: txn.employee_name || txn.credit_account_name,
          task_amount: txn.task_amount,
          expense_amount: txn.expense_amount,
          net_amount: txn.net_amount,
          commission_debit: txn.debit,
        },
      }));
      await exportService.exportTreasuryAccount({ title: `كشف عمولات الموظفين كامل - ${account.name}`, items: exportItems });
      toast.success('تم تصدير كامل التاريخ بنجاح');
    } catch (err: any) {
      toast.error('فشل التصدير', err.message || '');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportDateRange = async (startDateStr?: string, endDateStr?: string) => {
    try {
      setIsExporting(true);
      const extraParams: { start_date?: string; end_date?: string; employee_id?: string } = {};
      if (startDateStr) extraParams.start_date = startDateStr;
      if (endDateStr) extraParams.end_date = endDateStr;
      if (filters.employee_id) extraParams.employee_id = filters.employee_id;

      const allTxns = await fetchAllHistoryPages(extraParams);

      const exportItems = allTxns.map((txn: any) => ({
        transaction_date: txn.transaction_date || txn.created_at || '',
        transaction_type: txn.employee_name || txn.credit_account_name || 'عمولة موظف',
        description: txn.description,
        debit: Number(txn.task_amount || 0),
        credit: Number(txn.expense_amount || 0),
        balance: Number(txn.balance || 0),
        metadata: {
          employee_name: txn.employee_name || txn.credit_account_name,
          task_amount: txn.task_amount,
          expense_amount: txn.expense_amount,
          net_amount: txn.net_amount,
          commission_debit: txn.debit,
        },
      }));

      let dateTitlePart = '';
      if (startDateStr && endDateStr) {
        dateTitlePart = ` (${startDateStr.split(' ')[0]} إلى ${endDateStr.split(' ')[0]})`;
      } else if (startDateStr) {
        dateTitlePart = ` (منذ ${startDateStr.split(' ')[0]})`;
      } else if (endDateStr) {
        dateTitlePart = ` (حتى ${endDateStr.split(' ')[0]})`;
      }

      await exportService.exportTreasuryAccount({
        title: `كشف عمولات الموظفين${dateTitlePart} - ${account.name}`,
        items: exportItems,
      });
      toast.success('تم تصدير الحركة بنجاح');
    } catch (err: any) {
      toast.error('فشل التصدير', err.message || '');
    } finally {
      setIsExporting(false);
    }
  };

  const columns: HuloolGridColumn<TransformedCommissionTransaction>[] = [
    {
      id: 'transaction_date',
      title: 'التاريخ',
      key: 'date',
      type: 'date',
      width: 95,
      grow: 0,
      cellClassName: ({ rowData }: any) => (rowData.is_summary ? 'font-bold' : ''),
      formatter: (_val: string, rowData: any) => (rowData.is_summary ? '' : undefined),
    },
    {
      id: 'employee_name',
      title: 'الموظف',
      key: 'employee_name',
      type: 'text',
      width: 130,
      grow: 0,
      cellClassName: () => 'text-center font-bold text-text-primary',
      formatter: (val: string) => val || '—',
    },
    {
      id: 'description',
      title: 'البيان',
      key: 'description',
      type: 'text',
      grow: 2,
      cellClassName: ({ rowData }: any) =>
        rowData.is_summary
          ? 'font-black text-center text-text-primary text-sm'
          : 'font-bold text-text-primary text-sm',
    },
    {
      id: 'task_amount',
      title: 'مبلغ المهمة',
      key: 'task_amount',
      type: 'custom',
      width: 110,
      grow: 0,
      component: TaskAmountCell,
      cellClassName: () => 'commissions-task-amount-cell',
    },
    {
      id: 'expense_amount',
      title: 'مبلغ المصروفات',
      key: 'expense_amount',
      type: 'custom',
      width: 110,
      grow: 0,
      component: ExpenseAmountCell,
      cellClassName: () => 'commissions-expense-amount-cell',
    },
    {
      id: 'net_amount',
      title: 'المبلغ الصافي',
      key: 'net_amount',
      type: 'custom',
      width: 110,
      grow: 0,
      component: NetAmountCell,
      cellClassName: () => 'commissions-net-amount-cell',
    },
    {
      id: 'balance',
      title: 'الرصيد النهائي',
      key: 'balance',
      type: 'custom',
      component: (props: any) => (
        <LedgerFinalBalanceCell
          balance={props.rowData?.balance}
          delta={ledgerBalanceDelta('treasury', props.rowData?.debit, props.rowData?.credit)}
        />
      ),
      width: 155,
      grow: 0,
      cellClassName: ({ rowData }: any) => {
        const val = Number(rowData?.balance ?? 0);
        const isNeg = val < 0;
        if (rowData?.is_summary) {
          return isNeg ? 'ledger-summary-balance-neg text-center' : 'ledger-summary-balance-pos text-center';
        }
        return isNeg ? 'ledger-balance-neg text-center' : 'ledger-balance-pos text-center';
      },
    },
    {
      id: 'actions',
      title: 'إجراءات',
      key: 'id',
      type: 'custom',
      component: (props: CellProps<TransformedCommissionTransaction, any>) => {
        if (props.rowData?.is_summary) return <div className="h-full w-full" />;
        return <ActionsCell rowData={props.rowData} />;
      },
      width: 230,
      grow: 0,
    },
  ];

  const hasActiveFilters = Boolean(filters.start_date || filters.end_date || filters.employee_id || filters.search);

  const handleBack = () => {
    navigate('/financial-center/treasury-accounts');
  };

  return (
    <>
      <style>{filterDateStyles}</style>
      <div className="p-6 space-y-4 text-right" dir="rtl">
        {/* Header and Filter Card */}
        <div className="lg:sticky lg:top-0 lg:z-40 bg-bg-surface border border-border-default rounded-xl shadow-sm overflow-hidden">
          <div className="relative flex flex-col lg:flex-row lg:items-stretch">
            {/* RTL start (right): Filter Fields */}
            <div className="header-inline-filters flex flex-nowrap items-center gap-2 p-3 lg:flex-wrap lg:justify-end min-w-0 shrink-0 overflow-x-auto lg:overflow-x-visible">
              {/* Search */}
              <div className="relative w-36 shrink-0 lg:w-44 lg:shrink">
                <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  dir="rtl"
                  className="base-input h-9 w-full rounded-lg border-border-default bg-background/50 px-2 pl-8 text-right text-xs shadow-sm transition-all placeholder:text-text-muted/70 focus:bg-background focus:ring-1 focus:ring-primary/30"
                  placeholder="بحث في البيان أو المهمة..."
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                />
                {localSearch && (
                  <button
                    type="button"
                    className="absolute left-1.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-text-muted hover:bg-muted hover:text-text-primary"
                    onClick={() => setLocalSearch('')}
                  >
                    <X size={11} />
                  </button>
                )}
              </div>

              {/* Start Date */}
              <DatePicker
                selected={parseDate(filters.start_date)}
                onChange={(date: Date | null) => setFilters((prev) => ({ ...prev, start_date: formatDate(date) }))}
                dateFormat="yyyy-MM-dd"
                placeholderText="من تاريخ"
                locale={arSA}
                portalId="inline-filters-datepicker-portal"
                showYearDropdown
                scrollableYearDropdown
                dropdownMode="select"
                calendarStartDay={6}
              />

              {/* End Date */}
              <DatePicker
                selected={parseDate(filters.end_date)}
                onChange={(date: Date | null) => setFilters((prev) => ({ ...prev, end_date: formatDate(date) }))}
                dateFormat="yyyy-MM-dd"
                placeholderText="إلى تاريخ"
                locale={arSA}
                portalId="inline-filters-datepicker-portal"
                showYearDropdown
                scrollableYearDropdown
                dropdownMode="select"
                calendarStartDay={6}
              />

              {/* Employee Filter Dropdown (Replaces old type filter) */}
              <div className="w-40 shrink-0">
                <Select
                  value={filters.employee_id || ALL_EMPLOYEES_VALUE}
                  onValueChange={(value) => {
                    setFilters((prev) => ({
                      ...prev,
                      employee_id: value === ALL_EMPLOYEES_VALUE ? '' : value,
                    }));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-full rounded-lg border-border-default bg-background/50 text-xs font-medium shadow-sm transition-all hover:bg-background focus:ring-1 focus:ring-primary/20">
                    <SelectValue placeholder="كل الموظفين" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto z-[9999]">
                    <SelectItem value={ALL_EMPLOYEES_VALUE}>كل الموظفين</SelectItem>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={String(emp.id)}>
                        {emp.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Reset */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setFilters({ start_date: '', end_date: '', employee_id: '', search: '' });
                    setPage(1);
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-dashed border-border-default bg-background hover:bg-primary/5 hover:text-text-primary transition-all active:scale-95 text-text-secondary cursor-pointer"
                  title="إعادة ضبط الفلاتر"
                >
                  <RotateCcw size={14} />
                </button>
              )}
            </div>

            {/* Center: Back button + Title + Transaction & Settlement Buttons */}
            <div className="order-first flex items-center justify-center gap-2.5 py-2 lg:py-3 shrink-0 lg:order-none lg:flex-1">
              <div className="hidden lg:flex-1" aria-hidden="true" />
              <button
                onClick={handleBack}
                className="shrink-0 p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-surface-muted transition-colors cursor-pointer"
                title="الرجوع إلى دليل الحسابات"
              >
                <ArrowRight size={18} />
              </button>
              <div className="shrink-0 text-primary">
                <Award size={22} />
              </div>
              <div className="flex items-center min-w-0">
                <span className="text-sm font-bold text-text-primary truncate min-w-0">
                  {account?.name || 'عمولات ايرادات الموظفين'}
                </span>
              </div>

              {/* Transactions Buttons targeting this account: Qabd, Sarf, and Settlement */}
              <div className="flex items-center gap-1.5 ms-2 shrink-0">
                <Button
                  variant="outline-success"
                  size="sm"
                  className="h-8 font-bold flex items-center gap-1 text-xs cursor-pointer"
                  onClick={() =>
                    openModal('unifiedTransaction', {
                      title: 'سند قبض',
                      defaultFromCardType: 'employee',
                      defaultFromAccountId: filters.employee_id || undefined,
                      defaultFromAccountName: selectedEmployeeName || undefined,
                      defaultToCardType: 'treasury',
                      defaultToAccountId: String(accountId),
                      defaultToAccountName: account?.name,
                      lockDirection: false,
                    })
                  }
                  title="تسجيل سند قبض في هذا الحساب"
                >
                  <TrendingUp size={13} />
                  <span>سند قبض</span>
                </Button>

                <Button
                  variant="outline-danger"
                  size="sm"
                  className="h-8 font-bold flex items-center gap-1 text-xs cursor-pointer"
                  onClick={() =>
                    openModal('unifiedTransaction', {
                      title: 'سند صرف',
                      defaultFromCardType: 'treasury',
                      defaultFromAccountId: String(accountId),
                      defaultFromAccountName: account?.name,
                      defaultToCardType: 'employee',
                      defaultToAccountId: filters.employee_id || undefined,
                      defaultToAccountName: selectedEmployeeName || undefined,
                      lockDirection: false,
                    })
                  }
                  title="تسجيل سند صرف من هذا الحساب"
                >
                  <TrendingDown size={13} />
                  <span>سند صرف</span>
                </Button>

                {isAdmin && (
                  <DropdownMenu dir="rtl">
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        className="h-8 font-bold flex items-center gap-1 text-xs cursor-pointer"
                      >
                        <span>تسوية</span>
                        <ChevronDown size={12} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="z-[9999] min-w-[140px] bg-card border border-border shadow-xl">
                      <DropdownMenuItem
                        className="flex items-center gap-2 text-xs font-semibold text-status-success-text cursor-pointer hover:bg-status-success-bg/20 py-2"
                        onClick={() =>
                          openModal(
                            'unifiedTransaction',
                            buildSettlementQabdPreset({
                              kind: 'treasury',
                              id: String(accountId),
                              name: account?.name,
                            })
                          )
                        }
                      >
                        <TrendingUp size={13} />
                        <span>تسوية قبض</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="flex items-center gap-2 text-xs font-semibold text-status-danger-text cursor-pointer hover:bg-status-danger-bg/20 py-2"
                        onClick={() =>
                          openModal(
                            'unifiedTransaction',
                            buildSettlementSarfPreset({
                              kind: 'treasury',
                              id: String(accountId),
                              name: account?.name,
                            })
                          )
                        }
                      >
                        <TrendingDown size={13} />
                        <span>تسوية صرف</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              <div className="hidden lg:flex-1" aria-hidden="true" />
            </div>

            {/* RTL end (left): Totals Cells */}
            <div className="flex items-stretch shrink-0 border-t lg:border-t-0 lg:border-s border-border-default overflow-x-auto lg:overflow-x-visible">
              <LedgerStatCell
                label={selectedEmployeeName ? `عمولات ${selectedEmployeeName}` : 'اجمالي العمولات'}
                value={totalDebits}
                tone="debit"
                divider
              />
              <LedgerStatCell label="اجمالي المسدد" value={totalCredits} tone="credit" divider />
              <LedgerStatCell label="الرصيد النهائي" value={finalBalance} tone="balance" divider />
              <div className="flex items-center gap-2 px-3">
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => setShowExportChoice(true)}
                  disabled={isExporting || transactions.length === 0}
                  className="h-9 font-semibold text-xs shrink-0"
                >
                  <FileSpreadsheet size={15} className="me-1.5" />
                  تصدير Excel
                </Button>

                {isAdmin && (
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => openModal('commissionExpenseManager')}
                    className="h-9 w-9 p-0 flex items-center justify-center shrink-0 cursor-pointer text-text-secondary hover:text-primary"
                    title="إدارة وتخصيص حسابات العمولات بالموظفين"
                  >
                    <Settings size={16} />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Grid Table */}
        <div className="treasury-ledger-wrap mx-auto w-[96%] max-w-[1600px] bg-bg-surface rounded-xl border border-border-default shadow-xs overflow-hidden">
          <HuloolDataGrid
            data={gridData}
            columns={columns}
            isLoading={isLoadingHistory && page === 1 && transactions.length === 0}
          />

          {hasMore && (
            <div ref={scrollRef} className="flex justify-center items-center py-3 border-t border-border-default">
              {isLoadingHistory && page > 1 ? (
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  جاري تحميل المزيد...
                </div>
              ) : (
                <div className="text-sm text-text-secondary">مرر للأسفل لتحميل المزيد</div>
              )}
            </div>
          )}

          {transactions.length > 0 && (
            <div className="flex justify-center items-center py-2 border-t border-border-default bg-bg-surface-muted/30">
              <div className="text-xs text-text-secondary">
                عرض {transactions.length} من {totalRecords} حركة عمولة
              </div>
            </div>
          )}
        </div>
      </div>

      <ExportChoiceModal
        isOpen={showExportChoice}
        onClose={() => setShowExportChoice(false)}
        onExportFiltered={handleExportFiltered}
        onExportFull={handleExportFull}
        onExportDateRange={handleExportDateRange}
        title="تصدير كشف عمولات الموظفين"
      />
    </>
  );
};

export default EmployeeCommissionsAccountPage;
