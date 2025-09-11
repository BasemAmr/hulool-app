import React from 'react';
import { CreditCard, Edit3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import { useModalStore } from '../../stores/modalStore';
import { useGetEmployeeReceivablesSummary, useGetEmployeeReceivablesTotals } from '../../queries/employeeQueries';
import WhatsAppIcon from '../ui/WhatsAppIcon';
import { sendPaymentReminder, formatPhoneForWhatsApp } from '../../utils/whatsappUtils';
import { useStickyHeader } from '../../hooks/useStickyHeader';
import type { EmployeeReceivablesClient } from '../../api/types';

interface EmployeeReceivablesTableProps {
  employeeId: number;
  page: number;
  perPage: number;
}

const EmployeeReceivablesTable: React.FC<EmployeeReceivablesTableProps> = ({
  employeeId,
  page,
  perPage,
}) => {
  const navigate = useNavigate();
  const { openModal } = useModalStore();
  const { sentinelRef, isSticky } = useStickyHeader();

  // Fetch employee receivables summary
  const { 
    data: receivablesData, 
    isLoading 
  } = useGetEmployeeReceivablesSummary(employeeId, { page, per_page: perPage });

  // Fetch totals for the footer
  const { 
    data: totalsData, 
    isLoading: isTotalsLoading 
  } = useGetEmployeeReceivablesTotals(employeeId);

  const clients = receivablesData?.data?.clients || [];

  const handlePayment = (clientId: number) => {
    openModal('selectReceivableForPayment', {
      clientId,
      receivables: []
    });
  };

  const handleClientClick = (clientId: number) => {
    navigate(`/clients/${clientId}?mode=receivables`);
  };

  const handleWhatsApp = (phone: string) => {
    const cleanPhone = formatPhoneForWhatsApp(phone);
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const handleWhatsAppPaymentReminder = (phone: string, clientName: string, remainingAmount: number) => {
    const formattedAmount = formatCurrency(remainingAmount);
    sendPaymentReminder(phone, clientName, formattedAmount);
  };

  const formatCurrency = (amount: number) => {
    const numAmount = Number(amount) || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2
    }).format(numAmount);
  };

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">جاري التحميل...</span>
        </div>
      </div>
    );
  }

  // Filter out clients with zero outstanding amounts
  const filteredClients = clients.filter((client: EmployeeReceivablesClient) => 
    (Number(client.total_outstanding) || 0) > 0
  );

  if (!clients || clients.length === 0 || filteredClients.length === 0) {
    return (
      <div className="text-center py-5">
        <p>لا يوجد عملاء لديهم مستحقات لهذا الموظف</p>
      </div>
    );
  }

  // Use totals from API
  const displayTotals = totalsData?.data ? {
    totalAmount: totalsData.data.total_amount,
    paidAmount: totalsData.data.total_paid,
    remainingAmount: totalsData.data.total_unpaid,
  } : {
    totalAmount: 0,
    paidAmount: 0,
    remainingAmount: 0,
  };

  // Sort clients by newest first
  const sortedClients = [...filteredClients].sort((a, b) => {
    return parseInt(b.id) - parseInt(a.id);
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
            <tr key={client.id}>
              <td className="text-end" style={{ padding: '12px 8px' }}>
                <div
                  className="fw-bold primary cursor-pointer"
                  onClick={() => handleClientClick(parseInt(client.id))}
                  style={{ cursor: 'pointer' }}
                >
                  {client.name}
                </div>
              </td>
              <td className="text-center" style={{ padding: '12px 8px' }}>
                <div className="small d-flex align-items-center justify-content-center">
                  <button
                    className="btn btn-link btn-sm p-0 text-success ms-1"
                    onClick={() => handleWhatsApp(client.phone)}
                    title="WhatsApp"
                    style={{ fontSize: '12px' }}
                  >
                    <WhatsAppIcon size={12} />
                  </button>
                  <span>{client.phone}</span>
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
                <div className="d-flex gap-2 justify-content-center">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => openModal('clientReceivablesEdit', { clientId: parseInt(client.id) })}
                    title="تعديل المستحقات"
                  >
                    <Edit3 size={14} />
                  </Button>
                  <Button
                    variant="outline-success"
                    size="sm"
                    onClick={() => handleWhatsAppPaymentReminder(client.phone, client.name, Number(client.total_outstanding))}
                    disabled={Number(client.total_outstanding) <= 0}
                    title="إرسال تذكير دفع عبر واتساب"
                  >
                    <WhatsAppIcon size={14} />
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handlePayment(parseInt(client.id))}
                    disabled={Number(client.total_outstanding) <= 0}
                  >
                    <CreditCard size={14} className="me-1" />
                    سداد
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="table-warning">
          <tr className="fw-bold">
            <td className="text-start" style={{ padding: '12px 8px' }}>الإجمالي</td>
            <td className="text-start" style={{ padding: '12px 8px' }}></td>
            <td className="text-center" style={{ padding: '12px 8px' }}>
              {isTotalsLoading ? (
                <div className="spinner-border spinner-border-sm" role="status">
                  <span className="visually-hidden">جاري التحميل...</span>
                </div>
              ) : (
                formatCurrency(displayTotals.totalAmount)
              )}
            </td>
            <td className="text-center text-success" style={{ padding: '12px 8px' }}>
              {isTotalsLoading ? (
                <div className="spinner-border spinner-border-sm" role="status">
                  <span className="visually-hidden">جاري التحميل...</span>
                </div>
              ) : (
                formatCurrency(displayTotals.paidAmount)
              )}
            </td>
            <td className="text-center text-danger" style={{ padding: '12px 8px' }}>
              {isTotalsLoading ? (
                <div className="spinner-border spinner-border-sm" role="status">
                  <span className="visually-hidden">جاري التحميل...</span>
                </div>
              ) : (
                formatCurrency(displayTotals.remainingAmount)
              )}
            </td>
            <td style={{ padding: '12px 8px' }}></td>
          </tr>
        </tfoot>
      </table>
    </div>

  );
};

export default EmployeeReceivablesTable;
