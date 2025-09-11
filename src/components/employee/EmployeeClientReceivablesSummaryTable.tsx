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
  total_receivables: number | string;
  total_paid: number | string;
  total_outstanding: number | string;
  receivables_count: number | string;
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
      clientId,
      receivables: [] // Will be loaded in the modal
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
      <div className="d-flex justify-content-center align-items-center p-5">
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
      <div className="text-center p-5 text-muted">
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
    <div className="table-responsive" dir="rtl">
      {/* Sentinel element for sticky header detection */}
      <div ref={sentinelRef}></div>
      
      <table className="table table-hover align-middle">
        <thead className={`table-warning ${isSticky ? 'is-sticky' : ''}`}>
          <tr className="fw-bold">
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
            <tr key={client.client_id}>
              <td className="text-end" style={{ padding: '12px 8px' }}>
                {/* Client name without link - just text */}
                <div className="fw-bold text-dark" style={{ cursor: 'default' }}>
                  {client.client_name}
                </div>
              </td>
              <td className="text-center" style={{ padding: '12px 8px' }}>
                <div className="small d-flex align-items-center justify-content-center">
                  <button
                    className="btn btn-link btn-sm p-0 text-success ms-1"
                    onClick={() => handleWhatsApp(client.client_phone)}
                    title="WhatsApp"
                    style={{ fontSize: '12px' }}
                  >
                    <WhatsAppIcon size={12} />
                  </button>
                  <span>{client.client_phone}</span>
                </div>
              </td>
              <td className="text-center fw-bold" style={{ padding: '12px 8px' }}>
                {formatCurrency(Number(client.total_receivables) || 0)}
              </td>
              <td className="text-center fw-bold text-success" style={{ padding: '12px 8px' }}>
                {formatCurrency(Number(client.total_paid) || 0)}
              </td>
              <td className="text-center fw-bold text-danger" style={{ padding: '12px 8px' }}>
                {formatCurrency(Math.max(0, Number(client.total_outstanding) || 0))}
              </td>
              <td className="text-center" style={{ padding: '12px 8px' }}>
                <div className="d-flex gap-1 justify-content-center">
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
      <div className="card border-0 shadow-sm mt-2">
        <div className="card-body p-2">
          <div className="row text-center">
            <div className="col-md-4">
              <div className="d-flex justify-content-between align-items-center p-2 bg-light rounded">
                <span className="text-muted small">إجمالي المدين:</span>
                <span className="fw-bold text-danger">
                  {formatCurrency(displayTotals.totalAmount)}
                </span>
              </div>
            </div>
            <div className="col-md-4">
              <div className="d-flex justify-content-between align-items-center p-2 bg-light rounded">
                <span className="text-muted small">إجمالي الدائن:</span>
                <span className="fw-bold text-success">
                  {formatCurrency(displayTotals.paidAmount)}
                </span>
              </div>
            </div>
            <div className="col-md-4">
              <div className="d-flex justify-content-between align-items-center p-2 bg-light rounded">
                <span className="text-muted small">الرصيد النهائي:</span>
                <span className={`fw-bold ${displayTotals.remainingAmount > 0 ? 'text-primary' : 'text-success'}`}>
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
