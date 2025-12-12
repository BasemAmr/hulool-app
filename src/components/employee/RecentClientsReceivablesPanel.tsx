// src/components/employee/RecentClientsReceivablesPanel.tsx
import React from 'react';
import { CreditCard, Edit3, MoreHorizontal, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useModalStore } from '../../stores/modalStore';
import WhatsAppIcon from '../ui/WhatsAppIcon';
import { sendPaymentReminder } from '../../utils/whatsappUtils';
import apiClient from '../../api/apiClient';
import { useQuery } from '@tanstack/react-query';
import { useRestoreTask } from '../../queries/taskQueries';
import { useToast } from '../../hooks/useToast';

interface RecentClientsReceivablesPanelProps {}

// Transform invoice to receivable-like format for display
interface DisplayInvoice {
  id: number;
  client_id: number;
  client_name: string;
  client_phone: string;
  task_id: number | null;
  task_name: string;
  description: string;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: string;
}

const RecentClientsReceivablesPanel: React.FC<RecentClientsReceivablesPanelProps> = () => {
  const navigate = useNavigate();
  const { openModal } = useModalStore();
  const restoreTaskMutation = useRestoreTask();
  const { success, error } = useToast();


  // Fetch recent invoices with pagination using new endpoint
  const { data: invoicesData, isLoading } = useQuery({
    queryKey: ['invoices', 'employee-dashboard', 'unpaid-partial'],
    queryFn: async () => {
      const response = await apiClient.get('/invoices/employee/me/dashboard', {
        params: { 
          per_page: 20,
          payment_status: ['pending', 'partially_paid'] // Use correct enum values
        }
      });
      return response.data;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 20000, // Refetch every 20 seconds
  });

  // Transform invoices to display format
  const clients: DisplayInvoice[] = (invoicesData?.invoices || []).map((invoice: any) => ({
    id: invoice.id,
    client_id: invoice.client_id,
    client_name: invoice.client?.name || invoice.client_name || '',
    client_phone: invoice.client?.phone || invoice.client_phone || '',
    task_id: invoice.task_id,
    task_name: invoice.task?.task_name || invoice.task_name || '',
    description: invoice.description,
    amount: Number(invoice.amount),
    paid_amount: Number(invoice.paid_amount),
    remaining_amount: Number(invoice.remaining_amount),
    status: invoice.status,
  }));

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

  const handleRestore = async (receivable: any) => {
    if (!receivable.task_id) {
      error('فشل في الاستعادة', 'لا يمكن استرداد هذا المستحق - لا توجد مهمة مرتبطة به');
      return;
    }

    try {
      await restoreTaskMutation.mutateAsync({
        id: receivable.task_id
      });
      success('تمت الاستعادة', 'تم استرداد المهمة بنجاح');
    } catch (err) {
      console.error('Restore task error:', err);
      error('فشل في الاستعادة', 'فشل في استرداد المهمة');
    }
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
        className="rounded-lg border border-border bg-card shadow-sm h-full"
        style={{
          overflow: 'visible',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div
          className="px-4 py-2 border-b border-border"
          style={{
            backgroundColor: 'var(--color-primary)',
            color: 'var(--color-white)',
            flexShrink: 0
          }}
        >
          <h6 className="mb-0 font-bold text-base">
            المستحقات الأخيرة
          </h6>
        </div>
        <div className="flex-1 flex justify-center items-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">جاري التحميل...</span>
          </div>
        </div>
      </div>
    );
  }

  // Filter out invoices with zero outstanding amounts
  const filteredReceivables = clients.filter((invoice: DisplayInvoice) => 
    invoice.remaining_amount > 0
  );

  return (
    <div 
      className="rounded-lg border border-border bg-card shadow-sm h-full"
      style={{
        overflow: 'visible',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-2 border-b border-border"
        style={{
          backgroundColor: '#ffc107',
          color: '#fff',
          flexShrink: 0
        }}
      >
        <div className="flex justify-center items-center">
          <h6 className="mb-0 text-white font-bold text-base">
            المستحقات عند العملاء
          </h6>
        </div>
      </div>

      {/* Body - Invoices Table */}
      <div className="p-0" style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {filteredReceivables.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-center">
              <p className="text-black mb-0 text-sm">
                لا يوجد مستحقات
              </p>
            </div>
          </div>
        ) : (
          <div className="w-full h-full" style={{ overflow: 'auto', position: 'relative' }}>
            <table className="w-full text-sm mb-0" style={{ position: 'relative', zIndex: 10 }}>
              <thead
                style={{
                  position: 'sticky',
                  top: 0,
                  backgroundColor: '#f0f0f0'
                }}
              >
                <tr>
                  <th style={{
                    fontSize: '0.75rem',
                    padding: '8px',
                    border: '1px solid #ddd',
                    textAlign: 'start',
                    fontWeight: 'bold'
                  }}>العميل</th>
                  <th style={{
                    fontSize: '0.75rem',
                    padding: '8px',
                    border: '1px solid #ddd',
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }}>الوصف</th>
                  <th style={{
                    fontSize: '0.75rem',
                    padding: '8px',
                    border: '1px solid #ddd',
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }}>المستحق</th>
                  <th style={{
                    fontSize: '0.75rem',
                    padding: '8px',
                    border: '1px solid #ddd',
                    textAlign: 'end',
                    minWidth: '80px',
                    fontWeight: 'bold'
                  }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredReceivables.map((invoice: DisplayInvoice, index: number) => {
                  const bgColor = index % 2 === 0 ? '#fff3cd' : '#ffe69c';
                  return (
                  <tr
                    key={invoice.id}
                    className="hover:opacity-80 transition-opacity cursor-pointer"
                  >
                    <td style={{
                      fontSize: '0.75rem',
                      padding: '6px',
                      textAlign: 'start',
                      border: '1px solid #ddd',
                      backgroundColor: bgColor
                    }}>
                      <span 
                        className="font-bold text-black" 
                        style={{ 
                          maxWidth: '100px', 
                          display: 'inline-block',
                          cursor: 'pointer'
                        }}
                        title={invoice.client_name}
                      >
                        {invoice.client_name}
                      </span>
                    </td>
                    <td style={{
                      fontSize: '0.8rem',
                      padding: '6px',
                      textAlign: 'start',
                      border: '1px solid #ddd',
                      backgroundColor: bgColor
                    }} className='font-semibold'>
                      <span>
                        {invoice.description || invoice.task_name}
                      </span>
                    </td>
                    <td style={{
                      fontSize: '0.75rem',
                      padding: '6px',
                      textAlign: 'center',
                      border: '1px solid #ddd',
                      backgroundColor: bgColor
                    }}>
                      <span className="font-bold text-red-600">
                        {formatCurrency(invoice.remaining_amount)} ر.س
                      </span>
                    </td>
                    <td style={{
                      padding: '6px',
                      textAlign: 'end',
                      border: '1px solid #ddd',
                      minWidth: '80px',
                      backgroundColor: bgColor
                    }}>
                      <div className="flex justify-center gap-1">
                        <button
                          className="px-1.5 py-1 text-xs border border-blue-500 text-blue-500 rounded hover:bg-blue-500 hover:text-white transition-colors"
                          onClick={() => openModal('editReceivable', { receivable: { 
                            id: invoice.id,
                            client_id: invoice.client_id,
                            description: invoice.description,
                            amount: invoice.amount,
                            remaining_amount: invoice.remaining_amount,
                            client_name: invoice.client_name,
                            client_phone: invoice.client_phone,
                            task_id: invoice.task_id
                          } as any })}
                          title="تعديل المستحق"
                        >
                          <Edit3 size={10} />
                        </button>

                        <button
                          className="px-1.5 py-1 text-xs border border-purple-600 text-purple-600 rounded hover:bg-purple-600 hover:text-white transition-colors"
                          onClick={() => openModal('recordPayment', {
                            invoiceId: invoice.id,
                            clientId: invoice.client_id,
                            clientName: invoice.client_name,
                            amountDue: invoice.remaining_amount
                          })}
                          disabled={invoice.remaining_amount <= 0}
                          title="تسجيل دفعة"
                        >
                          <CreditCard size={10} />
                        </button>

                        <button
                          className="px-1.5 py-1 text-xs border border-green-600 text-green-600 rounded hover:bg-green-600 hover:text-white transition-colors"
                          onClick={() => handleWhatsAppPaymentReminder(invoice.client_phone, invoice.client_name, invoice.remaining_amount)}
                          disabled={invoice.remaining_amount <= 0}
                          title="إرسال تذكير دفع عبر واتساب"
                        >
                          <WhatsAppIcon size={10} />
                        </button>

                        {/* Restore Button - Only show for tasks */}
                        {invoice.task_id && (
                          <button
                            className="px-1.5 py-1 text-xs border border-yellow-600 text-yellow-600 rounded hover:bg-yellow-600 hover:text-white transition-colors"
                            onClick={() => handleRestore({ task_id: invoice.task_id })}
                            disabled={restoreTaskMutation.isPending}
                            title="استرداد المهمة إلى حالة جديدة"
                          >
                            <RotateCcw size={10} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer - Pagination and Show More */}
      <div 
        className="px-4 py-2 bg-muted/30 border-t border-border"
        style={{ flexShrink: 0 }}
      >
        <div className="flex justify-center items-center">
          {/* Show More Button */}
          <button
            onClick={navigateToFinancials}
            className="text-primary p-0 flex items-center gap-1 hover:text-primary/80 transition-colors text-sm"
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
