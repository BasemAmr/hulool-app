// src/components/employee/RecentClientsReceivablesPanel.tsx
import React from 'react';
import { CreditCard, Edit3, MoreHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useModalStore } from '../../stores/modalStore';
import WhatsAppIcon from '../ui/WhatsAppIcon';
import { sendPaymentReminder } from '../../utils/whatsappUtils';
import apiClient from '../../api/apiClient';
import { useQuery } from '@tanstack/react-query';

interface RecentClientsReceivablesPanelProps {}

const RecentClientsReceivablesPanel: React.FC<RecentClientsReceivablesPanelProps> = () => {
  const navigate = useNavigate();
  const { openModal } = useModalStore();


  // Fetch recent receivables with pagination
  const { data: receivablesData, isLoading } = useQuery({
    queryKey: ['receivables', 'employee-dashboard', 'unpaid'],
    queryFn: async () => {
      const response = await apiClient.get('/receivables/employee/me/dashboard', {
        params: { 
          per_page: 20,
          payment_status: 'unpaid'
        }
      });
      return response.data;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 20000, // Refetch every 20 seconds
  });

  const clients = receivablesData?.data?.receivables || [];

  // const handlePayment = (receivable: any) => {
  //   openModal('paymentForm', { receivable });
  // };

  // const handleClientClick = (clientId: number) => {
  //   navigate(`/clients/${clientId}?mode=receivables`);
  // };

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
          overflow: 'visible',
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

  // Filter out receivables with zero outstanding amounts
  const filteredReceivables = clients.filter((receivable: any) => 
    (Number(receivable.remaining_amount) || 0) > 0
  );

  return (
    <div 
      className="card h-100 shadow-sm"
      style={{
        borderRadius: 'var(--border-radius)',
        border: '1px solid var(--color-gray-100)',
        overflow: 'visible',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1
      }}
    >
      {/* Header */}
      <div
        className="card-header border-0 py-2"
        style={{
          backgroundColor: '#ffc107',
          color: '#fff',
          flexShrink: 0
        }}
      >
        <div className="d-flex justify-content-center align-items-center">
          <h6 className="mb-0 text-white fw-bold" style={{ fontSize: 'var(--font-size-base)' }}>
            المستحقات عند العملاء
          </h6>
        </div>
      </div>

      {/* Body - Receivables Table */}
      <div className="card-body p-0" style={{ flex: 1, overflow: 'visible', position: 'relative' }}>
        {filteredReceivables.length === 0 ? (
          <div className="d-flex justify-content-center align-items-center h-100">
            <div className="text-center">
              <p className="text-muted mb-0" style={{ fontSize: 'var(--font-size-sm)' }}>
                لا يوجد مستحقات
              </p>
            </div>
          </div>
        ) : (
          <div className="table-responsive h-100" style={{ overflow: 'visible', position: 'relative', zIndex: 10 }}>
            <table className="table table-sm mb-0" style={{ position: 'relative', zIndex: 10 }}>
              <thead
                style={{
                  position: 'sticky',
                  top: 0,
                  backgroundColor: 'var(--color-gray-50)'
                }}
              >
                <tr>
                  <th style={{
                    fontSize: 'var(--font-size-xs)',
                    padding: '8px',
                    borderBottom: '2px solid var(--color-gray-100)',
                    textAlign: 'start'
                  }}>العميل</th>
                  <th style={{
                    fontSize: 'var(--font-size-xs)',
                    padding: '8px',
                    borderBottom: '2px solid var(--color-gray-100)',
                    textAlign: 'center'
                  }}>الوصف</th>
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
                {clients.map((receivable: any, index: number) => (
                  <tr
                    key={receivable.id}
                    style={{
                      transition: 'all 0.2s ease-in-out',
                      cursor: 'pointer'
                    }}
                  >
                    <td style={{
                      fontSize: 'var(--font-size-xs)',
                      padding: '6px',
                      textAlign: 'start',
                      borderBottom: '1px solid var(--color-gray-100)',
                      backgroundColor: index % 2 === 0 ? '#fff8e1' : '#ffecb3'
                    }}>
                      <span 
                        className="text-truncate fw-medium" 
                        style={{ 
                          maxWidth: '100px', 
                          display: 'inline-block',
                          cursor: 'pointer',
                          color: 'var(--color-primary)'
                        }}
                        // onClick={() => handleClientClick(parseInt(receivable.client_id))}
                        title={receivable.client_name}
                      >
                        {receivable.client_name}
                      </span>
                    </td>
                    <td style={{
                      fontSize: 'var(--font-size-xs)',
                      padding: '6px',
                      textAlign: 'center',
                      borderBottom: '1px solid var(--color-gray-100)',
                      backgroundColor: index % 2 === 0 ? '#fff8e1' : '#ffecb3'
                    }}>
                      <span style={{ fontSize: '10px' }}>
                        {receivable.description || receivable.task_name}
                      </span>
                    </td>
                    <td style={{
                      fontSize: 'var(--font-size-xs)',
                      padding: '6px',
                      textAlign: 'center',
                      borderBottom: '1px solid var(--color-gray-100)',
                      backgroundColor: index % 2 === 0 ? '#fff8e1' : '#ffecb3'
                    }}>
                      <span className="fw-bold text-danger">
                        {formatCurrency(Number(receivable.remaining_amount) || 0)} ر.س
                      </span>
                    </td>
                    <td style={{
                      padding: '6px',
                      textAlign: 'center',
                      borderBottom: '1px solid var(--color-gray-100)',
                      minWidth: '80px',
                      backgroundColor: index % 2 === 0 ? '#fff8e1' : '#ffecb3'
                    }}>
                      <div className="d-flex justify-content-center gap-1">
                        <button
                          className="btn btn-outline-info btn-sm p-1"
                          onClick={() => openModal('editReceivable', { receivable })}
                          title="تعديل المستحق"
                          style={{ fontSize: '10px', lineHeight: 1 }}
                        >
                          <Edit3 size={10} />
                        </button>

                        <button
                          className="btn btn-outline-success btn-sm p-1"
                          onClick={() => handleWhatsAppPaymentReminder(receivable.client_phone, receivable.client_name, Number(receivable.remaining_amount))}
                          disabled={Number(receivable.remaining_amount) <= 0}
                          title="إرسال تذكير دفع عبر واتساب"
                          style={{ fontSize: '10px', lineHeight: 1 }}
                        >
                          <WhatsAppIcon size={10} />
                        </button>

                        {/* <button
                          className="btn btn-primary btn-sm p-1"
                          onClick={() => handlePayment(receivable)}
                          disabled={Number(receivable.remaining_amount) <= 0}
                          title="سداد"
                          style={{ fontSize: '10px', lineHeight: 1 }}
                        >
                          <CreditCard size={10} />
                        </button> */}
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

      {/* Footer - Pagination and Show More */}
      <div 
        className="card-footer bg-light border-0 py-2"
        style={{ flexShrink: 0 }}
      >
        <div className="d-flex justify-content-center align-items-center">
          {/* Items per page selector */}
         

          {/* Show More Button */}
          <button
            onClick={navigateToFinancials}
            className="btn btn-link text-primary p-0 d-flex align-items-center gap-1"
            style={{ fontSize: 'var(--font-size-sm)' }}
          >
            <MoreHorizontal size={16} />
            <span>عرض المزيد</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecentClientsReceivablesPanel;
