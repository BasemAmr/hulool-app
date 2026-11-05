// Admin view of employee invoices panel - Excel-style bordered table
import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, RotateCcw } from 'lucide-react';
import apiClient from '@/api/client';
import { useModalStore } from '@/shared/stores/modalStore';
import WhatsAppIcon from '@/shared/ui/icons/WhatsAppIcon';
import { sendPaymentReminder } from '@/shared/utils/whatsappUtils';

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
  task?: {
    id: number;
    task_name?: string;
    status?: string;
  };
}

const AdminEmployeeInvoicesPanel: React.FC<AdminEmployeeInvoicesPanelProps> = ({ employeeId }) => {
  const { openModal } = useModalStore();
  const queryClient = useQueryClient();

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

  const restoreTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const response = await apiClient.put(`/tasks/${taskId}/status`, {
        status: 'New'
      });
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'employee', employeeId, 'invoices'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'employee', employeeId, 'tasks'] });
    },
  });

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

  const handleRestoreToNew = (invoice: Invoice) => {
    const taskId = invoice.task?.id || invoice.task_id;
    if (!taskId) return;
    restoreTaskMutation.mutate(taskId);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="border border-border bg-card shadow-sm h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div 
        className="px-4 py-2 border-b border-l-4 flex-shrink-0"
        style={{
          borderLeftColor: 'var(--token-status-danger-border)',
          borderBottomColor: 'var(--token-card-badge-amount-due-border)',
          backgroundColor: 'color-mix(in srgb, var(--token-card-badge-amount-due-bg) 60%, var(--token-bg-surface, #fff))',
        }}
      >
        <div className="flex justify-between items-center">
          <h6 className="mb-0 font-bold text-base" style={{ color: 'var(--token-status-danger-text)' }}>فواتير الموظف</h6>
          <span className="text-xs font-semibold text-text-secondary">{invoices.length} فاتورة</span>
        </div>
      </div>

      {/* Body - Invoices Table */}
      <div className="flex-1 overflow-hidden p-0 font-['Cairo']">
        {invoices.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-center">
              <p className="text-text-primary mb-0 text-sm font-semibold">
                لا توجد فواتير غير مدفوعة
              </p>
            </div>
          </div>
        ) : (
          <div className="w-full h-full overflow-auto">
            <table className="w-full text-xs border-collapse font-['Cairo']">
              <thead className="sticky top-0 bg-background z-10" style={{ backgroundColor: 'var(--token-card-badge-amount-due-bg)' }}>
                <tr style={{ backgroundColor: 'var(--token-card-badge-amount-due-bg)' }}>
                  <th className="text-xs px-2 py-2 border text-start font-bold" style={{ borderColor: 'var(--token-card-badge-amount-due-border)', color: 'var(--token-card-badge-amount-due-text)' }}>العميل</th>
                  <th className="text-xs px-2 py-2 border text-start font-bold" style={{ borderColor: 'var(--token-card-badge-amount-due-border)', color: 'var(--token-card-badge-amount-due-text)' }}>الفاتورة</th>
                  <th className="text-xs px-2 py-2 border text-center font-bold" style={{ borderColor: 'var(--token-card-badge-amount-due-border)', color: 'var(--token-card-badge-amount-due-text)' }}>المبلغ</th>
                  <th className="text-xs px-2 py-2 border text-center font-bold" style={{ borderColor: 'var(--token-card-badge-amount-due-border)', color: 'var(--token-card-badge-amount-due-text)' }}>المدفوع</th>
                  <th className="text-xs px-2 py-2 border text-center font-bold" style={{ borderColor: 'var(--token-card-badge-amount-due-border)', color: 'var(--token-card-badge-amount-due-text)' }}>المتبقي</th>
                  <th className="text-xs px-2 py-2 border text-center font-bold" style={{ borderColor: 'var(--token-card-badge-amount-due-border)', color: 'var(--token-card-badge-amount-due-text)' }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice, index) => {
                  const bgColor = index % 2 === 0 ? 'bg-bg-surface' : 'bg-bg-surface-hover';
                  const clientName = invoice.client?.name || invoice.client_name || 'غير معروف';
                  const remaining = invoice.remaining_amount || (invoice.amount - invoice.paid_amount);
                  
                  
                  return (
                    <tr key={invoice.id}>
                      <td className={`text-xs px-2 py-1.5 border border-border-default text-start font-semibold ${bgColor}`}>
                        {clientName}
                      </td>
                      <td className={`text-xs px-2 py-1.5 border border-border-default text-start font-semibold ${bgColor}`}>
                        {invoice.description || invoice.task_name || `فاتورة #${invoice.id}`}
                      </td>
                      <td className={`text-xs px-2 py-1.5 border border-border-default text-center font-semibold tabular-nums ${bgColor}`}>
                        {formatCurrency(invoice.amount)}
                      </td>
                      <td className={`text-xs px-2 py-1.5 border border-border-default text-center font-semibold tabular-nums ${bgColor} ${invoice.paid_amount > 0 ? 'text-status-success-text' : 'text-text-secondary'}`}>
                        {formatCurrency(invoice.paid_amount)}
                      </td>
                      <td 
                        className={`p-0 border border-border-default text-center align-middle ${bgColor}`}
                        style={remaining > 0 ? {
                          backgroundColor: 'var(--token-card-badge-amount-due-bg)',
                          borderColor: 'var(--token-card-badge-amount-due-border)',
                        } : undefined}
                      >
                        {remaining > 0 ? (
                          <div 
                            className="w-full h-full min-h-[28px] flex items-center justify-center px-2 py-1 text-[11px] font-semibold rounded-none whitespace-nowrap tabular-nums font-['Cairo']"
                            style={{
                              color: 'var(--token-card-badge-amount-due-text)',
                            }}
                          >
                            {formatCurrency(remaining)} ر.س
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center px-2 py-1 text-xs font-semibold text-status-success-text">
                            0 ر.س
                          </div>
                        )}
                      </td>
                      <td className={`text-base px-1.5 py-1 border border-border-default text-center font-bold ${bgColor}`}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleRecordPayment(invoice)}
                            className="p-1 text-status-success-text hover:bg-status-success-bg rounded transition-colors"
                            title="تسجيل دفعة"
                          >
                            <CreditCard size={14} />
                          </button>
                          {invoice.task_id && (
                            <button
                              onClick={() => handleRestoreToNew(invoice)}
                              disabled={restoreTaskMutation.isPending}
                              className="p-1 text-status-warning-text hover:bg-status-warning-bg rounded transition-colors disabled:opacity-50 disabled:pointer-events-none"
                              title="استعادة إلى جديد"
                            >
                              <RotateCcw size={14} />
                            </button>
                          )}
                          {(invoice.client?.phone || invoice.client_phone) && (
                            <button
                              onClick={() => handleWhatsAppReminder(invoice)}
                              className="p-1 text-status-success-text hover:bg-status-success-bg rounded transition-colors"
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
      <div className="px-4 py-2 bg-background border-t border-border text-center flex-shrink-0">
        <span className="text-base text-text-primary font-bold">
          إجمالي المتبقي: {formatCurrency(invoices.reduce((sum, inv) => sum + (inv.remaining_amount || (inv.amount - inv.paid_amount)), 0))} ر.س
        </span>
      </div>
    </div>
  );
};

export default AdminEmployeeInvoicesPanel;
