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
  X,
  RotateCcw,
  Eye
} from 'lucide-react';
import { formatDate } from '@/shared/utils/dateUtils';
import { useModalStore } from '@/shared/stores/modalStore';
import { useGetAccountHistory } from '@/features/financials/api/accountQueries';
import { useGetPayableInvoices } from '@/features/invoices/api/invoiceQueries';
import { sendPaymentReminder } from '@/shared/utils/whatsappUtils';
import HuloolDataGrid from '@/shared/grid/HuloolDataGrid';
import { LedgerFinalBalanceCell } from '@/shared/grid';
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
const TypeBadgeCell = React.memo(({ rowData }: CellProps<FinancialTransaction>) => {
  if ((rowData as any).is_summary) return <span className="hulool-cell-content" />;
  const badges: Record<string, { bg: string; text: string; label: string }> = {
    'INVOICE_CREATED': { bg: 'var(--token-status-danger-bg)', text: 'var(--token-status-danger-text)', label: 'فاتورة' },
    'INVOICE_GENERATED': { bg: 'var(--token-status-danger-bg)', text: 'var(--token-status-danger-text)', label: 'فاتورة' },
    'PAYMENT_RECEIVED': { bg: 'var(--token-status-success-bg)', text: 'var(--token-status-success-text)', label: 'دفعة' },
    'CREDIT_APPLIED': { bg: 'var(--token-status-info-bg)', text: 'var(--token-status-info-text)', label: 'تخصيص رصيد' },
    'CREDIT_RECEIVED': { bg: 'var(--token-status-info-bg)', text: 'var(--token-status-info-text)', label: 'رصيد مستلم' },
    'CREDIT_ALLOCATED': { bg: 'var(--token-status-info-bg)', text: 'var(--token-status-info-text)', label: 'تخصيص رصيد' },
    'ADJUSTMENT': { bg: 'var(--token-status-warning-bg)', text: 'var(--token-status-warning-text)', label: 'تعديل' },
    'REVERSAL': { bg: 'var(--token-status-warning-bg)', text: 'var(--token-text-warning)', label: 'عكس' },
    'INVOICE_REVERSED': { bg: 'var(--token-status-warning-bg)', text: 'var(--token-text-warning)', label: 'فاتورة ملغاة' },
    'PAYOUT': { bg: 'var(--token-status-danger-bg)', text: 'var(--token-status-danger-text)', label: 'سند صرف' },
    'REPAYMENT': { bg: 'var(--token-status-success-bg)', text: 'var(--token-status-success-text)', label: 'سند قبض' },
  };

  const badge = badges[rowData.transaction_type] || {
    bg: 'var(--token-status-neutral-bg)',
    text: 'var(--token-text-primary)',
    label: rowData.transaction_type,
  };

  return (
    <span className="hulool-cell-content" style={{ justifyContent: 'center' }}>
      <span style={{
        backgroundColor: badge.bg,
        color: badge.text,
        padding: '4px 10px',
        borderRadius: '9999px',
        fontSize: '0.875rem',
        fontWeight: 600,
      }}>
        {badge.label}
      </span>
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
  const [localSearch, setLocalSearch] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    start_date: '',
    end_date: '',
    type: filter && filter !== 'all' ? filter : '',
    search: '',
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

    if (list.length > 0) {
      list.unshift({
        id: -999,
        transaction_type: 'SUMMARY_ROW',
        description: 'الإجماليات',
        debit: totals.totalDebit,
        credit: totals.totalCredit,
        balance_after: totals.balance,
        transaction_date: '',
        created_at: '',
        is_summary: true,
      } as any);
    }

    return list;
  }, [allTransactions, payableMap, highlightInvoiceId, totals]);

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
      <div className="bg-bg-surface border border-border-default rounded-xl p-3 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Right: Icon / Title / Count */}
          <div className="flex items-center gap-2.5 shrink-0 min-w-0">
            <div className="shrink-0 text-primary">
              <Receipt size={20} />
            </div>
            <div className="min-w-0">
              <span className="text-sm font-bold text-text-primary">كشف الحساب المالي</span>
              {totalRecords > 0 && (
                <span className="text-xs text-text-secondary mr-2 font-normal">
                  ({totalRecords} حركة)
                </span>
              )}
            </div>
          </div>

          {/* Center: Inline Filter Fields */}
          <div className="header-inline-filters flex flex-wrap items-center gap-2 lg:flex-1 lg:justify-center min-w-0">
            {/* Search */}
            <div className="relative w-48">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                dir="rtl"
                className="base-input h-9 w-full rounded-lg border-border-default bg-background/50 px-2 pl-8 text-right text-xs shadow-sm transition-all placeholder:text-text-muted/70 focus:bg-background focus:ring-1 focus:ring-primary/30"
                placeholder="بحث في البيان، الهاتف، المعرّف..."
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

          {/* Left: Final Balance Display */}
          <div className="flex items-center gap-3 shrink-0 lg:border-s lg:border-border-default lg:ps-4">
            <div className="text-left">
              <p className="text-[10px] text-text-secondary leading-none">الرصيد النهائي</p>
              <p className={`text-base font-black mt-0.5 whitespace-nowrap ${totals.balance < 0 ? 'text-status-danger-text' : 'text-text-brand'}`}>
                {hideAmounts ? '***' : formatCurrency(totals.balance)}
              </p>
            </div>
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
