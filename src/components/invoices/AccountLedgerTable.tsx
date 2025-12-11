/**
 * AccountLedgerTable Component - Rewritten with HuloolDataGrid
 * 
 * Displays a client's financial ledger with all transactions (invoices, payments, credits).
 * Uses the new Account/Ledger API endpoints for accurate double-entry accounting display.
 * 
 * IMPORTANT: Never calculate balances manually in the frontend - always use the 
 * balance_after field from the API response.
 */

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { 
  FinancialTransaction, 
  Client,
  Invoice
} from '../../api/types';
import { 
  CreditCard, 
  Receipt,
  ArrowDownLeft,
  RefreshCw,
  ArrowUpRight,
  FileText
} from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';
import { useModalStore } from '../../stores/modalStore';
import { useGetAccountHistory, useGetAccountBalance } from '../../queries/accountQueries';
import { useGetPayableInvoices } from '../../queries/invoiceQueries';
import HuloolDataGrid from '../grid/HuloolDataGrid';
import type { HuloolGridColumn } from '../grid/HuloolDataGrid';
import type { CellProps } from 'react-datasheet-grid';

interface AccountLedgerTableProps {
  client: Client;
  filter?: 'all' | 'invoices' | 'payments' | 'credits';
  hideAmounts?: boolean;
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
        return <Receipt size={16} className="text-red-500" />;
      case 'PAYMENT_RECEIVED':
        return <ArrowDownLeft size={16} className="text-green-500" />;
      case 'CREDIT_APPLIED':
      case 'CREDIT_RECEIVED':
      case 'CREDIT_ALLOCATED':
        return <RefreshCw size={16} className="text-blue-500" />;
      case 'REVERSAL':
      case 'INVOICE_REVERSED':
        return <ArrowUpRight size={16} className="text-orange-500" />;
      default:
        return <FileText size={16} className="text-gray-500" />;
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
    <span className="hulool-cell-content" style={{ fontWeight: active ? 700 : 500, color: '#000000' }}>
      {rowData.description}
    </span>
  );
});
DescriptionCell.displayName = 'DescriptionCell';

// Debit Cell
const DebitCell = React.memo(({ rowData, columnData, active }: CellProps<FinancialTransaction, { hideAmounts: boolean }>) => {
  const amount = getDebitAmount(rowData);
  return (
    <span className="hulool-cell-content" style={{ justifyContent: 'center', color: '#dc2626', fontWeight: active ? 700 : 400 }}>
      {columnData?.hideAmounts ? '***' : (amount > 0 ? formatCurrency(amount) : '—')}
    </span>
  );
});
DebitCell.displayName = 'DebitCell';

// Credit Cell
const CreditCell = React.memo(({ rowData, columnData, active }: CellProps<FinancialTransaction, { hideAmounts: boolean }>) => {
  const amount = getCreditAmount(rowData);
  return (
    <span className="hulool-cell-content" style={{ justifyContent: 'center', color: '#16a34a', fontWeight: active ? 700 : 400 }}>
      {columnData?.hideAmounts ? '***' : (amount > 0 ? formatCurrency(amount) : '—')}
    </span>
  );
});
CreditCell.displayName = 'CreditCell';

// Balance Cell
const BalanceCell = React.memo(({ rowData, columnData, active }: CellProps<FinancialTransaction, { hideAmounts: boolean }>) => {
  const balance = getBalance(rowData);
  return (
    <span className="hulool-cell-content" style={{ justifyContent: 'center', fontWeight: active ? 800 : 700, color: balance >= 0 ? '#dc2626' : '#16a34a' }}>
      {columnData?.hideAmounts ? '***' : formatCurrency(balance)}
    </span>
  );
});
BalanceCell.displayName = 'BalanceCell';

// Date Cell
const DateCell = React.memo(({ rowData, active }: CellProps<FinancialTransaction>) => {
  return (
    <span className="hulool-cell-content" style={{ justifyContent: 'center', fontSize: '0.875rem', color: '#000000', fontWeight: active ? 700 : 400 }}>
      {formatDate(rowData.transaction_date || rowData.created_at)}
    </span>
  );
});
DateCell.displayName = 'DateCell';

// Type Badge Cell
const TypeBadgeCell = React.memo(({ rowData }: CellProps<FinancialTransaction>) => {
  const badges: Record<string, { bg: string; text: string; label: string }> = {
    'INVOICE_CREATED': { bg: '#fee2e2', text: '#b91c1c', label: 'فاتورة' },
    'INVOICE_GENERATED': { bg: '#fee2e2', text: '#b91c1c', label: 'فاتورة' },
    'PAYMENT_RECEIVED': { bg: '#dcfce7', text: '#15803d', label: 'دفعة' },
    'CREDIT_APPLIED': { bg: '#dbeafe', text: '#1d4ed8', label: 'تخصيص رصيد' },
    'CREDIT_RECEIVED': { bg: '#dbeafe', text: '#1d4ed8', label: 'رصيد مستلم' },
    'CREDIT_ALLOCATED': { bg: '#dbeafe', text: '#1d4ed8', label: 'تخصيص رصيد' },
    'ADJUSTMENT': { bg: '#fef9c3', text: '#a16207', label: 'تعديل' },
    'REVERSAL': { bg: '#ffedd5', text: '#c2410c', label: 'عكس' },
    'INVOICE_REVERSED': { bg: '#ffedd5', text: '#c2410c', label: 'فاتورة ملغاة' },
  };

  const badge = badges[rowData.transaction_type] || { bg: '#f3f4f6', text: '#4b5563', label: rowData.transaction_type };

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
}

const ActionsCell = React.memo(({ rowData, columnData }: CellProps<FinancialTransaction & { is_payable?: boolean }, ActionsColumnData>) => {
  const { client, payableMap, openModal } = columnData || {};

  if (!columnData || !rowData.is_payable) return null;

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

  return (
    <div 
      style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100%',
        pointerEvents: 'auto',
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={handlePayInvoice}
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 12px',
          backgroundColor: 'var(--color-primary, #3b82f6)',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '0.875rem',
          fontWeight: 500,
          pointerEvents: 'auto',
        }}
      >
        <CreditCard size={14} /> دفع
      </button>
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
}) => {
  useTranslation();
  const openModal = useModalStore(state => state.openModal);

  // Fetch account data
  const { 
    data: historyData, 
    isLoading: isLoadingHistory,
    error: historyError 
  } = useGetAccountHistory('client', client.id);

  const { 
    data: balanceData, 
    isLoading: isLoadingBalance 
  } = useGetAccountBalance('client', client.id);

  const { 
    data: payableInvoices 
  } = useGetPayableInvoices(client.id);

  const isLoading = isLoadingHistory || isLoadingBalance;

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
    const balance = balanceData?.current_balance ?? (totalDebit - totalCredit);
    return { totalDebit, totalCredit, balance };
  }, [filteredTransactions, balanceData]);

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

      return { ...tx, is_payable: isPayable };
    });
  }, [filteredTransactions, payableMap]);

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
      columnData: { client, payableMap, openModal },
      width: 100,
      grow: 0,
    },
  ], [hideAmounts, client, payableMap, openModal]);

  if (historyError) {
    return (
      <div className="text-center p-12 text-red-500">
        <FileText size={48} className="mb-3 opacity-50 mx-auto" />
        <p className="mb-0">حدث خطأ في تحميل البيانات</p>
      </div>
    );
  }

  return (
    <div className="account-ledger-wrapper">
      {/* Balance Summary Header */}
      {balanceData && (
        <div className="rounded-lg border border-border bg-card shadow-sm mb-4 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div className="flex flex-col items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-500 mb-1">إجمالي المستحقات</span>
              <span className="text-lg font-bold text-red-600">
                {hideAmounts ? '***' : formatCurrency(balanceData.total_debits)}
              </span>
            </div>
            <div className="flex flex-col items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-500 mb-1">إجمالي المدفوعات</span>
              <span className="text-lg font-bold text-green-600">
                {hideAmounts ? '***' : formatCurrency(balanceData.total_credits)}
              </span>
            </div>
            <div className="flex flex-col items-center p-3 bg-primary/10 rounded-lg">
              <span className="text-sm text-primary mb-1">الرصيد الحالي</span>
              <span className={`text-xl font-bold ${balanceData.current_balance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {hideAmounts ? '***' : formatCurrency(balanceData.current_balance)}
              </span>
            </div>
            <div className="flex flex-col items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-500 mb-1">آخر تحديث</span>
              <span className="text-sm font-medium text-gray-700">
                {formatDate(balanceData.last_updated)}
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
      />

      {/* Summary Totals Row */}
      <div className="rounded-lg border border-border bg-card shadow-sm mt-2">
        <div className="p-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-center">
            <div className="flex justify-between items-center p-2 bg-gray-100 rounded">
              <span className="text-gray-600 text-sm">إجمالي المدين:</span>
              <span className="font-bold text-red-600">
                {hideAmounts ? '***' : formatCurrency(totals.totalDebit)}
              </span>
            </div>
            <div className="flex justify-between items-center p-2 bg-gray-100 rounded">
              <span className="text-gray-600 text-sm">إجمالي الدائن:</span>
              <span className="font-bold text-green-600">
                {hideAmounts ? '***' : formatCurrency(totals.totalCredit)}
              </span>
            </div>
            <div className="flex justify-between items-center p-2 bg-primary text-white rounded">
              <span className="text-sm">الرصيد النهائي:</span>
              <span className="font-bold">
                {hideAmounts ? '***' : formatCurrency(totals.balance)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountLedgerTable;
