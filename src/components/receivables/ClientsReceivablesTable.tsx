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
import { CreditCard, Edit3 } from 'lucide-react';
import HuloolDataGrid from '../grid/HuloolDataGrid';
import type { HuloolGridColumn } from '../grid/HuloolDataGrid';
import type { CellProps } from 'react-datasheet-grid';
import { useModalStore } from '../../stores/modalStore';
import WhatsAppIcon from '../ui/WhatsAppIcon';
import { sendPaymentReminder, formatPhoneForWhatsApp } from '../../utils/whatsappUtils';

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
        color: 'var(--color-primary, #3b82f6)',
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
    return <span className="hulool-cell-content" style={{ justifyContent: 'center', color: '#9ca3af', fontWeight: active ? 700 : 400 }}>—</span>;
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
      <span style={{ color: '#000000' }}>{phone}</span>
    </div>
  );
});
PhoneCell.displayName = 'PhoneCell';

// Total Debit Cell - Black currency
const TotalDebitCell = React.memo(({ rowData, active }: CellProps<ClientReceivablesSummary>) => {
  const amount = Number(rowData.total_amount) || 0;
  
  return (
    <span className="hulool-cell-content" style={{ justifyContent: 'center', color: '#000000', fontWeight: active ? 700 : 500 }}>
      {formatCurrency(amount)}
    </span>
  );
});
TotalDebitCell.displayName = 'TotalDebitCell';

// Total Credit Cell - Green currency
const TotalCreditCell = React.memo(({ rowData, active }: CellProps<ClientReceivablesSummary>) => {
  const amount = Number(rowData.paid_amount) || 0;
  
  return (
    <span className="hulool-cell-content" style={{ justifyContent: 'center', color: '#16a34a', fontWeight: active ? 700 : 500 }}>
      {formatCurrency(amount)}
    </span>
  );
});
TotalCreditCell.displayName = 'TotalCreditCell';

// Remaining Amount Cell - Red currency
const RemainingCell = React.memo(({ rowData, active }: CellProps<ClientReceivablesSummary>) => {
  const amount = Math.max(0, Number(rowData.remaining_amount) || 0);
  
  return (
    <span className="hulool-cell-content" style={{ justifyContent: 'center', fontWeight: active ? 800 : 700, color: '#dc2626' }}>
      {formatCurrency(amount)}
    </span>
  );
});
RemainingCell.displayName = 'RemainingCell';

// Actions Cell
interface ActionsCellData {
  openModal: (modal: string, data: any) => void;
  onPaymentReminder: (phone: string, clientName: string, amount: number) => void;
  onPayment: (clientId: number) => void;
}

const ActionsCell = React.memo(({ rowData, columnData }: CellProps<ClientReceivablesSummary, ActionsCellData>) => {
  const { openModal, onPaymentReminder, onPayment } = columnData || {};
  const hasDebt = Number(rowData.remaining_amount) > 0;

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    openModal?.('clientReceivablesEdit', { clientId: rowData.client_id });
  };

  const handleReminder = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPaymentReminder?.(rowData.client_phone, rowData.client_name, Number(rowData.remaining_amount));
  };

  const handlePay = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPayment?.(rowData.client_id);
  };

  return (
    <div 
      style={{ 
        display: 'flex', 
        gap: '4px', 
        justifyContent: 'center', 
        alignItems: 'center',
        height: '100%',
        pointerEvents: 'auto',
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* COMMENTED OUT: Edit receivables - deprecated functionality
      <button
        onClick={handleEdit}
        onMouseDown={(e) => e.stopPropagation()}
        title="تعديل المستحقات"
        style={{
          padding: '4px 8px',
          borderRadius: '6px',
          border: '1px solid var(--color-primary, #3b82f6)',
          backgroundColor: 'transparent',
          color: 'var(--color-primary, #3b82f6)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Edit3 size={14} />
      </button>
      */}
      <button
        onClick={handleReminder}
        onMouseDown={(e) => e.stopPropagation()}
        title="إرسال تذكير دفع عبر واتساب"
        disabled={!hasDebt}
        style={{
          padding: '4px 8px',
          borderRadius: '6px',
          border: '1px solid #22c55e',
          backgroundColor: 'transparent',
          color: '#22c55e',
          cursor: hasDebt ? 'pointer' : 'not-allowed',
          opacity: hasDebt ? 1 : 0.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <WhatsAppIcon size={14} />
      </button>
      <button
        onClick={handlePay}
        onMouseDown={(e) => e.stopPropagation()}
        disabled={!hasDebt}
        style={{
          padding: '4px 12px',
          borderRadius: '6px',
          border: 'none',
          backgroundColor: hasDebt ? 'var(--color-primary, #3b82f6)' : '#9ca3af',
          color: '#ffffff',
          cursor: hasDebt ? 'pointer' : 'not-allowed',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '0.875rem',
          fontWeight: 500,
        }}
      >
        <CreditCard size={14} />
        سداد
      </button>
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
      clientId,
      receivables: [] // Will be fetched by the modal
    });
  };

  // Filter clients with debt
  const filteredClients = useMemo(() => 
    clients.filter(client => (Number(client.remaining_amount) || 0) > 0),
    [clients]
  );

  // Calculate display totals from API or fallback
  const displayTotals = useMemo(() => totals ? {
    totalAmount: totals.total_amount,
    paidAmount: totals.total_paid,
    remainingAmount: totals.total_unpaid,
  } : {
    totalAmount: 0,
    paidAmount: 0,
    remainingAmount: 0,
  }, [totals]);

  // Define columns - order is right-to-left for RTL (first = rightmost)
  const columns = useMemo((): HuloolGridColumn<ClientReceivablesSummary>[] => [
    {
      id: 'client_name',
      key: 'client_name',
      title: 'العميل',
      type: 'custom',
      component: ClientNameCell as React.ComponentType<CellProps<ClientReceivablesSummary>>,
      columnData: { onClientClick: handleClientClick },
      grow: 2,
    },
    {
      id: 'client_phone',
      key: 'client_phone',
      title: 'رقم الجوال',
      type: 'custom',
      component: PhoneCell as React.ComponentType<CellProps<ClientReceivablesSummary>>,
      columnData: { onWhatsApp: handleWhatsApp },
      grow: 1,
    },
    {
      id: 'total_amount',
      key: 'total_amount',
      title: 'إجمالي المدين',
      type: 'custom',
      component: TotalDebitCell,
      grow: 1,
    },
    {
      id: 'paid_amount',
      key: 'paid_amount',
      title: 'إجمالي الدائن',
      type: 'custom',
      component: TotalCreditCell,
      grow: 1,
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
        onPayment: handlePayment 
      },
      width: 200, // Fixed width for actions
      grow: 0,
    },
  ], [handleClientClick, handleWhatsApp, openModal, handlePaymentReminder, handlePayment]);

  // Empty state
  if (!clients || clients.length === 0 || filteredClients.length === 0) {
    return (
      <div className="text-center py-5">
        <p className="text-black">
          لا يوجد عملاء لديهم مستحقات
        </p>
      </div>
    );
  }

  return (
    <div className="clients-receivables-wrapper" dir="rtl">
      {/* Main Grid */}
      <HuloolDataGrid
        data={filteredClients}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="لا يوجد عملاء لديهم مستحقات"
        showId={false}
        height="auto"
        minHeight={400}
      />

      {/* Summary Totals Row */}
      <div className="rounded-lg border border-border bg-card shadow-sm mt-2">
        <div className="p-2">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-center">
            <div className="flex justify-between items-center p-2 bg-primary text-white rounded font-bold">
              <span className="text-sm">الإجمالي</span>
              <span></span>
            </div>
            <div className="flex justify-between items-center p-2 bg-gray-100 rounded">
              <span className="text-gray-600 text-sm">إجمالي المدين:</span>
              <span className="font-bold text-black">
                {isTotalsLoading ? (
                  <div className="inline-block w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  formatCurrency(displayTotals.totalAmount)
                )}
              </span>
            </div>
            <div className="flex justify-between items-center p-2 bg-gray-100 rounded">
              <span className="text-gray-600 text-sm">إجمالي الدائن:</span>
              <span className="font-bold text-green-600">
                {isTotalsLoading ? (
                  <div className="inline-block w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  formatCurrency(displayTotals.paidAmount)
                )}
              </span>
            </div>
            <div className="flex justify-between items-center p-2 bg-red-100 rounded">
              <span className="text-gray-600 text-sm">إجمالي المستحقات:</span>
              <span className="font-bold text-red-600">
                {isTotalsLoading ? (
                  <div className="inline-block w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  formatCurrency(displayTotals.remainingAmount)
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientsReceivablesTable;