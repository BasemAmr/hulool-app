/**
 * AccountLedgerTable Component - Rewritten with HuloolDataGrid
 * 
 * Displays a client's financial ledger with all transactions (invoices, payments, credits).
 * Uses the new Account/Ledger API endpoints for accurate double-entry accounting display.
 * 
 * IMPORTANT: Never calculate balances manually in the frontend - always use the 
 * balance_after field from the API response.
 */

import React, { useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  FinancialTransaction,
  Client,
  Invoice
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
  Trash2
} from 'lucide-react';
import { formatDate } from '@/shared/utils/dateUtils';
import { useModalStore } from '@/shared/stores/modalStore';
import { useGetAccountHistory } from '@/features/financials/api/accountQueries';
import { useGetPayableInvoices } from '@/features/invoices/api/invoiceQueries';
import HuloolDataGrid from '@/shared/grid/HuloolDataGrid';
import type { HuloolGridColumn } from '@/shared/grid/HuloolDataGrid';
import type { CellProps } from 'react-datasheet-grid';

const neutralActionButtonClass = 'inline-flex items-center justify-center rounded p-1.5 text-text-secondary hover:text-text-primary cursor-pointer transition-colors duration-150';
const destructiveActionButtonClass = 'inline-flex items-center justify-center rounded p-1.5 text-text-secondary hover:text-text-danger cursor-pointer transition-colors duration-150';

interface AccountLedgerTableProps {
  client: Client;
  filter?: 'all' | 'invoices' | 'payments' | 'credits';
  hideAmounts?: boolean;
  highlightInvoiceId?: number;
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

// ================================
// CUSTOM CELL COMPONENTS
// ================================

// Transaction Icon Cell
const TransactionIconCell = React.memo(({ rowData }: CellProps<FinancialTransaction>) => {
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
  return (
    <span className="hulool-cell-content" style={{ fontWeight: active ? 700 : 500, color: 'var(--token-text-primary)' }}>
      {rowData.description}
    </span>
  );
});
DescriptionCell.displayName = 'DescriptionCell';

// Debit Cell
const DebitCell = React.memo(({ rowData, columnData, active }: CellProps<FinancialTransaction, { hideAmounts: boolean }>) => {
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
  const amount = getCreditAmount(rowData);
  return (
    <span className="hulool-cell-content" style={{ justifyContent: 'center', color: 'var(--token-text-primary)', fontWeight: active ? 700 : 500 }}>
      {columnData?.hideAmounts ? '***' : (amount > 0 ? formatCurrency(amount) : '—')}
    </span>
  );
});
CreditCell.displayName = 'CreditCell';

// Balance Cell
const BalanceCell = React.memo(({ rowData, columnData, active }: CellProps<FinancialTransaction, { hideAmounts: boolean }>) => {
  const balance = getBalance(rowData);
  return (
    <span className="hulool-cell-content" style={{ justifyContent: 'center', fontWeight: active ? 800 : 700, color: balance < 0 ? 'var(--token-text-danger)' : 'var(--token-text-primary)' }}>
      {columnData?.hideAmounts ? '***' : formatCurrency(balance)}
    </span>
  );
});
BalanceCell.displayName = 'BalanceCell';

// Date Cell
const DateCell = React.memo(({ rowData, active }: CellProps<FinancialTransaction>) => {
  return (
    <span className="hulool-cell-content" style={{ justifyContent: 'center', fontSize: '0.875rem', color: 'var(--token-text-primary)', fontWeight: active ? 700 : 500 }}>
      {formatDate(rowData.transaction_date || rowData.created_at)}
    </span>
  );
});
DateCell.displayName = 'DateCell';

// Type Badge Cell
const TypeBadgeCell = React.memo(({ rowData }: CellProps<FinancialTransaction>) => {
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
}

const ActionsCell = React.memo(({ rowData, columnData }: CellProps<FinancialTransaction & { is_payable?: boolean }, ActionsColumnData>) => {
  const { client, payableMap, openModal, onEditTx, onDeleteTx, onEditInv } = columnData || {};

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
      <button type="button" onClick={handleEditTx} className={neutralActionButtonClass} title="Edit Transaction">
        <Edit3 size={14} />
      </button>
      <button type="button" onClick={handleDeleteTx} className={destructiveActionButtonClass} title="Delete Transaction">
        <Trash2 size={14} />
      </button>
      {rowData.related_object_type === 'invoice' && (
        <button type="button" onClick={handleEditInv} className={neutralActionButtonClass} title="Edit Invoice">
          <FileText size={14} />
        </button>
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
}) => {
  useTranslation();
  const openModal = useModalStore(state => state.openModal);
  const tableRef = useRef<HTMLDivElement>(null);

  const [selectedTransaction, setSelectedTransaction] = React.useState<any>(null);
  const [selectedInvoice, setSelectedInvoice] = React.useState<any>(null);
  const [modalType, setModalType] = React.useState<'editTx' | 'deleteTx' | 'editInv' | null>(null);

  // Fetch account data
  const {
    data: historyData,
    isLoading: isLoadingHistory,
    error: historyError
  } = useGetAccountHistory('client', client.id);

  const {
    data: payableInvoices
  } = useGetPayableInvoices(client.id);

  const isLoading = isLoadingHistory;

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    if (!historyData?.transactions) return [];

    return historyData.transactions.filter(tx => {
      switch (filter) {
        case 'invoices':
          return tx.transaction_type === 'INVOICE_CREATED' || tx.transaction_type === 'INVOICE_GENERATED';
        case 'payments':
          return tx.transaction_type === 'PAYMENT_RECEIVED';
        case 'credits':
          return tx.transaction_type === 'CREDIT_APPLIED' || tx.transaction_type === 'CREDIT_RECEIVED' || tx.transaction_type === 'CREDIT_ALLOCATED';
        default:
          return true;
      }
    });
  }, [historyData?.transactions, filter]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalDebit = filteredTransactions.reduce((sum, tx) => sum + getDebitAmount(tx), 0);
    const totalCredit = filteredTransactions.reduce((sum, tx) => sum + getCreditAmount(tx), 0);
    const balance = historyData?.balance ?? (totalDebit - totalCredit);
    return { totalDebit, totalCredit, balance };
  }, [filteredTransactions, historyData?.balance]);

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
    return filteredTransactions.map(tx => {
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
  }, [filteredTransactions, payableMap, highlightInvoiceId]);

  // Generate a version key to force grid re-render when payable status changes
  const payableVersion = useMemo(() => {
    if (!payableInvoices) return '0';
    return payableInvoices.map(inv => `${inv.id}:${inv.remaining_amount}`).join('|');
  }, [payableInvoices]);

  // Define columns - order is right-to-left for RTL
  const columns = useMemo((): HuloolGridColumn<FinancialTransaction>[] => [
    {
      id: 'icon',
      key: 'transaction_type',
      title: '',
      type: 'custom',
      component: TransactionIconCell,
      width: 50,
      grow: 0,
    },
    {
      id: 'description',
      key: 'description',
      title: 'الوصف',
      type: 'custom',
      component: DescriptionCell,
      grow: 2,
    },
    {
      id: 'debit',
      key: 'debit',
      title: 'مدين',
      type: 'custom',
      component: DebitCell,
      columnData: { hideAmounts },
      grow: 1,
    },
    {
      id: 'credit',
      key: 'credit',
      title: 'دائن',
      type: 'custom',
      component: CreditCell,
      columnData: { hideAmounts },
      grow: 1,
    },
    {
      id: 'balance',
      key: 'balance',
      title: 'الرصيد',
      type: 'custom',
      component: BalanceCell,
      columnData: { hideAmounts },
      grow: 1,
    },
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
        onEditInv: (inv: any) => { setSelectedInvoice(inv); setModalType('editInv'); }
      },
      width: 120,
      grow: 0,
    },
  ], [hideAmounts, client, payableMap, openModal]);

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

  return (
    <div className="account-ledger-wrapper" ref={tableRef}>
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
      {/* Balance Summary Header */}
      {historyData && (
        <div className="rounded-lg border border-border bg-card shadow-sm mb-4 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div className="flex flex-col items-center p-3 bg-bg-surface-muted rounded-lg">
              <span className="text-sm text-text-muted mb-1">إجمالي المستحقات</span>
              <span className="text-lg font-bold text-text-primary">
                {hideAmounts ? '***' : formatCurrency(historyData.total_debits)}
              </span>
            </div>
            <div className="flex flex-col items-center p-3 bg-bg-surface-muted rounded-lg">
              <span className="text-sm text-text-muted mb-1">إجمالي المدفوعات</span>
              <span className="text-lg font-bold text-text-primary">
                {hideAmounts ? '***' : formatCurrency(historyData.total_credits)}
              </span>
            </div>
            <div className="flex flex-col items-center p-3 bg-bg-surface-muted rounded-lg">
              <span className="text-sm text-text-muted mb-1">الرصيد الحالي</span>
              <span className={`text-xl font-bold ${(historyData.balance ?? 0) < 0 ? 'text-status-danger-text' : 'text-text-primary'}`}>
                {hideAmounts ? '***' : formatCurrency(historyData.balance)}
              </span>
            </div>
            <div className="flex flex-col items-center p-3 bg-bg-surface-muted rounded-lg">
              <span className="text-sm text-text-muted mb-1">عدد المعاملات</span>
              <span className="text-sm font-medium text-text-secondary">
                {historyData.transactions?.length || 0}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Transactions Grid */}
      <HuloolDataGrid
        key={payableVersion}
        data={transactionsWithFlags}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="لا توجد حركات مالية"
        showId={false}
        height="auto"
        minHeight={300}
        rowClassName={(row: any) => row.is_highlighted ? 'transaction-row-highlighted' : ''}
      />

      {/* Summary Totals Row */}
      <div className="rounded-lg border border-border bg-card shadow-sm mt-2">
        <div className="p-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-center">
            <div className="flex justify-between items-center p-2 bg-bg-surface-muted rounded">
              <span className="text-text-secondary text-sm">إجمالي المدين:</span>
              <span className="font-bold text-text-primary">
                {hideAmounts ? '***' : formatCurrency(totals.totalDebit)}
              </span>
            </div>
            <div className="flex justify-between items-center p-2 bg-bg-surface-muted rounded">
              <span className="text-text-secondary text-sm">إجمالي الدائن:</span>
              <span className="font-bold text-text-primary">
                {hideAmounts ? '***' : formatCurrency(totals.totalCredit)}
              </span>
            </div>
            <div className="flex justify-between items-center p-2 bg-bg-surface-muted rounded">
              <span className="text-sm">الرصيد النهائي:</span>
              <span className={`font-bold ${totals.balance < 0 ? 'text-status-danger-text' : 'text-text-primary'}`}>
                {hideAmounts ? '***' : formatCurrency(totals.balance)}
              </span>
            </div>
          </div>
        </div>
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
