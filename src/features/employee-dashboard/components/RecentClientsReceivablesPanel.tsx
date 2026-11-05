// src/components/employee/RecentClientsReceivablesPanel.tsx
import React from 'react';
import { CreditCard, MoreHorizontal, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useModalStore } from '@/shared/stores/modalStore';
import WhatsAppIcon from '@/shared/ui/icons/WhatsAppIcon';
import { sendPaymentReminder } from '@/shared/utils/whatsappUtils';
import apiClient from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { useRestoreTask } from '@/features/tasks/api/taskQueries';
import { useToast } from '@/shared/hooks/useToast';

// Transform invoice to receivable-like format for display
interface DisplayInvoice {
  id: number | string;
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
  type?: 'invoice' | 'payout' | string;
}

const RecentClientsReceivablesPanel: React.FC = () => {
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

  // Transform invoices and payouts to display format
  const clients: DisplayInvoice[] = (invoicesData?.invoices || []).map((item: any) => ({
    id: item.id,
    client_id: item.client_id,
    client_name: item.client?.name || item.client_name || '',
    client_phone: item.client?.phone || item.client_phone || '',
    task_id: item.task_id,
    task_name: item.task?.task_name || item.task_name || '',
    description: item.description || '',
    amount: Number(item.amount),
    paid_amount: Number(item.paid_amount),
    remaining_amount: Number(item.remaining_amount),
    status: item.status,
    type: item.type || (String(item.id).startsWith('txn_') ? 'payout' : 'invoice'),
  }));

  const handleWhatsAppPaymentReminder = (phone: string, clientName: string, remainingAmount: number) => {
    const formattedAmount = formatCurrency(remainingAmount);
    sendPaymentReminder(phone, clientName, formattedAmount);
  };

  // Takes task_id directly: the button only renders when it exists, and the caller
  // no longer needs to wrap it in an object just to unwrap it again.
  const handleRestore = async (taskId: number | null) => {
    if (!taskId) {
      error('فشل في الاستعادة', 'لا يمكن استرداد هذا المستحق - لا توجد مهمة مرتبطة به');
      return;
    }

    try {
      await restoreTaskMutation.mutateAsync({ id: taskId });
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
    navigate('/employee/receivables');
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card shadow-sm h-full flex flex-col">
        <div className="px-4 py-3 border-b border-border border-l-4 border-l-primary bg-background flex-shrink-0">
          <h6 className="mb-0 font-semibold text-text-primary text-sm">المستحقات الأخيرة</h6>
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
    <div className="rounded-lg border border-border bg-card shadow-sm h-full flex flex-col" dir="rtl">
      {/* Header — reddish accent & subtle background, prominent centered title */}
      <div 
        className="px-4 py-2.5 border-b border-l-4 flex-shrink-0 flex items-center justify-center"
        style={{
          borderLeftColor: 'var(--token-status-danger-border)',
          borderBottomColor: 'var(--token-card-badge-amount-due-border)',
          backgroundColor: 'color-mix(in srgb, var(--token-card-badge-amount-due-bg) 60%, var(--token-bg-surface, #fff))',
        }}
      >
        <h6 
          className="mb-0 font-extrabold text-base tracking-tight"
          style={{ color: 'var(--token-status-danger-text)' }}
        >
          المستحقات عند العملاء
        </h6>
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
          <div className="w-full h-full overflow-y-auto overflow-x-hidden">
            <table className="w-full text-xs mb-0 border-collapse table-fixed font-['Cairo']">
              <colgroup>
                <col style={{ width: '85px' }} />
                <col style={{ width: 'auto' }} />
                <col style={{ width: '85px' }} />
                <col style={{ width: '65px' }} />
              </colgroup>
              <thead className="sticky top-0 z-10" style={{ backgroundColor: 'var(--token-card-badge-amount-due-bg)' }}>
                <tr style={{ backgroundColor: 'var(--token-card-badge-amount-due-bg)' }}>
                  <th
                    className="px-2 py-2 border text-right font-bold text-xs"
                    style={{
                      borderColor: 'var(--token-card-badge-amount-due-border)',
                      color: 'var(--token-card-badge-amount-due-text)',
                      width: '85px',
                    }}
                  >
                    العميل
                  </th>
                  <th
                    className="px-2 py-2 border text-right font-bold text-xs"
                    style={{
                      borderColor: 'var(--token-card-badge-amount-due-border)',
                      color: 'var(--token-card-badge-amount-due-text)',
                    }}
                  >
                    الوصف
                  </th>
                  <th
                    className="px-1 py-2 border text-center font-bold text-xs"
                    style={{
                      borderColor: 'var(--token-card-badge-amount-due-border)',
                      color: 'var(--token-card-badge-amount-due-text)',
                      width: '85px',
                    }}
                  >
                    المستحق
                  </th>
                  <th
                    className="px-1 py-2 border text-center font-bold text-xs"
                    style={{
                      borderColor: 'var(--token-card-badge-amount-due-border)',
                      color: 'var(--token-card-badge-amount-due-text)',
                      width: '65px',
                    }}
                  >
                    إجراءات
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredReceivables.map((invoice: DisplayInvoice, index: number) => {
                  const rowBg = index % 2 === 0 ? 'bg-bg-surface' : 'bg-bg-surface-hover';
                  return (
                    <tr key={invoice.id} className={`${rowBg} hover:bg-background transition-colors`}>
                      <td 
                        className="px-2 py-1.5 border border-border-default text-right font-bold text-xs text-text-primary truncate" 
                        style={{ maxWidth: '85px' }} 
                        title={invoice.client_name}
                      >
                        {invoice.client_name}
                      </td>
                      <td className="px-1.5 py-1.5 border border-border-default text-right align-middle overflow-hidden">
                        <div className="flex items-center gap-1 w-full min-w-0">
                          {invoice.type === 'payout' && (
                            <span className="px-1 py-0.5 rounded text-[10px] font-bold bg-status-danger-bg text-status-danger-text border border-status-danger-border shrink-0">
                              صرف
                            </span>
                          )}
                          <div 
                            className="overflow-x-auto whitespace-nowrap text-text-secondary hover:text-text-primary text-[11px] font-semibold flex-1 min-w-0"
                            style={{
                              scrollbarWidth: 'none',
                              msOverflowStyle: 'none',
                            }}
                            title={invoice.description || invoice.task_name}
                          >
                            {invoice.description || invoice.task_name || 'سند صرف'}
                          </div>
                        </div>
                      </td>
                      <td 
                        className="p-0 text-center align-middle"
                        style={{
                          backgroundColor: 'var(--token-card-badge-amount-due-bg)',
                          border: '1px solid var(--token-card-badge-amount-due-border)',
                          borderRight: '1px solid var(--token-card-badge-amount-due-border)',
                          borderLeft: '1px solid var(--token-card-badge-amount-due-border)',
                          width: '85px',
                        }}
                      >
                        <div 
                          className="w-full h-full min-h-[34px] flex items-center justify-center px-1.5 py-1 text-[11px] font-extrabold whitespace-nowrap tabular-nums font-['Cairo']"
                          style={{
                            color: 'var(--token-card-badge-amount-due-text)',
                            borderRight: '1px solid var(--token-card-badge-amount-due-border)',
                            borderLeft: '1px solid var(--token-card-badge-amount-due-border)',
                          }}
                        >
                          {formatCurrency(invoice.remaining_amount)} ر.س
                        </div>
                      </td>
                      <td className="px-1 py-1.5 border border-border-default text-center" style={{ width: '65px' }}>
                        <div className="flex items-center justify-center gap-0.5">

                          {/* Record Payment */}
                          <button
                            className="inline-flex items-center justify-center rounded p-1 text-text-secondary hover:text-text-primary bg-transparent hover:bg-background border border-transparent hover:border-border-default transition-colors duration-150 disabled:opacity-40 cursor-pointer"
                            onClick={() => {
                              if (invoice.type === 'payout' || String(invoice.id).startsWith('txn_') || !invoice.task_id) {
                                openModal('unifiedTransaction', {
                                  title: 'سند قبض',
                                  defaultFromCardType: 'client',
                                  defaultFromAccountId: String(invoice.client_id),
                                  defaultFromAccountName: invoice.client_name,
                                  defaultToCardType: 'cashbox',
                                  amount: String(invoice.remaining_amount),
                                  notes: `سداد مستحق: ${invoice.description || 'سند صرف'}`,
                                  lockDirection: false,
                                });
                              } else {
                                openModal('recordPayment', {
                                  invoiceId: Number(invoice.id),
                                  invoice: invoice,
                                  amountDue: invoice.remaining_amount,
                                  clientId: invoice.client_id,
                                  clientName: invoice.client_name,
                                  taskName: invoice.task_name || invoice.description,
                                });
                              }
                            }}
                            disabled={invoice.remaining_amount <= 0}
                            title="تسجيل دفعة / سند قبض"
                          >
                            <CreditCard size={12} />
                          </button>

                          {/* WhatsApp reminder */}
                          <button
                            className="inline-flex items-center justify-center rounded p-1 text-text-secondary hover:text-text-primary bg-transparent hover:bg-background border border-transparent hover:border-border-default transition-colors duration-150 disabled:opacity-40 cursor-pointer"
                            onClick={() => handleWhatsAppPaymentReminder(invoice.client_phone, invoice.client_name, invoice.remaining_amount)}
                            disabled={invoice.remaining_amount <= 0}
                            title="إرسال تذكير دفع عبر واتساب"
                          >
                            <WhatsAppIcon size={12} />
                          </button>

                          {/* Restore */}
                          {invoice.task_id ? (
                            <button
                              className="inline-flex items-center justify-center rounded p-1 text-text-secondary hover:text-text-primary bg-transparent hover:bg-background border border-transparent hover:border-border-default transition-colors duration-150 disabled:opacity-40 cursor-pointer"
                              onClick={() => handleRestore(invoice.task_id)}
                              disabled={restoreTaskMutation.isPending}
                              title="استرداد المهمة"
                            >
                              <RotateCcw size={12} />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="sticky bottom-0 bg-background z-10">
                <tr className="font-extrabold bg-muted/60" style={{ borderTop: '1px solid var(--token-card-badge-amount-due-border)' }}>
                  <td 
                    colSpan={2} 
                    className="px-2 py-2 text-center text-text-primary text-xs font-bold"
                    style={{
                      borderTop: '1px solid var(--token-card-badge-amount-due-border)',
                      borderBottom: '1px solid var(--token-card-badge-amount-due-border)',
                      borderRight: '1px solid var(--token-border-default)',
                    }}
                  >
                    اجمالي المبالغ المستحقة
                  </td>
                  <td 
                    colSpan={2} 
                    className="p-0 text-center align-middle"
                    style={{
                      backgroundColor: 'var(--token-card-badge-amount-due-bg)',
                      border: '1px solid var(--token-card-badge-amount-due-border)',
                      borderTop: '1px solid var(--token-card-badge-amount-due-border)',
                      borderRight: '1px solid var(--token-card-badge-amount-due-border)',
                      borderLeft: '1px solid var(--token-card-badge-amount-due-border)',
                      borderBottom: '1px solid var(--token-card-badge-amount-due-border)',
                    }}
                  >
                    <div 
                      className="w-full h-full min-h-[34px] flex items-center justify-center px-2 py-1 text-xs font-black whitespace-nowrap tabular-nums font-['Cairo']"
                      style={{
                        color: 'var(--token-card-badge-amount-due-text)',
                        borderTop: '1px solid var(--token-card-badge-amount-due-border)',
                        borderRight: '1px solid var(--token-card-badge-amount-due-border)',
                        borderLeft: '1px solid var(--token-card-badge-amount-due-border)',
                        borderBottom: '1px solid var(--token-card-badge-amount-due-border)',
                      }}
                    >
                      {formatCurrency(invoicesData?.total_outstanding ?? 0)} ر.س
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-background border-t border-border-default text-center flex-shrink-0">
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
