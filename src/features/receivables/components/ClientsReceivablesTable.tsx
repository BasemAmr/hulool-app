/**
 * ClientsReceivablesTable - Excel-like grid for displaying all clients receivables summary
 * 
 * Uses HuloolDataGrid for consistent styling with:
 * - Proper RTL alignment
 * - Full height support
 * - Active cell bold text
 * - WhatsApp integration
 * - Actions column
 */

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Edit3, TrendingUp, TrendingDown, ChevronDown } from 'lucide-react';
import HuloolDataGrid from '@/shared/grid/HuloolDataGrid';
import type { HuloolGridColumn } from '@/shared/grid/HuloolDataGrid';
import type { CellProps } from 'react-datasheet-grid';
import { useModalStore } from '@/shared/stores/modalStore';
import WhatsAppIcon from '@/shared/ui/icons/WhatsAppIcon';
import { sendPaymentReminder, formatPhoneForWhatsApp } from '@/shared/utils/whatsappUtils';
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

const neutralActionButtonClass = 'inline-flex items-center justify-center rounded p-1 text-text-secondary hover:text-text-primary cursor-pointer transition-colors duration-150';

// ================================
// TYPE DEFINITIONS
// ================================

interface ClientReceivablesSummary {
  client_id: number;
  client_name: string;
  client_phone: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  receivables_count: number;
  unpaid_invoices_count?: number;
}

interface ClientsReceivablesTableProps {
  clients: ClientReceivablesSummary[];
  isLoading: boolean;
  totals?: {
    total_amount: number;
    total_paid: number;
    total_unpaid: number;
    clients_count: number;
    clients_with_debt: number;
    clients_with_credit: number;
    balanced_clients: number;
  };
  isTotalsLoading?: boolean;
}

// ================================
// HELPER FUNCTIONS
// ================================

const formatCurrency = (amount: number) => {
  const numAmount = Number(amount) || 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 2
  }).format(numAmount);
};

// ================================
// CUSTOM CELL COMPONENTS
// ================================

// Client Name Cell with clickable link
interface ClientNameCellData {
  onClientClick: (clientId: number) => void;
}

const ClientNameCell = React.memo(({ rowData, columnData, active }: CellProps<ClientReceivablesSummary, ClientNameCellData>) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    columnData?.onClientClick?.(rowData.client_id);
  };

  return (
    <span
      className="hulool-cell-content"
      style={{
        fontWeight: active ? 800 : 600,
        color: 'var(--color-primary)',
        cursor: 'pointer',
      }}
      onClick={handleClick}
    >
      {rowData.client_name || '—'}
    </span>
  );
});
ClientNameCell.displayName = 'ClientNameCell';

// Phone Cell with WhatsApp button
interface PhoneCellData {
  onWhatsApp: (phone: string) => void;
}

const PhoneCell = React.memo(({ rowData, columnData, active }: CellProps<ClientReceivablesSummary, PhoneCellData>) => {
  const phone = rowData.client_phone;

  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    columnData?.onWhatsApp?.(phone);
  };

  if (!phone) {
    return <span className="hulool-cell-content" style={{ justifyContent: 'center', color: 'var(--token-text-secondary)', fontWeight: active ? 700 : 500 }}>—</span>;
  }

  return (
    <div className="hulool-cell-content" style={{ justifyContent: 'center', gap: '8px', fontWeight: active ? 700 : 400 }}>
      <button
        onClick={handleWhatsAppClick}
        title="فتح واتساب"
        className="hulool-whatsapp-btn"
      >
        <WhatsAppIcon size={14} />
      </button>
      <span style={{ color: 'var(--token-text-primary)' }}>{phone}</span>
    </div>
  );
});
PhoneCell.displayName = 'PhoneCell';

// Total Debit Cell - Black currency
const TotalDebitCell = React.memo(({ rowData, active }: CellProps<ClientReceivablesSummary>) => {
  const amount = Number(rowData.total_amount) || 0;

  return (
    <span className="hulool-cell-content" style={{ justifyContent: 'center', color: 'var(--token-text-primary)', fontWeight: active ? 700 : 500 }}>
      {formatCurrency(amount)}
    </span>
  );
});
TotalDebitCell.displayName = 'TotalDebitCell';

// Total Credit Cell - Green currency
const TotalCreditCell = React.memo(({ rowData, active }: CellProps<ClientReceivablesSummary>) => {
  const amount = Number(rowData.paid_amount) || 0;

  return (
    <span className="hulool-cell-content" style={{ justifyContent: 'center', color: 'var(--token-text-primary)', fontWeight: active ? 700 : 500 }}>
      {formatCurrency(amount)}
    </span>
  );
});
TotalCreditCell.displayName = 'TotalCreditCell';

// Remaining Amount Cell - Red for debt, Green for credit
const RemainingCell = React.memo(({ rowData, active }: CellProps<ClientReceivablesSummary>) => {
  const amount = Number(rowData.remaining_amount) || 0;
  const isDebt = amount > 0;
  const isCredit = amount < 0;

  return (
    <span
      className="hulool-cell-content"
      style={{
        justifyContent: 'center',
        fontWeight: active ? 800 : 700,
        color: isDebt ? 'var(--token-text-danger)' : (isCredit ? 'var(--token-text-success)' : 'var(--token-text-primary)'),
      }}
    >
      {formatCurrency(amount)}
    </span>
  );
});
RemainingCell.displayName = 'RemainingCell';

// Actions Cell
interface ActionsCellData {
  openModal: (modal: string, data?: any) => void;
  onPaymentReminder: (phone: string, clientName: string, amount: number) => void;
  onPayment: (clientId: number) => void;
  onViewLedger: (clientId: number, clientName: string) => void;
  onQabd: (clientId: number) => void;
  onSarf: (clientId: number) => void;
  onTaswiyaQabd: (clientId: number) => void;
  onTaswiyaSarf: (clientId: number) => void;
}

const ActionsCell = React.memo(({ rowData, columnData }: CellProps<ClientReceivablesSummary, ActionsCellData>) => {
  const {
    onPaymentReminder,
    onPayment,
    onViewLedger,
    onQabd,
    onSarf,
    onTaswiyaQabd,
    onTaswiyaSarf,
  } = columnData || {};

  const hasDebt = Number(rowData.remaining_amount) > 0;
  const hasUnpaidInvoices = Number(rowData.unpaid_invoices_count || 0) > 0;

  const handleReminder = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPaymentReminder?.(rowData.client_phone, rowData.client_name, Number(rowData.remaining_amount));
  };

  const handlePay = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPayment?.(rowData.client_id);
  };

  const handleViewLedger = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewLedger?.(rowData.client_id, rowData.client_name);
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: '100%',
        width: '100%',
        padding: '0 6px',
        pointerEvents: 'auto',
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Subtag 1: Client utility actions (Pen / View Ledger, WhatsApp, Pay Invoice) */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={handleViewLedger}
          title="عرض كشف الحساب"
          className={neutralActionButtonClass}
        >
          <Edit3 size={14} />
        </button>

        <button
          type="button"
          onClick={handleReminder}
          title="إرسال تذكير دفع عبر واتساب"
          disabled={!hasDebt}
          className={`${neutralActionButtonClass} ${!hasDebt ? 'opacity-30 cursor-not-allowed' : ''}`}
        >
          <WhatsAppIcon size={14} />
        </button>

        {hasUnpaidInvoices ? (
          <button
            type="button"
            onClick={handlePay}
            title="سداد فاتورة"
            className="inline-flex items-center justify-center rounded p-1 text-text-secondary hover:text-text-primary hover:bg-muted/40 cursor-pointer transition-colors"
          >
            <CreditCard size={15} />
          </button>
        ) : (
          <div className="w-[23px] h-[23px]" aria-hidden="true" />
        )}
      </div>

      {/* Subtag 2: Transaction voucher actions (قبض, صرف, تسوية) */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onQabd?.(rowData.client_id)}
          title="سند قبض"
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-bold rounded border border-status-success-border text-status-success-text bg-status-success-bg hover:opacity-85 transition-opacity cursor-pointer shadow-2xs"
        >
          <TrendingUp size={11} />
          قبض
        </button>
        <button
          type="button"
          onClick={() => onSarf?.(rowData.client_id)}
          title="سند صرف"
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-bold rounded border border-status-danger-border text-status-danger-text bg-status-danger-bg hover:opacity-85 transition-opacity cursor-pointer shadow-2xs"
        >
          <TrendingDown size={11} />
          صرف
        </button>
        <DropdownMenu dir="rtl">
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-bold rounded border border-border text-text-primary bg-background hover:bg-muted/40 transition-colors cursor-pointer shadow-2xs"
            >
              تسوية
              <ChevronDown size={10} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-[9999] min-w-[130px] bg-card border border-border shadow-xl">
            <DropdownMenuItem
              className="flex items-center gap-2 text-xs font-semibold text-status-success-text cursor-pointer hover:bg-status-success-bg/20 py-1.5"
              onClick={() => onTaswiyaQabd?.(rowData.client_id)}
            >
              <TrendingUp size={12} />
              تسوية قبض
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex items-center gap-2 text-xs font-semibold text-status-danger-text cursor-pointer hover:bg-status-danger-bg/20 py-1.5"
              onClick={() => onTaswiyaSarf?.(rowData.client_id)}
            >
              <TrendingDown size={12} />
              تسوية صرف
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});
ActionsCell.displayName = 'ActionsCell';

// ================================
// MAIN COMPONENT
// ================================

const ClientsReceivablesTable: React.FC<ClientsReceivablesTableProps> = ({
  clients,
  isLoading,
  totals,
  isTotalsLoading
}) => {
  const navigate = useNavigate();
  const openModal = useModalStore((state) => state.openModal);

  // Handlers
  const handleClientClick = (clientId: number) => {
    navigate(`/clients/${clientId}?mode=receivables`);
  };

  const handleWhatsApp = (phone: string) => {
    const cleanPhone = formatPhoneForWhatsApp(phone);
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const handlePaymentReminder = (phone: string, clientName: string, remainingAmount: number) => {
    const formattedAmount = formatCurrency(remainingAmount);
    sendPaymentReminder(phone, clientName, formattedAmount);
  };

  const handlePayment = (clientId: number) => {
    // TODO: Create selectInvoiceForPayment modal to use new /invoices API
    // For now, using existing modal which will need to be updated
    openModal('selectReceivableForPayment', {
      clientId
    });
  };

  const handleViewLedger = (clientId: number, clientName: string) => {
    openModal('accountLedger', {
      clientId,
      clientName,
      filter: 'all'
    });
  };

  const handleQabd = (clientId: number) => {
    openModal('unifiedTransaction', {
      defaultFromCardType: 'client',
      defaultFromAccountId: String(clientId),
      defaultToCardType: 'cashbox',
      lockDirection: true,
      title: 'سند قبض',
    });
  };

  const handleSarf = (clientId: number) => {
    openModal('unifiedTransaction', {
      defaultFromCardType: 'cashbox',
      defaultToCardType: 'client',
      defaultToAccountId: String(clientId),
      lockDirection: true,
      title: 'سند صرف',
    });
  };

  const handleTaswiyaQabd = (clientId: number) => {
    openModal('unifiedTransaction', buildSettlementQabdPreset({
      kind: 'client',
      id: String(clientId),
    }));
  };

  const handleTaswiyaSarf = (clientId: number) => {
    openModal('unifiedTransaction', buildSettlementSarfPreset({
      kind: 'client',
      id: String(clientId),
    }));
  };

  // Define columns - order is right-to-left for RTL (first = rightmost)
  const columns = useMemo((): HuloolGridColumn<ClientReceivablesSummary>[] => [
    {
      id: 'client_name',
      key: 'client_name',
      title: 'العميل',
      type: 'custom',
      component: ClientNameCell as React.ComponentType<CellProps<ClientReceivablesSummary>>,
      columnData: { onClientClick: handleClientClick },
      grow: 1.5,
    },
    {
      id: 'client_phone',
      key: 'client_phone',
      title: 'رقم الجوال',
      type: 'custom',
      component: PhoneCell as React.ComponentType<CellProps<ClientReceivablesSummary>>,
      columnData: { onWhatsApp: handleWhatsApp },
      grow: 0.8,
    },
    {
      id: 'total_amount',
      key: 'total_amount',
      title: 'إجمالي المدين',
      type: 'custom',
      component: TotalDebitCell,
      grow: 1,
      cellClassName: () => {
        return 'client-debit-cell';
      }
    },
    {
      id: 'paid_amount',
      key: 'paid_amount',
      title: 'إجمالي الدائن',
      type: 'custom',
      component: TotalCreditCell,
      grow: 1,
      cellClassName: () => {
        return 'client-credit-cell';
      }
    },
    {
      id: 'remaining_amount',
      key: 'remaining_amount',
      title: 'إجمالي المستحقات',
      type: 'custom',
      component: RemainingCell,
      grow: 1,
    },
    {
      id: 'actions',
      key: 'client_id',
      title: 'الإجراءات',
      type: 'custom',
      component: ActionsCell as React.ComponentType<CellProps<ClientReceivablesSummary>>,
      columnData: {
        openModal,
        onPaymentReminder: handlePaymentReminder,
        onPayment: handlePayment,
        onViewLedger: handleViewLedger,
        onQabd: handleQabd,
        onSarf: handleSarf,
        onTaswiyaQabd: handleTaswiyaQabd,
        onTaswiyaSarf: handleTaswiyaSarf,
      },
      width: 290,
      grow: 1.8,
    },
  ], [handleClientClick, handleWhatsApp, openModal, handlePaymentReminder, handlePayment, handleViewLedger, handleQabd, handleSarf, handleTaswiyaQabd, handleTaswiyaSarf]);

  // Empty state
  if (!clients || clients.length === 0) {
    return (
      <div className="text-center py-5">
        <p className="text-text-primary">
          لا توجد نتائج
        </p>
      </div>
    );
  }

  return (
    <div className="clients-receivables-wrapper" dir="rtl">
      {/* Main Grid */}
      <HuloolDataGrid
        data={clients}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="لا توجد نتائج"
        showId={false}
        height="auto"
        minHeight={400}
      />
    </div>
  );
};

export default ClientsReceivablesTable;