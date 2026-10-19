/**
 * AccountLedgerTable Component - Rewritten with HuloolDataGrid
 * 
 * Displays a client's financial ledger with all transactions (invoices, payments, credits).
 * Uses the new Account/Ledger API endpoints for accurate double-entry accounting display.
 * 
 * IMPORTANT: Never calculate balances manually in the frontend - always use the 
 * balance_after field from the API response.
 */

import React, { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type {
  FinancialTransaction,
  Client,
  Invoice,
  CashBoxVoucher
} from '@/api/types';
import TransactionEditModal from '@/features/financials/modals/TransactionEditModal';
import TransactionDeleteModal from '@/features/employees/modals/TransactionDeleteModal';
import InvoiceEditModal from '@/features/invoices/modals/InvoiceEditModal';
import {
  CreditCard,
  Receipt,
  ArrowDownLeft,
  RefreshCw,
  ArrowUpRight,
  FileText,
  Edit3,
  Trash2,
  MessageSquare,
  Search,
  Hash,
  X,
  RotateCcw,
  Eye,
  FileSpreadsheet
} from 'lucide-react';
import { formatDate } from '@/shared/utils/dateUtils';
import { useModalStore } from '@/shared/stores/modalStore';
import Button from '@/shared/ui/primitives/Button';
import { ExportChoiceModal } from '@/features/financials/modals/ExportChoiceModal';
import { exportService } from '@/services/export/ExportService';
import type { ClientStatementReportData } from '@/services/export/exportTypes';
import { useToast } from '@/shared/hooks/useToast';
import apiClient from '@/api/client';
import { useGetAccountHistory } from '@/features/financials/api/accountQueries';
import { useGetPayableInvoices } from '@/features/invoices/api/invoiceQueries';
import { sendPaymentReminder } from '@/shared/utils/whatsappUtils';
import HuloolDataGrid from '@/shared/grid/HuloolDataGrid';
import { LedgerFinalBalanceCell } from '@/shared/grid';
import { LedgerStatCell } from '@/shared/ledger/LedgerStatCell';
import { ledgerToneClassName } from '@/shared/ledger/ledgerDirection';
import type { HuloolGridColumn } from '@/shared/grid';
import type { CellProps } from 'react-datasheet-grid';
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

const neutralActionButtonClass = 'inline-flex items-center justify-center rounded p-1.5 text-text-secondary hover:text-text-primary cursor-pointer transition-colors duration-150';
const destructiveActionButtonClass = 'inline-flex items-center justify-center rounded p-1.5 text-text-secondary hover:text-text-danger cursor-pointer transition-colors duration-150';

export interface FilterState {
  start_date: string;
  end_date: string;
  type: string;
  search: string;
}

const ALL_TYPES_VALUE = '__all__';

function parseDate(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function toISODate(date: Date | null): string {
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

interface AccountLedgerTableProps {
  client: Client;
  filter?: 'all' | 'invoices' | 'payments' | 'credits';
  hideAmounts?: boolean;
  highlightInvoiceId?: number;
  isEmployeeView?: boolean;
}

// ================================
// HELPER FUNCTIONS
// ================================

const formatCurrency = (amount: number | string | undefined | null) => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  if (isNaN(numAmount)) return 'SAR 0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'SAR', minimumFractionDigits: 2
  }).format(numAmount);
};

const getDebitAmount = (tx: FinancialTransaction): number => {
  const debit = (tx as any).debit;
  if (debit !== undefined && debit !== null) {
    const parsed = parseFloat(debit);
    return isNaN(parsed) ? 0 : parsed;
  }
  const isDebit = tx.direction === 'debit' ||
    tx.transaction_type === 'INVOICE_CREATED' ||
    tx.transaction_type === 'INVOICE_GENERATED';
  return isDebit ? (typeof tx.amount === 'string' ? parseFloat(tx.amount) : tx.amount) : 0;
};

const getCreditAmount = (tx: FinancialTransaction): number => {
  const credit = (tx as any).credit;
  if (credit !== undefined && credit !== null) {
    const parsed = parseFloat(credit);
    return isNaN(parsed) ? 0 : parsed;
  }
  const isDebit = tx.direction === 'debit' ||
    tx.transaction_type === 'INVOICE_CREATED' ||
    tx.transaction_type === 'INVOICE_GENERATED';
  return !isDebit ? (typeof tx.amount === 'string' ? parseFloat(tx.amount) : tx.amount) : 0;
};

const getBalance = (tx: FinancialTransaction): number => {
  const balance = (tx as any).balance ?? tx.balance_after;
  if (balance === undefined || balance === null) return 0;
  const parsed = typeof balance === 'string' ? parseFloat(balance) : balance;
  return isNaN(parsed) ? 0 : parsed;
};

function toClientLedgerVoucher(tx: FinancialTransaction, client: Client): CashBoxVoucher {
  const debit = getDebitAmount(tx);
  const credit = getCreditAmount(tx);
  const rawDateStr = tx.transaction_date || tx.created_at || '';
  const date = rawDateStr.includes(' ') ? rawDateStr.replace(' ', 'T') : rawDateStr;
  const isDebit = debit > 0;

  return {
    id: tx.id,
    account_id: client.id,
    account_type: 'client' as any,
    transaction_type: tx.transaction_type as any,
    type: (isDebit ? 'CASHBOX_RECEIPT' : 'CASHBOX_PAYMENT') as any,
    date,
    category: tx.transaction_type,
    description: tx.description,
    debit,
    credit,
    balance: getBalance(tx),
    related_transaction_id: (tx as any).related_transaction_id ?? 0,
    // Paired leg's account: which ledger الحركة المقابلة would point at.
    target_type: (tx as any).target_type ?? null,
    target_id: (tx as any).target_id ?? null,
    related_object_type: tx.related_object_type ?? '',
    related_object_id: tx.related_object_id ?? 0,
    created_by: tx.created_by ?? 0,
    creator_name: (tx as any).creator_name || '',
    creator_role_label: (tx as any).creator_role_label || '',
    debit_account_name: (tx as any).debit_account_name || (isDebit ? client.name : '—'),
    credit_account_name: (tx as any).credit_account_name || (!isDebit ? client.name : '—'),
  };
}

// ================================
// CUSTOM CELL COMPONENTS
// ================================

// Transaction Icon Cell
const TransactionIconCell = React.memo(({ rowData }: CellProps<FinancialTransaction>) => {
  if ((rowData as any).is_summary) return <span className="hulool-cell-content" />;
  const getIcon = (type: string) => {
    switch (type) {
      case 'INVOICE_CREATED':
      case 'INVOICE_GENERATED':
        return <Receipt size={16} className="text-status-danger-text" />;
      case 'PAYMENT_RECEIVED':
        return <ArrowDownLeft size={16} className="text-status-success-text" />;
      case 'CREDIT_APPLIED':
      case 'CREDIT_RECEIVED':
      case 'CREDIT_ALLOCATED':
        return <RefreshCw size={16} className="text-status-info-text" />;
      case 'REVERSAL':
      case 'INVOICE_REVERSED':
        return <ArrowUpRight size={16} className="text-orange-500" />;
      default:
        return <FileText size={16} className="text-text-primary" />;
    }
  };

  return (
    <span className="hulool-cell-content" style={{ justifyContent: 'center' }}>
      {getIcon(rowData.transaction_type)}
    </span>
  );
});
TransactionIconCell.displayName = 'TransactionIconCell';

// Description Cell
const DescriptionCell = React.memo(({ rowData, active }: CellProps<FinancialTransaction>) => {
  if ((rowData as any).is_summary) {
    return (
      <span className="hulool-cell-content" style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--token-text-primary)' }}>
        الإجماليات
      </span>
    );
  }
  return (
    <span className="hulool-cell-content" style={{ fontWeight: active ? 700 : 500, color: 'var(--token-text-primary)' }}>
      {rowData.description}
    </span>
  );
});
DescriptionCell.displayName = 'DescriptionCell';

// Debit Cell
const DebitCell = React.memo(({ rowData, columnData, active }: CellProps<FinancialTransaction, { hideAmounts: boolean }>) => {
  if ((rowData as any).is_summary) {
    return (
      <span className="hulool-cell-content font-extrabold" style={{ justifyContent: 'center', fontSize: '1rem', fontWeight: 800, color: 'var(--token-text-primary)' }}>
        {columnData?.hideAmounts ? '***' : `${formatCurrency(getDebitAmount(rowData))}`}
      </span>
    );
  }
  const amount = getDebitAmount(rowData);
  return (
    <span className="hulool-cell-content" style={{ justifyContent: 'center', color: 'var(--token-text-primary)', fontWeight: active ? 700 : 500 }}>
      {columnData?.hideAmounts ? '***' : (amount > 0 ? formatCurrency(amount) : '—')}
    </span>
  );
});
DebitCell.displayName = 'DebitCell';

// Credit Cell
const CreditCell = React.memo(({ rowData, columnData, active }: CellProps<FinancialTransaction, { hideAmounts: boolean }>) => {
  if ((rowData as any).is_summary) {
    return (
      <span className="hulool-cell-content font-extrabold" style={{ justifyContent: 'center', fontSize: '1rem', fontWeight: 800, color: 'var(--token-text-primary)' }}>
        {columnData?.hideAmounts ? '***' : `${formatCurrency(getCreditAmount(rowData))}`}
      </span>
    );
  }
  const amount = getCreditAmount(rowData);
  return (
    <span className="hulool-cell-content" style={{ justifyContent: 'center', color: 'var(--token-text-primary)', fontWeight: active ? 700 : 500 }}>
      {columnData?.hideAmounts ? '***' : (amount > 0 ? formatCurrency(amount) : '—')}
    </span>
  );
});
CreditCell.displayName = 'CreditCell';

// Balance Cell
const BalanceCell = React.memo(({ rowData, columnData }: CellProps<FinancialTransaction, { hideAmounts: boolean }>) => {
  const balance = getBalance(rowData);
  return <LedgerFinalBalanceCell balance={balance} hideAmounts={columnData?.hideAmounts} />;
});
BalanceCell.displayName = 'BalanceCell';

// Date Cell
const DateCell = React.memo(({ rowData, active }: CellProps<FinancialTransaction>) => {
  if ((rowData as any).is_summary) return <span className="hulool-cell-content" />;
  return (
    <span className="hulool-cell-content" style={{ justifyContent: 'center', fontSize: '0.875rem', color: 'var(--token-text-primary)', fontWeight: active ? 700 : 500 }}>
      {formatDate(rowData.transaction_date || rowData.created_at)}
    </span>
  );
});
DateCell.displayName = 'DateCell';

// Type Badge Cell
// Single source of truth for the row label: the grid cell renders it and the Excel export
// writes it, so a row never reads as "فاتورة" on screen and "INVOICE_GENERATED" in the file.
const TYPE_LABELS: Record<string, string> = {
  INVOICE_CREATED: 'فاتورة',
  INVOICE_GENERATED: 'فاتورة',
  PAYMENT_RECEIVED: 'دفعة',
  CREDIT_APPLIED: 'تخصيص رصيد',
  CREDIT_RECEIVED: 'رصيد مستلم',
  CREDIT_ALLOCATED: 'تخصيص رصيد',
  ADJUSTMENT: 'تعديل',
  REVERSAL: 'عكس',
  INVOICE_REVERSED: 'فاتورة ملغاة',
  PAYOUT: 'سند صرف',
  REPAYMENT: 'سند قبض',
};

const typeLabel = (transactionType?: string | null): string =>
  (transactionType && TYPE_LABELS[transactionType]) || transactionType || '';

const TypeBadgeCell = React.memo(({ rowData }: CellProps<FinancialTransaction>) => {
  if ((rowData as any).is_summary) return <span className="hulool-cell-content" />;

  // Full-cell tint comes from cellClassName (ledger-type-*-cell); the label is plain text
  // that inherits the cell colour via .hulool-cell-content.
  return (
    <span className="hulool-cell-content" style={{ justifyContent: 'center', fontSize: '0.875rem' }}>
      {typeLabel(rowData.transaction_type)}
    </span>
  );
});
TypeBadgeCell.displayName = 'TypeBadgeCell';

// Actions Cell
interface ActionsColumnData {
  client: Client;
  payableMap: Map<string, Invoice>;
  openModal: (modal: string, data: any) => void;
  onEditTx: (tx: any) => void;
  onDeleteTx: (tx: any) => void;
  onEditInv: (inv: any) => void;
  isEmployeeView?: boolean;
}

const ActionsCell = React.memo(({ rowData, columnData }: CellProps<FinancialTransaction & { is_payable?: boolean }, ActionsColumnData>) => {
  if ((rowData as any).is_summary) return null;
  const { client, payableMap, openModal, onEditTx, onDeleteTx, onEditInv, isEmployeeView } = columnData || {};

  if (!columnData) return null;

  const handlePayInvoice = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const relatedId = rowData.related_object_id ?? (rowData as any).related_id;
    const invoice = payableMap?.get(String(relatedId));

    if (invoice && client) {
      openModal?.('recordPayment', { invoice, clientName: client.name });
    } else if (client) {
      // Fallback: create minimal invoice object from transaction
      const relatedIdNum = Number(relatedId);
      const pseudoInvoice: Partial<Invoice> = {
        id: relatedIdNum,
        client_id: client.id,
        description: rowData.description,
        amount: getDebitAmount(rowData),
        remaining_amount: getDebitAmount(rowData),
        status: 'pending',
        type: 'Other',
      };
      openModal?.('recordPayment', { invoice: pseudoInvoice as Invoice, clientName: client.name });
    }
  };

  const handleEditTx = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEditTx?.(rowData);
  };

  const handleDeleteTx = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteTx?.(rowData);
  };

  const handleEditInv = (e: React.MouseEvent) => {
    e.stopPropagation();
    const relatedId = rowData.related_object_id ?? (rowData as any).related_id;
    // Pass minimal invoice object, modal will fetch details if needed or use what's available
    const invoice = payableMap?.get(String(relatedId)) || { id: Number(relatedId) };
    onEditInv?.(invoice);
  };

  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (client) {
      openModal?.('voucherDetails', { voucher: toClientLedgerVoucher(rowData, client) });
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        pointerEvents: 'auto',
        gap: '4px'
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* View Details Action - Available for both Employee and Admin */}
      <button
        type="button"
        onClick={handleView}
        title="عرض تفاصيل الحركة"
        className={neutralActionButtonClass}
      >
        <Eye size={14} />
      </button>

      {isEmployeeView ? (
        <>
          {rowData.is_payable && (
            <button
              type="button"
              onClick={handlePayInvoice}
              title="Pay"
              className={neutralActionButtonClass}
            >
              <CreditCard size={14} />
            </button>
          )}
          {rowData.is_payable && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const relatedId = rowData.related_object_id ?? (rowData as any).related_id;
                const invoice = payableMap?.get(String(relatedId));
                if (invoice && client) {
                  const remaining = Number(invoice.remaining_amount) || 0;
                  sendPaymentReminder(client.phone || '', client.name, formatCurrency(remaining));
                }
              }}
              title="تذكير واتساب"
              className={neutralActionButtonClass}
              style={{ color: 'var(--color-whatsapp)' }}
            >
              <MessageSquare size={14} />
            </button>
          )}
        </>
      ) : (
        <>
          {rowData.is_payable && (
            <button
              type="button"
              onClick={handlePayInvoice}
              title="Pay"
              className={neutralActionButtonClass}
            >
              <CreditCard size={14} />
            </button>
          )}
          <button type="button" onClick={handleEditTx} className={neutralActionButtonClass} title="تعديل الحركة">
            <Edit3 size={14} />
          </button>
          <button type="button" onClick={handleDeleteTx} className={destructiveActionButtonClass} title="حذف الحركة">
            <Trash2 size={14} />
          </button>
          {rowData.related_object_type === 'invoice' && (
            <button type="button" onClick={handleEditInv} className={neutralActionButtonClass} title="تعديل الفاتورة">
              <FileText size={14} />
            </button>
          )}
        </>
      )}
    </div>
  );
});
ActionsCell.displayName = 'ActionsCell';

// ================================
// EXPORT
// ================================

interface LedgerExportFilters {
  start_date?: string;
  end_date?: string;
  type?: string;
  search?: string;
}

// The subset of a history row this file reads. Amounts arrive as strings from WPDB.
interface LedgerExportRow {
  id: number | string;
  transaction_date?: string | null;
  created_at?: string | null;
  transaction_type?: string | null;
  description?: string | null;
  debit?: string | number | null;
  credit?: string | number | null;
  related_object_id?: string | number | null;
}

interface LedgerExportResponse {
  transactions?: LedgerExportRow[];
  total_pages?: number;
  total_debits?: string | number;
  total_credits?: string | number;
  balance?: string | number;
}

/**
 * Reads the whole filtered ledger server-side, one page at a time.
 *
 * The endpoint caps per_page at 100 and applies the SAME filters to the rows and to the
 * total_debits / total_credits it returns, so summing the returned rows reproduces the grid
 * toolbar exactly - that is the whole point of exporting from here instead of from
 * `allTransactions`, which only holds the pages the user happened to scroll to.
 */
const fetchAllClientHistory = async (clientId: number, filters: LedgerExportFilters) => {
  const rows: LedgerExportRow[] = [];
  let page = 1;
  let totalPages = 1;
  let stats: LedgerExportResponse | null = null;

  do {
    const { data } = await apiClient.get<LedgerExportResponse>(`/accounts/client/${clientId}/history`, {
      params: {
        page,
        per_page: 100,
        // Undefined keys are dropped by axios, matching how the grid's query builds params.
        start_date: filters.start_date || undefined,
        end_date: filters.end_date || undefined,
        transaction_type: filters.type || undefined,
        search: filters.search || undefined,
      },
    });
    rows.push(...(data?.transactions || []));
    totalPages = Number(data?.total_pages || 1);
    stats = data;
    page++;
  } while (page <= totalPages);

  return { rows, stats };
};

// ================================
// MAIN COMPONENT
// ================================

const AccountLedgerTable: React.FC<AccountLedgerTableProps> = ({
  client,
  filter = 'all',
  hideAmounts = false,
  highlightInvoiceId,
  isEmployeeView = false,
}) => {
  useTranslation();
  const openModal = useModalStore(state => state.openModal);
  const tableRef = useRef<HTMLDivElement>(null);

  const [selectedTransaction, setSelectedTransaction] = React.useState<any>(null);
  const [selectedInvoice, setSelectedInvoice] = React.useState<any>(null);
  const [modalType, setModalType] = React.useState<'editTx' | 'deleteTx' | 'editInv' | null>(null);

  const [page, setPage] = useState(1);
  const [allTransactions, setAllTransactions] = useState<FinancialTransaction[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Deep link: /clients/:id?search=7868 opens this ledger scoped to a single transaction,
  // which is where the paired-leg link in the voucher modal lands for a client counterparty.
  //
  // Guarded on the route because this component is ALSO rendered inside AccountLedgerModal,
  // where the surrounding page's ?search= belongs to a different component and must not
  // silently pre-filter the modal. Page-level instances sit on /clients/:id (admin) or
  // /employee/clients/:id (employee); both end in `/clients/${client.id}`.
  //
  // Read into INITIAL state for both the committed filter and the visible box. Seeding via an
  // effect instead would race the reset-sync effect below, which also fires on mount and
  // would clobber the seed on the way in.
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const linkedSearch = location.pathname.endsWith(`/clients/${client.id}`)
    ? searchParams.get('search') ?? ''
    : '';

  const [localSearch, setLocalSearch] = useState(linkedSearch);
  const [showExportChoice, setShowExportChoice] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const toast = useToast();
  const [filters, setFilters] = useState<FilterState>({
    start_date: '',
    end_date: '',
    type: filter && filter !== 'all' ? filter : '',
    search: linkedSearch,
  });

  // Debounce search by 350ms
  useEffect(() => {
    const handler = setTimeout(() => {
      if (localSearch !== filters.search) {
        setFilters(prev => ({ ...prev, search: localSearch }));
        setPage(1);
      }
    }, 350);
    return () => clearTimeout(handler);
  }, [localSearch, filters.search]);

  // The reset button clears filters.search; mirror it back into the input. Without this the
  // box keeps showing the old text while the grid shows the full ledger - the one control
  // and its result disagreeing on screen. (The treasury ledger already does this.)
  useEffect(() => {
    setLocalSearch(filters.search);
  }, [filters.search]);

  // Keep filters.type updated if prop filter changes
  useEffect(() => {
    if (filter && filter !== 'all') {
      setFilters(prev => ({ ...prev, type: filter }));
      setPage(1);
    }
  }, [filter]);

  // Fetch account data with server-side filters
  const {
    data: historyData,
    isLoading: isLoadingHistory,
    error: historyError
  } = useGetAccountHistory('client', client.id, page, {
    start_date: filters.start_date,
    end_date: filters.end_date,
    transaction_type: filters.type,
    search: filters.search,
  });

  const {
    data: payableInvoices
  } = useGetPayableInvoices(client.id);

  // Accumulate transactions for pagination / infinite scroll
  useEffect(() => {
    if (historyData?.transactions) {
      const rawTxns = historyData.transactions;
      setAllTransactions(prev => {
        if (page === 1) return rawTxns;
        const existingIds = new Set(prev.map(t => t.id));
        const newTxns = rawTxns.filter(t => !existingIds.has(t.id));
        return [...prev, ...newTxns];
      });
    }
  }, [historyData?.transactions, page]);

  const totalPages = historyData?.pagination?.total_pages || 1;
  const hasMore = page < totalPages;
  const totalRecords = historyData?.pagination?.total || allTransactions.length;

  const loadMore = useCallback(() => {
    if (hasMore && !isLoadingHistory) setPage(p => p + 1);
  }, [hasMore, isLoadingHistory]);

  useEffect(() => {
    const sentinel = scrollRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && hasMore && !isLoadingHistory) loadMore(); },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingHistory, loadMore]);

  const isLoading = isLoadingHistory && page === 1 && allTransactions.length === 0;

  // Calculate totals from backend statistics if available, or fall back to accumulated transactions
  const totals = useMemo(() => {
    const totalDebit = historyData?.total_debits !== undefined
      ? Number(historyData.total_debits)
      : allTransactions.reduce((sum, tx) => sum + getDebitAmount(tx), 0);
    const totalCredit = historyData?.total_credits !== undefined
      ? Number(historyData.total_credits)
      : allTransactions.reduce((sum, tx) => sum + getCreditAmount(tx), 0);
    const balance = historyData?.balance !== undefined
      ? Number(historyData.balance)
      : (totalDebit - totalCredit);
    return { totalDebit, totalCredit, balance };
  }, [historyData?.total_debits, historyData?.total_credits, historyData?.balance, allTransactions]);

  // Create a map of payable invoices for O(1) lookup
  const payableMap = useMemo(() => {
    const map = new Map<string, Invoice>();
    (payableInvoices ?? []).forEach(inv => {
      if (inv?.id != null && (Number(inv.remaining_amount) ?? 0) > 0) {
        map.set(String(inv.id), inv);
      }
    });
    return map;
  }, [payableInvoices]);

  // Pre-calculate is_payable flag for each transaction to ensure grid updates
  const transactionsWithFlags = useMemo(() => {
    const list = allTransactions.map(tx => {
      const relatedId = tx.related_object_id ?? (tx as any).related_id ?? (tx as any).related_object_reference;
      const relatedType = String(tx.related_object_type ?? '').toLowerCase();
      const key = String(relatedId ?? '');

      const isInvoiceType =
        tx.transaction_type === 'INVOICE_CREATED' ||
        tx.transaction_type === 'INVOICE_GENERATED';

      const isPayable = isInvoiceType &&
        relatedType === 'invoice' &&
        payableMap.has(key);

      // Check if this transaction matches the highlighted invoice
      // Only match INVOICE_GENERATED/INVOICE_CREATED, not PAYMENT_RECEIVED
      const isHighlighted = Boolean(
        highlightInvoiceId &&
        relatedType === 'invoice' &&
        Number(relatedId) === highlightInvoiceId &&
        isInvoiceType // Only invoice transactions, not payments
      );

      // Debug: log when we find a highlighted transaction
      if (isHighlighted) {
        console.log('🔵 Highlighted INVOICE transaction:', {
          transactionId: tx.id,
          transactionType: tx.transaction_type,
          relatedId,
          highlightInvoiceId,
        });
      }

      return { ...tx, is_payable: isPayable, is_highlighted: isHighlighted };
    });

    // Totals now live in the toolbar (server-calculated), so no SUMMARY_ROW is injected.
    return list;
  }, [allTransactions, payableMap, highlightInvoiceId]);

  // Generate a version key to force grid re-render when payable status changes
  const payableVersion = useMemo(() => {
    if (!payableInvoices) return '0';
    return payableInvoices.map(inv => `${inv.id}:${inv.remaining_amount}`).join('|');
  }, [payableInvoices]);

  // Define columns - order is right-to-left for RTL
  const columns = useMemo((): HuloolGridColumn<FinancialTransaction>[] => [
    {
      id: 'date',
      key: 'transaction_date',
      title: 'التاريخ',
      type: 'custom',
      component: DateCell,
      grow: 1,
    },
    {
      id: 'type',
      key: 'transaction_type',
      title: 'النوع',
      type: 'custom',
      component: TypeBadgeCell,
      cellClassName: ({ rowData }: any) => {
        if ((rowData as any).is_summary) return '';
        // Colour is resolved from debit/credit against the client's debit-normal
        // polarity, not from a transaction_type lookup - see shared/ledger/ledgerDirection.
        return ledgerToneClassName('client', rowData.debit, rowData.credit);
      },
      grow: 1,
    },
    {
      id: 'description',
      key: 'description',
      title: 'الوصف',
      type: 'custom',
      component: DescriptionCell,
      grow: 2.5,
    },
    {
      id: 'debit',
      key: 'debit',
      title: 'مدين',
      type: 'custom',
      component: DebitCell,
      columnData: { hideAmounts },
      grow: 1,
      cellClassName: ({ rowData }) => {
        if ((rowData as any).is_summary) return 'ledger-summary-debit text-center';
        return getDebitAmount(rowData) > 0 ? 'ledger-debit-cell text-center' : '';
      }
    },
    {
      id: 'credit',
      key: 'credit',
      title: 'دائن',
      type: 'custom',
      component: CreditCell,
      columnData: { hideAmounts },
      grow: 1,
      cellClassName: ({ rowData }) => {
        if ((rowData as any).is_summary) return 'ledger-summary-credit text-center';
        return getCreditAmount(rowData) > 0 ? 'ledger-credit-cell text-center' : '';
      }
    },
    {
      id: 'balance',
      key: 'balance',
      title: 'الرصيد النهائي',
      type: 'custom',
      component: BalanceCell,
      columnData: { hideAmounts },
      grow: 1,
      cellClassName: ({ rowData }) => {
        const balance = getBalance(rowData);
        const isNeg = balance < 0;
        if ((rowData as any).is_summary) {
          return isNeg ? 'ledger-summary-balance-neg text-center' : 'ledger-summary-balance-pos text-center';
        }
        return isNeg ? 'ledger-balance-neg text-center' : 'ledger-balance-pos text-center';
      }
    },
    {
      id: 'actions',
      key: 'id',
      title: 'الإجراءات',
      type: 'custom',
      component: ActionsCell as React.ComponentType<CellProps<FinancialTransaction>>,
      columnData: {
        client,
        payableMap,
        openModal,
        onEditTx: (tx: any) => { setSelectedTransaction(tx); setModalType('editTx'); },
        onDeleteTx: (tx: any) => { setSelectedTransaction(tx); setModalType('deleteTx'); },
        onEditInv: (inv: any) => { setSelectedInvoice(inv); setModalType('editInv'); },
        isEmployeeView
      },
      width: isEmployeeView ? 120 : 160,
      grow: 0,
    },
  ], [hideAmounts, client, payableMap, openModal, isEmployeeView]);

  // Auto-scroll to highlighted transaction
  useEffect(() => {
    if (highlightInvoiceId && transactionsWithFlags.length > 0 && tableRef.current) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        const highlightedElement = tableRef.current?.querySelector('.transaction-row-highlighted');
        if (highlightedElement) {
          highlightedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [highlightInvoiceId, transactionsWithFlags.length]);

  // --- Excel export (تصدير) ---
  // One handler for all three modal options; they differ only in the filters sent to the
  // server. No overrides = the toolbar's current filters; every override = that option's own
  // filters, so "كامل" and "نطاق تاريخي" really do ignore what is in the toolbar (a leftover
  // type/search filter there would silently make a full export a filtered one).
  const handleExportLedger = async (overrides?: LedgerExportFilters) => {
    const effective: LedgerExportFilters = {
      start_date: filters.start_date,
      end_date: filters.end_date,
      type: filters.type,
      search: filters.search,
      ...overrides,
    };

    try {
      setIsExporting(true);
      const { rows, stats } = await fetchAllClientHistory(client.id, effective);

      const rowsDebit = rows.reduce((sum, tx) => sum + Number(tx.debit || 0), 0);
      const rowsCredit = rows.reduce((sum, tx) => sum + Number(tx.credit || 0), 0);

      // Prefer the server totals (they are what the toolbar shows, and they stay right even
      // if the grid has not scrolled to every row yet); fall back to summing the rows.
      const totalDebit = stats?.total_debits !== undefined ? Number(stats.total_debits) : rowsDebit;
      const totalCredit = stats?.total_credits !== undefined ? Number(stats.total_credits) : rowsCredit;
      const balance = stats?.balance !== undefined ? Number(stats.balance) : totalDebit - totalCredit;

      const reportData: ClientStatementReportData = {
        client,
        clientName: client.name,
        clientPhone: client.phone || '',
        statementItems: rows.map((tx) => ({
          id: Number(tx.id),
          description: tx.description || '',
          debit: Number(tx.debit || 0),
          credit: Number(tx.credit || 0),
          date: tx.transaction_date || tx.created_at || '',
          type: typeLabel(tx.transaction_type),
          reference_id: tx.related_object_id ? Number(tx.related_object_id) : undefined,
        })),
        totals: { totalDebit, totalCredit, balance },
        // The sheet prints this as "فترة التقرير"; use the real span of the exported rows
        // (the endpoint orders newest first) rather than inventing a last-365-days window.
        period: {
          from: (effective.start_date || rows[rows.length - 1]?.transaction_date || '').slice(0, 10) || new Date().toISOString().slice(0, 10),
          to: (effective.end_date || rows[0]?.transaction_date || '').slice(0, 10) || new Date().toISOString().slice(0, 10),
        },
      };

      await exportService.exportClientStatement(reportData);
      toast.success('تم التصدير بنجاح');
    } catch (err) {
      toast.error('فشل التصدير', err instanceof Error ? err.message : String(err));
    } finally {
      setIsExporting(false);
    }
  };

  // The modal sends "YYYY-MM-DD 00:00:00" / "23:59:59"; the endpoint uses the time part when present.
  const NO_FILTERS: LedgerExportFilters = { start_date: '', end_date: '', type: '', search: '' };
  const handleExportFiltered = () => handleExportLedger();
  const handleExportFull = () => handleExportLedger(NO_FILTERS);
  const handleExportDateRange = (startDate?: string, endDate?: string) =>
    handleExportLedger({ start_date: startDate || '', end_date: endDate || '', type: '', search: '' });

  if (historyError) {
    return (
      <div className="text-center p-12 text-status-danger-text">
        <FileText size={48} className="mb-3 opacity-50 mx-auto" />
        <p className="mb-0">حدث خطأ في تحميل البيانات</p>
      </div>
    );
  }

  const hasActiveFilters = Boolean(filters.start_date || filters.end_date || filters.type || filters.search);

  return (
    <div className="account-ledger-wrapper mx-auto w-[96%] max-w-[1600px] my-3 space-y-3" ref={tableRef}>
      <style>{filterDateStyles}</style>
      <style>{`
        /* Highlighted transaction row - use outline for reliable border */
        .hulool-data-grid .dsg-row.transaction-row-highlighted {
          outline: 3px solid var(--token-border-focus) !important;
          outline-offset: -2px;
          z-index: 10;
          position: relative;
        }
        
        /* Highlighted cells get background color */
        .hulool-data-grid .dsg-row.transaction-row-highlighted .dsg-cell {
          background-color: color-mix(in srgb, var(--token-border-focus) 22%, var(--token-bg-surface)) !important;
        }
        
        /* Add pulsing animation to row */
        .hulool-data-grid .dsg-row.transaction-row-highlighted {
          animation: highlightPulse 1.5s ease-in-out 3;
        }

        @keyframes highlightPulse {
          0%, 100% {
            outline-color: var(--token-border-focus);
            box-shadow: 0 0 0 4px color-mix(in srgb, var(--token-border-focus) 28%, transparent);
          }
          50% {
            outline-color: var(--token-text-brand);
            box-shadow: 0 0 0 8px color-mix(in srgb, var(--token-border-focus) 35%, transparent);
          }
        }
      `}</style>

      {/* Unified Compact Filters Toolbar Card */}
{/* lg:sticky keeps the search filters and the totals reachable while scrolling a long
           ledger. <main> is the scroll container (flex-1 overflow-y-auto) and the navbar is
           its sibling, so top-0 lands directly under the navbar. z-40 stays below the
           navbar's z-50 and the dropdowns' z-[9999]. */}
      <div className="lg:sticky lg:top-0 lg:z-40 bg-bg-surface border border-border-default rounded-xl shadow-xs overflow-hidden">
        <div className="relative flex flex-col lg:flex-row lg:items-stretch">

          {/* RTL start (right): Inline Filter Fields. Below lg the row stays a single line and
              scrolls sideways instead of wrapping into a tall column; lg restores the wrap. */}
          <div className="header-inline-filters flex flex-nowrap items-center gap-2 p-3 lg:flex-wrap lg:justify-end min-w-0 shrink-0 overflow-x-auto lg:overflow-x-visible">
            {/* Search */}
            <div className="relative w-36 shrink-0 lg:w-48 lg:shrink">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                dir="rtl"
                className="base-input h-9 w-full rounded-lg border-border-default bg-background/50 px-2 pl-8 text-right text-xs shadow-sm transition-all placeholder:text-text-muted/70 focus:bg-background focus:ring-1 focus:ring-primary/30"
                placeholder="بحث في البيان، الهاتف، المعرّف... أو #رقم الحركة"
                value={localSearch}
                onChange={e => setLocalSearch(e.target.value)}
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

            {/* Id lookup: a narrow view over the SAME `search` value, not a second filter. The
                endpoint already matches t.id for a numeric search, with or without a leading '#'
                (verified: search=377 and search=#377 both return row 377; #37777 returns none).
                Sharing localSearch is what makes the reset button and the ?search= deep link
                clear this box with no extra code. */}
            <div className="relative w-20 shrink-0">
              <Hash size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                inputMode="numeric"
                dir="ltr"
                aria-label="بحث برقم الحركة"
                className="base-input h-9 w-full rounded-lg border-border-default bg-background/50 px-2 pl-8 text-center text-xs shadow-sm transition-all placeholder:text-text-muted/70 focus:bg-background focus:ring-1 focus:ring-primary/30"
                placeholder="#123"
                value={/^#?\d+$/.test(localSearch) ? localSearch : ''}
                onChange={e => setLocalSearch(e.target.value.replace(/[^\d#]/g, ''))}
              />
            </div>

            {/* Start Date */}
            <DatePicker
              selected={parseDate(filters.start_date)}
              onChange={(date: Date | null) => {
                setFilters(prev => ({ ...prev, start_date: toISODate(date) }));
                setPage(1);
              }}
              dateFormat="yyyy-MM-dd"
              placeholderText="من تاريخ"
              locale={arSA}
              portalId="client-ledger-datepicker-portal"
              showYearDropdown
              scrollableYearDropdown
              dropdownMode="select"
              calendarStartDay={6}
            />

            {/* End Date */}
            <DatePicker
              selected={parseDate(filters.end_date)}
              onChange={(date: Date | null) => {
                setFilters(prev => ({ ...prev, end_date: toISODate(date) }));
                setPage(1);
              }}
              dateFormat="yyyy-MM-dd"
              placeholderText="إلى تاريخ"
              locale={arSA}
              portalId="client-ledger-datepicker-portal"
              showYearDropdown
              scrollableYearDropdown
              dropdownMode="select"
              calendarStartDay={6}
            />

            {/* Type Select */}
            <div className="w-32 shrink-0">
              <Select
                value={filters.type || ALL_TYPES_VALUE}
                onValueChange={value => {
                  setFilters(prev => ({ ...prev, type: value === ALL_TYPES_VALUE ? '' : value }));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-full rounded-lg border-border-default bg-background/50 text-xs font-medium shadow-sm transition-all hover:bg-background focus:ring-1 focus:ring-primary/20">
                  <SelectValue placeholder="النوع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_TYPES_VALUE}>كل الحركات</SelectItem>
                  <SelectItem value="receipt">سند قبض</SelectItem>
                  <SelectItem value="payment">سند صرف</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reset */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setLocalSearch('');
                  setFilters({ start_date: '', end_date: '', type: '', search: '' });
                  setPage(1);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-dashed border-border-default bg-background hover:bg-primary/5 hover:text-text-primary transition-all active:scale-95 text-text-secondary"
                title="إعادة ضبط الفلاتر"
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>

          {/* Center: Icon / Title / Count. Sits between the filters and the totals as a real
              flex child with equal-width spacers, so it reads as the bar's midpoint without
              absolute positioning (which overlapped the filters on narrow screens). The
              title/count truncate so this stays one line on a phone. */}
          <div className="order-first flex items-center justify-center gap-2.5 py-2 lg:py-3 shrink-0 lg:order-none lg:flex-1">
            <div className="hidden lg:flex-1" aria-hidden="true" />
            <div className="shrink-0 text-primary">
              <Receipt size={20} />
            </div>
            <div className="flex items-baseline min-w-0">
              <span className="text-sm font-bold text-text-primary truncate min-w-0">كشف الحساب المالي</span>
              {totalRecords > 0 && (
                <span className="text-xs text-text-secondary mr-2 font-normal truncate min-w-0">
                  ({totalRecords} حركة)
                </span>
              )}
            </div>
            <div className="hidden lg:flex-1" aria-hidden="true" />
          </div>

          {/* RTL end (left): server-calculated totals, as flush cells, then the export action.
              Below lg they stay a single flush row that scrolls sideways (they no longer fit a
              phone and used to be clipped); lg keeps them in place with the inline-start divider.
              The Button is whitespace-nowrap, so the export action never gets squeezed out. */}
          <div className="flex items-stretch shrink-0 border-t lg:border-t-0 lg:border-s border-border-default overflow-x-auto lg:overflow-x-visible">
            {hideAmounts ? (
              <>
                <div className="flex items-center px-5 py-1.5 text-text-secondary text-xs">•••</div>
                {/* No export when the viewer may not see amounts: the sheet would hand over
                    exactly the debits/credits the toolbar is hiding. */}
                <div className="flex items-center px-4">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => setShowExportChoice(true)}
                    disabled
                    className="h-9 whitespace-nowrap"
                    title="لا يمكن التصدير بدون صلاحية عرض المبالغ"
                  >
                    <FileSpreadsheet size={15} className="me-1.5" />
                    تصدير Excel
                  </Button>
                </div>
              </>
            ) : (
              <>
                <LedgerStatCell label="اجمالي المدين" value={totals.totalDebit} tone="debit" divider />
                <LedgerStatCell label="اجمالي الدائن" value={totals.totalCredit} tone="credit" divider />
                <LedgerStatCell label="الرصيد النهائي" value={totals.balance} tone="balance" divider />
                <div className="flex items-center px-4">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => setShowExportChoice(true)}
                    disabled={isExporting || allTransactions.length === 0}
                    className="h-9 whitespace-nowrap"
                  >
                    <FileSpreadsheet size={15} className="me-1.5" />
                    تصدير Excel
                  </Button>
                </div>
              </>
            )}
          </div>

        </div>
      </div>

      {/* Transactions Grid */}
      <div className="bg-bg-surface rounded-xl border border-border-default shadow-xs overflow-hidden">
        <HuloolDataGrid
          key={payableVersion}
          data={transactionsWithFlags}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="لا توجد حركات مالية"
          showId={false}
          height="auto"
          minHeight={300}
          rowClassName={(row: any) => {
            if (row.is_summary) return 'ledger-summary-row';
            return row.is_highlighted ? 'transaction-row-highlighted' : '';
          }}
        />

        {hasMore && (
          <div ref={scrollRef} className="flex justify-center items-center py-3 border-t border-border-default">
            {isLoadingHistory && page > 1 ? (
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                جاري تحميل المزيد...
              </div>
            ) : (
              <div className="text-sm text-text-secondary">مرر للأسفل لتحميل المزيد</div>
            )}
          </div>
        )}

        {allTransactions.length > 0 && (
          <div className="flex justify-center items-center py-2 border-t border-border-default bg-bg-surface-muted/30">
            <div className="text-xs text-text-secondary">
              عرض {allTransactions.length} من {totalRecords} حركة
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <ExportChoiceModal
        isOpen={showExportChoice}
        onClose={() => setShowExportChoice(false)}
        onExportFiltered={handleExportFiltered}
        onExportFull={handleExportFull}
        onExportDateRange={handleExportDateRange}
        title="تصدير كشف الحساب"
      />
      {modalType === 'editTx' && selectedTransaction && (
        <TransactionEditModal
          isOpen={true}
          onClose={() => setModalType(null)}
          transaction={selectedTransaction}
        />
      )}
      {modalType === 'deleteTx' && selectedTransaction && (
        <TransactionDeleteModal
          isOpen={true}
          onClose={() => setModalType(null)}
          transaction={selectedTransaction}
        />
      )}
      {modalType === 'editInv' && selectedInvoice && (
        <InvoiceEditModal
          isOpen={true}
          onClose={() => setModalType(null)}
          invoice={selectedInvoice}
        />
      )}
    </div>
  );
};

export default AccountLedgerTable;
