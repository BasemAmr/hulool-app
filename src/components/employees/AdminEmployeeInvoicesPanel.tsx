// Admin view of employee invoices panel - Excel-style bordered table
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, MoreHorizontal } from 'lucide-react';
import apiClient from '../../api/apiClient';
import { useModalStore } from '../../stores/modalStore';
import WhatsAppIcon from '../ui/WhatsAppIcon';
import { sendPaymentReminder } from '../../utils/whatsappUtils';

interface AdminEmployeeInvoicesPanelProps {
  employeeId: number;
}

interface Invoice {
  id: number;
  client_id: number;
  client?: {
    id: number;
    name: string;
    phone: string;
  };
  client_name?: string;
  client_phone?: string;
  task_id: number | null;
  task_name?: string;
  description: string;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: string;
}

const AdminEmployeeInvoicesPanel: React.FC<AdminEmployeeInvoicesPanelProps> = ({ employeeId }) => {
  const { openModal } = useModalStore();

  // Fetch invoices for this employee using admin endpoint
  const { data: invoicesData, isLoading } = useQuery({
    queryKey: ['admin', 'employee', employeeId, 'invoices'],
    queryFn: async () => {
      const response = await apiClient.get(`/invoices/admin/employee/${employeeId}/dashboard`, {
        params: { 
          per_page: 50,
          payment_status: ['pending', 'partially_paid']
        }
      });
      return response.data;
    },
    staleTime: 1 * 60 * 1000,
    refetchInterval: 30000,
  });

  const invoices: Invoice[] = invoicesData?.invoices || [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(Math.abs(amount));
  };

  const handleRecordPayment = (invoice: Invoice) => {
    const clientName = invoice.client?.name || invoice.client_name || '';
    const amountDue = invoice.remaining_amount || (invoice.amount - invoice.paid_amount);
    
    openModal('recordPayment', {
      invoiceId: invoice.id,
      amountDue: amountDue,
      clientId: invoice.client_id,
      clientName: clientName
    });
  };

  const handleWhatsAppReminder = (invoice: Invoice) => {
    const phone = invoice.client?.phone || invoice.client_phone || '';
    const clientName = invoice.client?.name || invoice.client_name || '';
    const remainingAmount = invoice.remaining_amount || (invoice.amount - invoice.paid_amount);
    
    if (phone) {
      const formattedAmount = formatCurrency(remainingAmount);
      sendPaymentReminder(phone, clientName, formattedAmount);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div 
      className="rounded-lg border border-border bg-card shadow-sm h-full"
      style={{
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-2 border-b border-border"
        style={{
          backgroundColor: '#ffc107',
          color: '#000',
          flexShrink: 0
        }}
      >
        <div className="flex justify-between items-center">
          <h6 className="mb-0 font-bold text-base">
            فواتير الموظف
          </h6>
          <span className="text-base font-bold">
            {invoices.length} فاتورة
          </span>
        </div>
      </div>

      {/* Body - Invoices Table */}
      <div className="p-0" style={{ flex: 1, overflow: 'hidden' }}>
        {invoices.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-center">
              <p className="text-black mb-0 text-base">
                لا توجد فواتير غير مدفوعة
              </p>
            </div>
          </div>
        ) : (
          <div className="w-full h-full" style={{ overflow: 'auto' }}>
            <table className="w-full text-base mb-0">
              <thead
                style={{
                  position: 'sticky',
                  top: 0,
                  backgroundColor: '#f0f0f0',
                  zIndex: 1
                }}
              >
                <tr>
                  <th style={{
                    fontSize: '0.7rem',
                    padding: '6px',
                    border: '1px solid #ddd',
                    textAlign: 'start',
                    fontWeight: 'bold'
                  }}>العميل</th>
                  <th style={{
                    fontSize: '0.7rem',
                    padding: '6px',
                    border: '1px solid #ddd',
                    textAlign: 'start',
                    fontWeight: 'bold'
                  }}>الفاتورة</th>
                  <th style={{
                    fontSize: '0.7rem',
                    padding: '6px',
                    border: '1px solid #ddd',
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }}>المبلغ</th>
                  <th style={{
                    fontSize: '0.7rem',
                    padding: '6px',
                    border: '1px solid #ddd',
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }}>المدفوع</th>
                  <th style={{
                    fontSize: '0.7rem',
                    padding: '6px',
                    border: '1px solid #ddd',
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }}>المتبقي</th>
                  <th style={{
                    fontSize: '0.7rem',
                    padding: '6px',
                    border: '1px solid #ddd',
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice, index) => {
                  const bgColor = index % 2 === 0 ? '#fff8e1' : '#ffecb3';
                  const clientName = invoice.client?.name || invoice.client_name || 'غير معروف';
                  const remaining = invoice.remaining_amount || (invoice.amount - invoice.paid_amount);
                  
                  return (
                    <tr key={invoice.id}>
                      <td style={{
                        fontSize: '1rem',
                        padding: '4px 6px',
                        border: '1px solid #ddd',
                        textAlign: 'start',
                        backgroundColor: bgColor
                      }}>
                        {clientName}
                      </td>
                      <td style={{
                        fontSize: '1rem',
                        padding: '4px 6px',
                        border: '1px solid #ddd',
                        textAlign: 'start',
                        backgroundColor: bgColor
                      }}>
                        {invoice.description || invoice.task_name || `فاتورة #${invoice.id}`}
                      </td>
                      <td style={{
                        fontSize: '1rem',
                        padding: '4px 6px',
                        border: '1px solid #ddd',
                        textAlign: 'center',
                        backgroundColor: bgColor
                      }}>
                        {formatCurrency(invoice.amount)}
                      </td>
                      <td style={{
                        fontSize: '1rem',
                        padding: '4px 6px',
                        border: '1px solid #ddd',
                        textAlign: 'center',
                        backgroundColor: bgColor,
                        color: invoice.paid_amount > 0 ? '#16a34a' : '#666'
                      }}>
                        {formatCurrency(invoice.paid_amount)}
                      </td>
                      <td style={{
                        fontSize: '1rem',
                        padding: '4px 6px',
                        border: '1px solid #ddd',
                        textAlign: 'center',
                        backgroundColor: bgColor,
                        fontWeight: '600',
                        color: remaining > 0 ? '#dc2626' : '#16a34a'
                      }}>
                        {formatCurrency(remaining)}
                      </td>
                      <td style={{
                        fontSize: '1rem',
                        padding: '4px 6px',
                        border: '1px solid #ddd',
                        textAlign: 'center',
                        backgroundColor: bgColor
                      }}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleRecordPayment(invoice)}
                            className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
                            title="تسجيل دفعة"
                          >
                            <CreditCard size={14} />
                          </button>
                          {(invoice.client?.phone || invoice.client_phone) && (
                            <button
                              onClick={() => handleWhatsAppReminder(invoice)}
                              className="p-1 text-green-500 hover:bg-green-100 rounded transition-colors"
                              title="تذكير واتساب"
                            >
                              <WhatsAppIcon size={14} />
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

      {/* Footer */}
      <div 
        className="px-4 py-2 bg-muted/30 border-t border-border text-center"
        style={{ flexShrink: 0 }}
      >
        <span className="text-base text-muted-foreground">
          إجمالي المتبقي: {formatCurrency(invoices.reduce((sum, inv) => sum + (inv.remaining_amount || (inv.amount - inv.paid_amount)), 0))} ر.س
        </span>
      </div>
    </div>
  );
};

export default AdminEmployeeInvoicesPanel;
