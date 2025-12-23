import React from 'react';
import { useStickyHeader } from '../../hooks/useStickyHeader';
import { FileText, CreditCard, Edit3 } from 'lucide-react';
import { formatCurrency } from '../../utils/formatUtils';
import { useModalStore } from '../../stores/modalStore';
import Button from '../ui/Button';
import WhatsAppIcon from '../ui/WhatsAppIcon';
import { sendPaymentReminder, formatPhoneForWhatsApp } from '../../utils/whatsappUtils';

interface ClientReceivablesSummaryItem {
  client_id: number;
  client_name: string;
  client_phone: string;
  // New API fields
  total_debit?: number | string;
  total_credit?: number | string;
  total_outstanding: number | string;
  // Legacy fields for backward compatibility
  total_receivables?: number | string;
  total_paid?: number | string;
  receivables_count?: number | string;
  transaction_count?: number | string;
}

interface EmployeeClientReceivablesSummaryTableProps {
  clients: ClientReceivablesSummaryItem[];
  totals?: {
    total_amount: number;
    total_paid: number;
    total_unpaid: number;
  } | null;
  isLoading: boolean;
}

const EmployeeClientReceivablesSummaryTable: React.FC<EmployeeClientReceivablesSummaryTableProps> = ({ 
  clients, 
  totals,
  isLoading 
}) => {
  const { sentinelRef, isSticky } = useStickyHeader();
  const openModal = useModalStore((state) => state.openModal);

  const handlePayment = (clientId: number) => {
    // Open the modal to select specific receivable for payment
    openModal('selectReceivableForPayment', {
      clientId
    });
  };

  const handleWhatsApp = (phone: string) => {
    const cleanPhone = formatPhoneForWhatsApp(phone);
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const handleWhatsAppPaymentReminder = (phone: string, clientName: string, remainingAmount: number) => {
    const formattedAmount = formatCurrency(remainingAmount);
    sendPaymentReminder(phone, clientName, formattedAmount);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">جاري التحميل...</span>
        </div>
      </div>
    );
  }

  // Filter out clients with zero outstanding amounts
  const filteredClients = clients.filter(client => 
    (Number(client.total_outstanding) || 0) > 0
  );

  if (!clients || clients.length === 0 || filteredClients.length === 0) {
    return (
      <div className="text-center p-5 text-black">
        <FileText size={48} className="mb-3 opacity-50" />
        <p className="mb-0">لا توجد مستحقات للعملاء</p>
      </div>
    );
  }

  // Use totals from props (from API) instead of calculating from paginated data
  const displayTotals = totals ? {
    totalAmount: totals.total_amount,
    paidAmount: totals.total_paid,
    remainingAmount: totals.total_unpaid,
  } : {
    totalAmount: 0,
    paidAmount: 0,
    remainingAmount: 0,
  };

  // Sort clients by newest first (assuming client_id represents creation order)
  const sortedClients = [...filteredClients].sort((a, b) => {
    return b.client_id - a.client_id; // Newest first (higher IDs are newer)
  });

  return (
    <div className="w-full overflow-x-auto" dir="rtl">
      {/* Sentinel element for sticky header detection */}
      <div ref={sentinelRef}></div>
      
      <table className="w-full">
        <thead className={`bg-yellow-400 ${isSticky ? 'is-sticky' : ''}`}>
          <tr className="font-bold">
            <th scope="col" className="text-end" style={{ width: '18%', color: '#000', padding: '12px 8px' }}>العميل</th>
            <th scope="col" className="text-center" style={{ width: '12%', color: '#000', padding: '12px 8px' }}>رقم الجوال</th>
            <th scope="col" className="text-center" style={{ width: '20%', color: '#000', padding: '12px 8px' }}>إجمالي المدين</th>
            <th scope="col" className="text-center" style={{ width: '20%', color: '#000', padding: '12px 8px' }}>إجمالي الدائن</th>
            <th scope="col" className="text-center" style={{ width: '20%', color: '#000', padding: '12px 8px' }}>إجمالي المستحقات</th>
            <th scope="col" className="text-center" style={{ width: '15%', color: '#000', padding: '12px 8px' }}>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {sortedClients.map((client) => (
            <tr key={client.client_id} className="hover:bg-muted/50 transition-colors">
              <td className="text-end" style={{ padding: '12px 8px' }}>
                {/* Client name without link - just text */}
                <div className="font-bold text-black" style={{ cursor: 'default' }}>
                  {client.client_name}
                </div>
              </td>
              <td className="text-center" style={{ padding: '12px 8px' }}>
                <div className="text-sm flex items-center justify-center gap-1">
                  <button
                    className="p-0 text-green-600 hover:text-green-700 transition-colors"
                    onClick={() => handleWhatsApp(client.client_phone)}
                    title="WhatsApp"
                    style={{ fontSize: '12px' }}
                  >
                    <WhatsAppIcon size={12} />
                  </button>
                  <span>{client.client_phone}</span>
                </div>
              </td>
              <td className="text-center font-bold" style={{ padding: '12px 8px' }}>
                {formatCurrency(Number(client.total_debit || client.total_receivables) || 0)}
              </td>
              <td className="text-center font-bold text-green-600" style={{ padding: '12px 8px' }}>
                {formatCurrency(Number(client.total_credit || client.total_paid) || 0)}
              </td>
              <td className="text-center font-bold text-red-600" style={{ padding: '12px 8px' }}>
                {formatCurrency(Math.max(0, Number(client.total_outstanding) || 0))}
              </td>
              <td className="text-center" style={{ padding: '12px 8px' }}>
                <div className="flex gap-1 justify-center">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => openModal('clientReceivablesEdit', { clientId: client.client_id })}
                    title="تعديل المستحقات"
                  >
                    <Edit3 size={12} />
                  </Button>
                  <Button
                    variant="outline-success"
                    size="sm"
                    onClick={() => handleWhatsAppPaymentReminder(client.client_phone, client.client_name, Number(client.total_outstanding))}
                    disabled={Number(client.total_outstanding) <= 0}
                    title="إرسال تذكير دفع عبر واتساب"
                  >
                    <WhatsAppIcon size={12} />
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handlePayment(client.client_id)}
                    disabled={Number(client.total_outstanding) <= 0}
                    title="تسديد مستحقات"
                  >
                    <CreditCard size={12} />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary Totals Card */}
      <div className="rounded-lg border-0 bg-card shadow-sm mt-2">
        <div className="p-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-center">
            <div>
              <div className="flex justify-between items-center p-2 bg-muted rounded">
                <span className="text-black text-sm">إجمالي المدين:</span>
                <span className="font-bold text-red-600">
                  {formatCurrency(displayTotals.totalAmount)}
                </span>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center p-2 bg-muted rounded">
                <span className="text-black text-sm">إجمالي الدائن:</span>
                <span className="font-bold text-green-600">
                  {formatCurrency(displayTotals.paidAmount)}
                </span>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center p-2 bg-muted rounded">
                <span className="text-black text-sm">الرصيد النهائي:</span>
                <span className={`font-bold ${displayTotals.remainingAmount > 0 ? 'text-primary' : 'text-green-600'}`}>
                  {formatCurrency(displayTotals.remainingAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeClientReceivablesSummaryTable;
