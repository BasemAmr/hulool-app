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
    <div className="rounded-lg border border-border bg-card shadow-sm h-full flex flex-col overflow-hidden">
      {/* Header - Yellow with bold text */}
      <div className="px-4 py-2 border-b border-border bg-amber-400 text-black flex-shrink-0">
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
      <div className="flex-1 overflow-hidden p-0">
        {invoices.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-center">
              <p className="text-black mb-0 text-base font-bold">
                لا توجد فواتير غير مدفوعة
              </p>
            </div>
          </div>
        ) : (
          <div className="w-full h-full overflow-auto">
            <table className="w-full text-base border-collapse">
              <thead className="sticky top-0 bg-gray-100 z-10">
                <tr>
                  <th className="text-sm px-1.5 py-1.5 border border-gray-300 text-start font-bold">العميل</th>
                  <th className="text-sm px-1.5 py-1.5 border border-gray-300 text-start font-bold">الفاتورة</th>
                  <th className="text-sm px-1.5 py-1.5 border border-gray-300 text-center font-bold">المبلغ</th>
                  <th className="text-sm px-1.5 py-1.5 border border-gray-300 text-center font-bold">المدفوع</th>
                  <th className="text-sm px-1.5 py-1.5 border border-gray-300 text-center font-bold">المتبقي</th>
                  <th className="text-sm px-1.5 py-1.5 border border-gray-300 text-center font-bold">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice, index) => {
                  const bgColor = index % 2 === 0 ? 'bg-amber-50' : 'bg-amber-100';
                  const clientName = invoice.client?.name || invoice.client_name || 'غير معروف';
                  const remaining = invoice.remaining_amount || (invoice.amount - invoice.paid_amount);
                  
                  return (
                    <tr key={invoice.id}>
                      <td className={`text-base px-1.5 py-1 border border-gray-300 text-start font-bold ${bgColor}`}>
                        {clientName}
                      </td>
                      <td className={`text-base px-1.5 py-1 border border-gray-300 text-start font-bold ${bgColor}`}>
                        {invoice.description || invoice.task_name || `فاتورة #${invoice.id}`}
                      </td>
                      <td className={`text-base px-1.5 py-1 border border-gray-300 text-center font-bold ${bgColor}`}>
                        {formatCurrency(invoice.amount)}
                      </td>
                      <td className={`text-base px-1.5 py-1 border border-gray-300 text-center font-bold ${bgColor} ${invoice.paid_amount > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                        {formatCurrency(invoice.paid_amount)}
                      </td>
                      <td className={`text-base px-1.5 py-1 border border-gray-300 text-center font-bold ${bgColor} ${remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(remaining)}
                      </td>
                      <td className={`text-base px-1.5 py-1 border border-gray-300 text-center font-bold ${bgColor}`}>
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
      <div className="px-4 py-2 bg-gray-100 border-t border-border text-center flex-shrink-0">
        <span className="text-base text-gray-700 font-bold">
          إجمالي المتبقي: {formatCurrency(invoices.reduce((sum, inv) => sum + (inv.remaining_amount || (inv.amount - inv.paid_amount)), 0))} ر.س
        </span>
      </div>
    </div>
  );
};

export default AdminEmployeeInvoicesPanel;
