// src/components/employee/RecentClientsReceivablesPanel.tsx
import React from 'react';
import { CreditCard, Edit3, MoreHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useModalStore } from '../../stores/modalStore';
import WhatsAppIcon from '../ui/WhatsAppIcon';
import { sendPaymentReminder, formatPhoneForWhatsApp } from '../../utils/whatsappUtils';
import apiClient from '../../api/apiClient';
import { useQuery } from '@tanstack/react-query';

// Type for the API response
interface ClientReceivableSummary {
  client_id: string;
  client_name: string;
  client_phone: string;
  total_receivables: string;
  total_paid: string;
  total_outstanding: string;
  receivables_count: string;
}

interface RecentClientsReceivablesPanelProps {}

const RecentClientsReceivablesPanel: React.FC<RecentClientsReceivablesPanelProps> = () => {
  const navigate = useNavigate();
  const { openModal } = useModalStore();

  // Fetch recent receivables with per_page=5
  const { data: receivablesData, isLoading } = useQuery({
    queryKey: ['receivables', 'clients-summary', { per_page: 5 }],
    queryFn: async () => {
      const response = await apiClient.get('/receivables/clients-summary', {
        params: { per_page: 5 }
      });
      return response.data;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });

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
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numAmount);
  };

  const navigateToFinancials = () => {
      navigate('/employee/financials');
  };

  if (isLoading) {
    return (
      <div 
        className="card h-100 shadow-sm"
        style={{
          borderRadius: 'var(--border-radius)',
          border: '1px solid var(--color-gray-100)',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div
          className="card-header border-0 py-2"
          style={{
            backgroundColor: 'var(--color-primary)',
            color: 'var(--color-white)',
            flexShrink: 0
          }}
        >
          <h6 className="mb-0 fw-bold" style={{ fontSize: 'var(--font-size-base)' }}>
            المستحقات الأخيرة
          </h6>
        </div>
        <div className="card-body d-flex justify-content-center align-items-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">جاري التحميل...</span>
          </div>
        </div>
      </div>
    );
  }

  // Filter out clients with zero outstanding amounts
  const filteredClients = clients.filter((client: ClientReceivableSummary) => 
    (Number(client.total_outstanding) || 0) > 0
  );

  return (
    <div 
      className="card h-100 shadow-sm"
      style={{
        borderRadius: 'var(--border-radius)',
        border: '1px solid var(--color-gray-100)',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Header */}
      <div
        className="card-header border-0 py-2"
        style={{
          backgroundColor: 'var(--color-primary)',
          color: 'var(--color-white)',
          flexShrink: 0
        }}
      >
        <div className="d-flex justify-content-between align-items-center">
          <h6 className="mb-0 fw-bold" style={{ fontSize: 'var(--font-size-base)' }}>
            المستحقات الأخيرة
          </h6>
          <span style={{ fontSize: 'var(--font-size-sm)' }}>
            {filteredClients.length} عميل
          </span>
        </div>
      </div>

      {/* Body - Receivables Table */}
      <div className="card-body p-0" style={{ flex: 1, overflow: 'hidden' }}>
        {filteredClients.length === 0 ? (
          <div className="d-flex justify-content-center align-items-center h-100">
            <div className="text-center">
              <p className="text-muted mb-0" style={{ fontSize: 'var(--font-size-sm)' }}>
                لا يوجد مستحقات
              </p>
            </div>
          </div>
        ) : (
          <div className="table-responsive h-100" style={{ overflow: 'auto' }}>
            <table className="table table-sm mb-0">
              <thead
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 1,
                  backgroundColor: 'var(--color-gray-50)'
                }}
              >
                <tr>
                  <th style={{
                    fontSize: 'var(--font-size-xs)',
                    padding: '8px',
                    borderBottom: '2px solid var(--color-gray-100)',
                    textAlign: 'center'
                  }}>العميل</th>
                  <th style={{
                    fontSize: 'var(--font-size-xs)',
                    padding: '8px',
                    borderBottom: '2px solid var(--color-gray-100)',
                    textAlign: 'center'
                  }}>الجوال</th>
                  <th style={{
                    fontSize: 'var(--font-size-xs)',
                    padding: '8px',
                    borderBottom: '2px solid var(--color-gray-100)',
                    textAlign: 'center'
                  }}>المستحق</th>
                  <th style={{
                    fontSize: 'var(--font-size-xs)',
                    padding: '8px',
                    borderBottom: '2px solid var(--color-gray-100)',
                    textAlign: 'center',
                    minWidth: '80px'
                  }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client: ClientReceivableSummary) => (
                  <tr
                    key={client.client_id}
                    style={{
                      backgroundColor: 'var(--color-white)',
                      transition: 'all 0.2s ease-in-out',
                      cursor: 'pointer'
                    }}
                  >
                    <td style={{
                      fontSize: 'var(--font-size-xs)',
                      padding: '6px',
                      textAlign: 'center',
                      borderBottom: '1px solid var(--color-gray-100)'
                    }}>
                      <span 
                        className="text-truncate fw-medium" 
                        style={{ 
                          maxWidth: '100px', 
                          display: 'inline-block',
                          cursor: 'pointer',
                          color: 'var(--color-primary)'
                        }}
                        onClick={() => handleClientClick(parseInt(client.client_id))}
                        title={client.client_name}
                      >
                        {client.client_name}
                      </span>
                    </td>
                    <td style={{
                      fontSize: 'var(--font-size-xs)',
                      padding: '6px',
                      textAlign: 'center',
                      borderBottom: '1px solid var(--color-gray-100)'
                    }}>
                      <div className="d-flex align-items-center justify-content-center gap-1">
                        <button
                          className="btn btn-link btn-sm p-0 text-success"
                          onClick={() => handleWhatsApp(client.client_phone)}
                          title="WhatsApp"
                          style={{ fontSize: '10px' }}
                        >
                          <WhatsAppIcon size={10} />
                        </button>
                        <span style={{ fontSize: '10px' }}>
                          {client.client_phone}
                        </span>
                      </div>
                    </td>
                    <td style={{
                      fontSize: 'var(--font-size-xs)',
                      padding: '6px',
                      textAlign: 'center',
                      borderBottom: '1px solid var(--color-gray-100)'
                    }}>
                      <span className="fw-bold text-danger">
                        {formatCurrency(Number(client.total_outstanding) || 0)} ر.س
                      </span>
                    </td>
                    <td style={{
                      padding: '6px',
                      textAlign: 'center',
                      borderBottom: '1px solid var(--color-gray-100)',
                      minWidth: '80px'
                    }}>
                      <div className="d-flex justify-content-center gap-1">
                        <button
                          className="btn btn-outline-info btn-sm p-1"
                          onClick={() => openModal('clientReceivablesEdit', { clientId: parseInt(client.client_id) })}
                          title="تعديل المستحقات"
                          style={{ fontSize: '10px', lineHeight: 1 }}
                        >
                          <Edit3 size={10} />
                        </button>

                        <button
                          className="btn btn-outline-success btn-sm p-1"
                          onClick={() => handleWhatsAppPaymentReminder(client.client_phone, client.client_name, Number(client.total_outstanding))}
                          disabled={Number(client.total_outstanding) <= 0}
                          title="إرسال تذكير دفع عبر واتساب"
                          style={{ fontSize: '10px', lineHeight: 1 }}
                        >
                          <WhatsAppIcon size={10} />
                        </button>

                        <button
                          className="btn btn-primary btn-sm p-1"
                          onClick={() => handlePayment(parseInt(client.client_id))}
                          disabled={Number(client.total_outstanding) <= 0}
                          title="سداد"
                          style={{ fontSize: '10px', lineHeight: 1 }}
                        >
                          <CreditCard size={10} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {/* Show More Row - Remove pagination dependency */}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer - Show More Button */}
      <div 
        className="card-footer bg-light border-0 py-2"
        style={{ flexShrink: 0, textAlign: 'center' }}
      >
        <button
          onClick={navigateToFinancials}
          className="btn btn-link text-primary p-0 d-flex align-items-center justify-content-center gap-1 w-100"
          style={{ fontSize: 'var(--font-size-sm)' }}
        >
          <MoreHorizontal size={16} />
          <span>عرض جميع المستحقات</span>
        </button>
      </div>
    </div>
  );
};

export default RecentClientsReceivablesPanel;
