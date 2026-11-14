// src/components/employee/RecentClientsReceivablesPanel.tsx
import React, { useEffect, useState } from 'react';
import { CreditCard, MoreHorizontal, RotateCcw, Sheet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useModalStore } from '@/shared/stores/modalStore';
import apiClient from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { useRestoreTask } from '@/features/tasks/api/taskQueries';
import { useToast } from '@/shared/hooks/useToast';
import { exportService } from '@/services/export/ExportService';
import type { EmployeeReceivablesExportItem } from '@/services/export/exportTypes';

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

// The panel's "نوع الحركة" column: a sarf payout is a cash movement, an invoice is a task.
const transactionTypeLabel = (type?: string) => (type === 'payout' ? 'صرف' : 'مهمة');

// Shape of one row returned by GET /invoices/employee/me/dashboard
interface DashboardInvoiceRow {
  id: number | string;
  client_id: number;
  client_name?: string;
  client_phone?: string;
  client?: { name?: string; phone?: string };
  task_id: number | null;
  task_name?: string;
  task?: { task_name?: string };
  description?: string;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: string;
  type?: string;
}

interface DashboardResponse {
  invoices: DashboardInvoiceRow[];
  total_outstanding: number;
  pagination: {
    total: number;
    per_page: number;
    current_page: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

const toDisplayInvoice = (item: DashboardInvoiceRow): DisplayInvoice => ({
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
});

const PER_PAGE = 20;
const EXPORT_PER_PAGE = 100;

const RecentClientsReceivablesPanel: React.FC = () => {
  const navigate = useNavigate();
  const { openModal } = useModalStore();
  const restoreTaskMutation = useRestoreTask();
  const { success, error } = useToast();

  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch recent invoices with pagination using new endpoint
  const { data: invoicesData, isLoading, isFetching } = useQuery({
    queryKey: ['invoices', 'employee-dashboard', 'unpaid-partial', page],
    queryFn: async () => {
      const response = await apiClient.get<DashboardResponse>('/invoices/employee/me/dashboard', {
        params: { 
          page,
          per_page: PER_PAGE,
          payment_status: ['pending', 'partially_paid'] // Use correct enum values
        }
      });
      return response.data;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 20000, // Refetch every 20 seconds
  });

  const pagination = invoicesData?.pagination;
  const totalPages = pagination?.total_pages ?? 1;

  // The 20s refetch can shrink the result set under the current page (rows settled).
  // Step back instead of showing an empty table.
  // Guarded on `pagination` being present: while the NEXT page is loading, React Query
  // hands back undefined data, and an unguarded check would snap the page back to 1.
  useEffect(() => {
    if (pagination && page > pagination.total_pages) setPage(pagination.total_pages);
  }, [pagination, page]);

  // Transform invoices and payouts to display format
  const clients = (invoicesData?.invoices || []).map(toDisplayInvoice);

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

  /**
   * Export every row the panel can show, not just the current page.
   * Walks the API page by page and concatenates them in the order the backend
   * returns them, so the spreadsheet matches the panel's row order exactly.
   */
  const handleExportExcel = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const collected: DisplayInvoice[] = [];
      let totalOutstanding = 0;
      let currentPage = 1;
      let totalPages = 1;
      let expectedRowCount = 0;

      do {
        const response = await apiClient.get<DashboardResponse>('/invoices/employee/me/dashboard', {
          params: {
            page: currentPage,
            // The endpoint permits 100. Fewer requests means less chance of rows changing
            // between pages while still walking every API page when the result is larger.
            per_page: EXPORT_PER_PAGE,
            payment_status: ['pending', 'partially_paid'],
          },
        });

        const data = response.data;
        totalOutstanding = Number(data?.total_outstanding ?? 0);
        totalPages = Number(data?.pagination?.total_pages ?? 1);
        expectedRowCount = Number(data?.pagination?.total ?? 0);

        collected.push(...(data?.invoices || []).map(toDisplayInvoice));

        currentPage++;
      } while (currentPage <= totalPages);

      // The panel hides zero-remaining rows; the export must match.
      const rows = collected.filter((r) => r.remaining_amount > 0);

      // Never produce the kind of internally inconsistent workbook shown in the bug:
      // metadata said 83 rows / 60,200, while only 52 rows / 40,842 were exported.
      const rowsTotal = rows.reduce((sum, row) => sum + row.remaining_amount, 0);
      if (rows.length !== expectedRowCount || Math.abs(rowsTotal - totalOutstanding) > 0.01) {
        throw new Error(
          `Receivables export mismatch: rows=${rows.length}/${expectedRowCount}, total=${rowsTotal}/${totalOutstanding}`
        );
      }

      const items: EmployeeReceivablesExportItem[] = rows.map((r) => ({
        client_name: r.client_name,
        transaction_type: transactionTypeLabel(r.type),
        description: r.description || r.task_name || 'سند صرف',
        remaining_amount: r.remaining_amount,
      }));

      await exportService.exportEmployeeReceivables({
        items,
        total_outstanding: totalOutstanding,
      });
      success('تم التصدير', 'تم تصدير ملف Excel بنجاح');
    } catch (err) {
      console.error('Export receivables error:', err);
      error('فشل التصدير', 'تعذر تصدير ملف Excel');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-lg bg-card shadow-sm h-full flex flex-col">
        <div className="px-4 py-3 bg-background flex-shrink-0">
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
    <div className="rounded-lg bg-card shadow-sm h-full flex flex-col" dir="rtl">
      {/* Header — reddish accent & subtle background, prominent centered title.
          The Excel button is fused to the header's end (left in RTL), sharing its
          background and border so the two read as one bar. */}
      <div 
        className="relative px-4 py-2.5 flex-shrink-0 flex items-center justify-center"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--token-card-badge-amount-due-bg) 60%, var(--token-bg-surface, #fff))',
        }}
      >
        <h6 
          className="mb-0 font-extrabold text-base tracking-tight text-center"
          style={{ color: 'var(--token-status-danger-text)' }}
        >
          المستحقات عند العملاء
        </h6>
        <button
          type="button"
          onClick={handleExportExcel}
          disabled={isExporting}
          title="تصدير Excel"
          aria-label="تصدير Excel"
          className="absolute inset-y-0 left-0 px-3 flex items-center gap-1 text-xs font-bold transition-colors hover:bg-card-badge-amount-due-bg disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            color: 'var(--token-status-danger-text)',
          }}
        >
          <Sheet size={14} />
          {isExporting ? 'جارٍ التصدير...' : 'Excel'}
        </button>
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
                <col style={{ width: '180px' }} />
                <col style={{ width: '42px' }} />
                <col style={{ width: 'auto' }} />
                <col style={{ width: '85px' }} />
                <col style={{ width: '65px' }} />
              </colgroup>
              <thead className="sticky top-0 z-10" style={{ backgroundColor: 'var(--token-card-badge-amount-due-bg)' }}>
                <tr style={{ backgroundColor: 'var(--token-card-badge-amount-due-bg)' }}>
                  <th
                    className="px-2 py-2 text-right font-bold text-xs"
                    style={{
                      color: 'var(--token-card-badge-amount-due-text)',
                      width: '180px',
                    }}
                  >
                    العميل
                  </th>
                  <th
                    className="px-1 py-2 text-center font-bold text-[10px]"
                    style={{
                      color: 'var(--token-card-badge-amount-due-text)',
                      width: '42px',
                    }}
                  >
                    نوع الحركة
                  </th>
                  <th
                    className="px-2 py-2 text-right font-bold text-xs"
                    style={{
                      color: 'var(--token-card-badge-amount-due-text)',
                    }}
                  >
                    الوصف
                  </th>
                  <th
                    className="px-1 py-2 text-center font-bold text-xs"
                    style={{
                      color: 'var(--token-card-badge-amount-due-text)',
                      width: '85px',
                    }}
                  >
                    المستحق
                  </th>
                  <th
                    className="px-1 py-2 text-center font-bold text-xs"
                    style={{
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
                        className="px-2 py-1.5 text-right font-bold text-xs truncate"
                        style={{
                          maxWidth: '180px',
                          color: 'var(--token-report-card-text, var(--token-text-primary))',
                        }}
                        title={invoice.client_name}
                      >
                        {invoice.client_name}
                      </td>
                      <td
                        className="px-0.5 py-1.5 text-center align-middle"
                        style={{ width: '42px' }}
                      >
                        <span
                          className="inline-block px-1 py-0.5 rounded text-[9px] font-bold"
                          style={
                            invoice.type === 'payout'
                              ? {
                                  backgroundColor: 'var(--token-status-danger-bg)',
                                  color: 'var(--token-status-danger-text)',
                                }
                              : {
                                  backgroundColor: 'var(--token-bg-surface-muted)',
                                  color: 'var(--token-text-secondary)',
                                }
                          }
                        >
                          {transactionTypeLabel(invoice.type)}
                        </span>
                      </td>
                      <td className="px-1.5 py-1.5 text-right align-middle overflow-hidden">
                        <div
                          className="font-bold truncate text-xs flex-1 min-w-0"
                          style={{ color: '#000000' }}
                          title={invoice.description || invoice.task_name}
                        >
                          {invoice.description || invoice.task_name || 'سند صرف'}
                        </div>
                      </td>
                      <td 
                        className="p-0 text-center align-middle"
                        style={{
                          backgroundColor: 'var(--token-card-badge-amount-due-bg)',
                          width: '85px',
                        }}
                      >
                        <div 
                          className="w-full h-full min-h-[34px] flex items-center justify-center px-1.5 py-1 text-[11px] font-extrabold whitespace-nowrap tabular-nums font-['Cairo']"
                          style={{
                            color: 'var(--token-card-badge-amount-due-text)',
                          }}
                        >
                          {formatCurrency(invoice.remaining_amount)}
                        </div>
                      </td>
                      <td className="px-1 py-1.5 text-center" style={{ width: '65px' }}>
                        <div className="flex items-center justify-start gap-0.5">

                          {/* Record Payment */}
                          <button
                            className="inline-flex items-center justify-center rounded p-1 text-text-secondary hover:text-text-primary bg-transparent hover:bg-background transition-colors duration-150 disabled:opacity-40 cursor-pointer"
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

                          {/* Restore */}
                          {invoice.task_id ? (
                            <button
                              className="inline-flex items-center justify-center rounded p-1 text-text-secondary hover:text-text-primary bg-transparent hover:bg-background transition-colors duration-150 disabled:opacity-40 cursor-pointer"
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
                <tr className="font-extrabold bg-muted/60">
                  <td 
                    colSpan={3} 
                    className="px-2 py-2 text-center text-text-primary text-xs font-bold"
                    style={{
                      backgroundColor: 'var(--token-card-badge-amount-due-bg)',
                      color: 'var(--token-card-badge-amount-due-text)',
                    }}
                  >
                    اجمالي المبالغ المستحقة
                  </td>
                  <td 
                    colSpan={2} 
                    className="p-0 text-center align-middle"
                    style={{
                      backgroundColor: 'var(--token-card-badge-amount-due-bg)',
                    }}
                  >
                    <div 
                      className="w-full h-full min-h-[34px] flex items-center justify-center px-2 py-1 text-xs font-black whitespace-nowrap tabular-nums font-['Cairo']"
                      style={{
                        color: 'var(--token-card-badge-amount-due-text)',
                      }}
                    >
                      {formatCurrency(invoicesData?.total_outstanding ?? 0)}
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="px-4 py-2 bg-background flex items-center justify-between flex-shrink-0 text-xs text-text-secondary">
          <span>
            صفحة {pagination.current_page} من {totalPages} (الإجمالي: {pagination.total})
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1 || isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded bg-card hover:bg-background disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              السابق
            </button>
            <button
              type="button"
              disabled={page >= totalPages || isFetching}
              onClick={() => setPage((p) => p + 1)}
              className="px-2.5 py-1 rounded bg-card hover:bg-background disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              التالي
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-2 bg-background text-center flex-shrink-0">
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
