// src/components/employee/RecentClientsReceivablesPanel.tsx
import React from 'react';
import { CreditCard, Edit3, MoreHorizontal, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useModalStore } from '@/shared/stores/modalStore';
import WhatsAppIcon from '@/shared/ui/icons/WhatsAppIcon';
import { sendPaymentReminder } from '@/shared/utils/whatsappUtils';
import apiClient from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { useRestoreTask } from '@/features/tasks/api/taskQueries';
import { useToast } from '@/shared/hooks/useToast';

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
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm h-full flex flex-col">
        <div className="px-4 py-3 border-b border-gray-200 border-l-4 border-l-primary bg-white flex-shrink-0">
          <h6 className="mb-0 font-semibold text-gray-900 text-sm">المستحقات الأخيرة</h6>
        </div>
        <div className="flex-1 flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // Filter out invoices with zero outstanding amounts
  const filteredReceivables = clients.filter((invoice: DisplayInvoice) => 
    invoice.remaining_amount > 0
  );

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm h-full flex flex-col">
      {/* Header — single left-border accent, white background */}
      <div className="px-4 py-3 border-b border-gray-200 border-l-4 border-l-primary bg-white flex-shrink-0 flex justify-center items-center">
        <h6 className="mb-0 font-semibold text-gray-900 text-sm">المستحقات عند العملاء</h6>
      </div>

      {/* Body - Invoices Table */}
      <div className="flex-1 overflow-hidden">
        {filteredReceivables.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-center">
              <p className="text-text-primary mb-0 text-sm">
                لا يوجد مستحقات
              </p>
            </div>
          </div>
        ) : (
          <div className="w-full h-full overflow-auto">
            <table className="w-full text-sm mb-0 border-collapse">
              <thead className="sticky top-0 z-10 bg-bg-surface-muted">
                <tr>
                  <th className="px-2 py-2 border border-border-strong text-start font-bold text-base text-text-primary">
                    العميل
                  </th>
                  <th className="px-2 py-2 border border-border-strong text-start font-bold text-base text-text-primary">
                    الوصف
                  </th>
                  <th className="px-2 py-2 border border-border-strong text-center font-bold text-base text-text-primary">
                    المستحق
                  </th>
                  <th className="px-2 py-2 border border-border-strong text-center font-bold text-base text-text-primary" style={{ minWidth: '120px' }}>
                    إجراءات
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredReceivables.map((invoice: DisplayInvoice, index: number) => {
                  const rowBg = index % 2 === 0 ? 'bg-bg-surface' : 'bg-bg-surface-hover';
                  return (
                    <tr key={invoice.id} className={`${rowBg} hover:bg-bg-surface-muted transition-colors`}>
                      <td className="px-2 py-1.5 border border-border-default text-start font-semibold text-sm text-text-primary overflow-hidden text-ellipsis whitespace-nowrap" style={{ maxWidth: '120px' }} title={invoice.client_name}>
                        {invoice.client_name}
                      </td>
                      <td className="px-2 py-1.5 border border-border-default text-start text-sm text-text-secondary overflow-hidden text-ellipsis whitespace-nowrap">
                        {invoice.description || invoice.task_name}
                      </td>
                      <td className="px-2 py-1.5 border border-border-default text-center font-semibold text-sm text-text-primary">
                        {formatCurrency(invoice.remaining_amount)} ر.س
                      </td>
                      <td className="px-2 py-1.5 border border-border-default text-center">
                        <div className="flex justify-center gap-0.5">
                          {/* Edit */}
                          <button
                            className="inline-flex items-center justify-center rounded p-1.5 text-text-muted hover:text-text-secondary bg-transparent hover:bg-bg-surface-muted border border-transparent hover:border-border-default transition-colors duration-150"
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
                            <Edit3 size={12} />
                          </button>

                          {/* Record Payment */}
                          <button
                            className="inline-flex items-center justify-center rounded p-1.5 text-text-muted hover:text-text-secondary bg-transparent hover:bg-bg-surface-muted border border-transparent hover:border-border-default transition-colors duration-150 disabled:opacity-40"
                            onClick={() => openModal('recordPayment', {
                              invoiceId: invoice.id,
                              clientId: invoice.client_id,
                              clientName: invoice.client_name,
                              amountDue: invoice.remaining_amount
                            })}
                            disabled={invoice.remaining_amount <= 0}
                            title="تسجيل دفعة"
                          >
                            <CreditCard size={12} />
                          </button>

                          {/* WhatsApp reminder — brand color is a confirmed exception */}
                          <button
                            className="inline-flex items-center justify-center rounded p-1.5 text-text-muted hover:text-text-secondary bg-transparent hover:bg-bg-surface-muted border border-transparent hover:border-border-default transition-colors duration-150 disabled:opacity-40"
                            onClick={() => handleWhatsAppPaymentReminder(invoice.client_phone, invoice.client_name, invoice.remaining_amount)}
                            disabled={invoice.remaining_amount <= 0}
                            title="إرسال تذكير دفع عبر واتساب"
                          >
                            <WhatsAppIcon size={12} />
                          </button>

                          {/* Restore */}
                          {invoice.task_id && (
                            <button
                              className="inline-flex items-center justify-center rounded p-1.5 text-text-muted hover:text-text-secondary bg-transparent hover:bg-bg-surface-muted border border-transparent hover:border-border-default transition-colors duration-150 disabled:opacity-40"
                              onClick={() => handleRestore({ task_id: invoice.task_id })}
                              disabled={restoreTaskMutation.isPending}
                              title="استرداد المهمة"
                            >
                              <RotateCcw size={12} />
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
      <div className="px-4 py-2 bg-bg-surface-muted border-t border-border-default text-center flex-shrink-0">
        <button
          onClick={navigateToFinancials}
          className="text-text-secondary p-0 flex items-center justify-center gap-1 w-full hover:text-text-primary transition-colors text-sm"
        >
          <MoreHorizontal size={16} />
          <span>عرض المزيد</span>
        </button>
      </div>
    </div>
  );
};

export default RecentClientsReceivablesPanel;
