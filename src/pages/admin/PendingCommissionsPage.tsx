/**
 * PendingCommissionsPage
 * 
 * Simplified admin page for managing pending commissions
 * Features:
 * - Infinite scroll table (no tabs)
 * - Enriched data (invoice, client, task details)
 * - 3 action buttons per row:
 *   1. Pay Invoice - Navigate to invoice payment
 *   2. Edit Expected Amount - Modal to update amount
 *   3. WhatsApp Reminder - Send message to client
 */

import { useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import apiClient from '@/api/apiClient';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Button from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DollarSign,
  Edit2,
  MessageCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import EditExpectedCommissionModal from '@/components/modals/EditExpectedCommissionModal';
import { useModalStore } from '../../stores/modalStore';

interface PendingCommission {
  id: string | number;
  expected_amount: number;
  status: string;
  created_at: string;
  days_pending: number;
  employee_name: string;
  task?: {
    id: number;
    task_name: string;
    net_earning: number;
    expense_amount: number;
    status: string;
  };
  invoice?: {
    id: number;
    amount: number;
    paid_amount: number;
    status: string;
    due_date: string;
    description: string;
    type: string;
  };
  client?: {
    id: number;
    name: string;
    phone: string;
    email: string;
  };
}

interface PendingCommissionsResponse {
  items: PendingCommission[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

const PendingCommissionsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const openModal = useModalStore((state) => state.openModal);
  const [selectedItem, setSelectedItem] = useState<PendingCommission | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Infinite query for pending commissions
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery<PendingCommissionsResponse>({
    queryKey: ['pending-commissions'],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await apiClient.get('/pending-items', {
        params: {
          status: 'pending',
          type: 'commission',
          page: pageParam,
          per_page: 20,
        },
      });
      return response.data;
    },
    getNextPageParam: (lastPage) => {
      const { current_page, total_pages } = lastPage.pagination;
      return current_page < total_pages ? current_page + 1 : undefined;
    },
    initialPageParam: 1,
  });

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Format date
  const formatDate = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), {
        addSuffix: true,
        locale: ar,
      });
    } catch {
      return date;
    }
  };

  // Get invoice status badge variant
  const getInvoiceStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'paid':
        return 'default';
      case 'partially_paid':
        return 'secondary';
      case 'overdue':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Get invoice status label
  const getInvoiceStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return 'مدفوعة';
      case 'partially_paid':
        return 'مدفوعة جزئياً';
      case 'pending':
        return 'معلقة';
      case 'overdue':
        return 'متأخرة';
      case 'cancelled':
        return 'ملغاة';
      default:
        return status;
    }
  };

  // Handle Pay Invoice action
  const handlePayInvoice = (item: PendingCommission) => {
    if (!item.invoice) {
      showToast({ type: 'error', title: 'خطأ', message: 'لا توجد فاتورة مرتبطة بهذه العمولة' });
      return;
    }
    const invoice = item.invoice;
    const amountDue = Number((invoice as any).remaining_amount ?? (Number(invoice.amount || 0) - Number(invoice.paid_amount || 0)));
    openModal('recordPayment', {
      invoiceId: invoice.id,
      amountDue,
      clientName: item.client?.name,
    });
  };

  // Handle Edit Expected Amount action
  const handleEditAmount = (item: PendingCommission) => {
    setSelectedItem(item);
    setIsEditModalOpen(true);
  };

  // Handle WhatsApp Reminder action
  const handleWhatsAppReminder = (item: PendingCommission) => {
    if (!item.client?.phone) {
      showToast({ type: 'error', title: 'خطأ', message: 'لا يوجد رقم هاتف للعميل' });
      return;
    }

    const phone = item.client.phone.replace(/[^0-9]/g, '');
    const taskName = item.task?.task_name || 'المهمة';
    const invoiceAmount = item.invoice?.amount || 0;
    const paidAmount = item.invoice?.paid_amount || 0;
    const remaining = invoiceAmount - paidAmount;

    const message = `السلام عليكم ${item.client.name},\n\nنذكركم بالفاتورة المعلقة للمهمة: ${taskName}\n\nالمبلغ المتبقي: ${formatCurrency(remaining)} ر.س\n\nيرجى السداد في أقرب وقت ممكن.\n\nشكراً لكم`;

    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');

    showToast({ type: 'success', title: 'نجح', message: 'تم فتح واتساب' });
  };

  // Flatten all items from pages
  const allItems = data?.pages.flatMap((page) => page.items) || [];
  const totalItems = data?.pages[0]?.pagination.total || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            حدث خطأ أثناء تحميل البيانات: {(error as Error).message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6" dir="rtl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">العمولات المعلقة</h1>
        <p className="text-gray-600 mt-2">
          إجمالي العمولات المعلقة: {totalItems} عمولة
        </p>
      </div>

      {/* Table */}
      {allItems.length === 0 ? (
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">لا توجد عمولات معلقة</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <Table className="border-collapse border border-gray-300">
            <TableHeader>
              <TableRow>
                <TableHead className="text-right border border-gray-300 text-base px-3 py-2">المهمة</TableHead>
                <TableHead className="text-right border border-gray-300 text-base px-3 py-2">العميل</TableHead>
                <TableHead className="text-right border border-gray-300 text-base px-3 py-2">مبلغ الفاتورة</TableHead>
                <TableHead className="text-right border border-gray-300 text-base px-3 py-2">حالة الفاتورة</TableHead>
                <TableHead className="text-right border border-gray-300 text-base px-3 py-2">العمولة المتوقعة</TableHead>
                <TableHead className="text-right border border-gray-300 text-base px-3 py-2">الأيام المعلقة</TableHead>
                <TableHead className="text-right border border-gray-300 text-base px-3 py-2">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allItems.map((item) => (
                <TableRow key={item.id}>
                  {/* Task Name */}
                  <TableCell className="border border-gray-300 text-right text-base px-3 py-2 font-medium">
                    {item.task?.task_name || '-'}
                  </TableCell>

                  {/* Client Name */}
                  <TableCell className="border border-gray-300 text-right text-base px-3 py-2">
                    <div>
                      <div className="font-medium">{item.client?.name || '-'}</div>
                      {item.client?.phone && (
                        <div className="text-base text-black/50">
                          {item.client.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* Invoice Amount */}
                  <TableCell className="border border-gray-300 text-right text-base px-3 py-2">
                    {item.invoice ? (
                      <div>
                        <div className="font-semibold">
                          {formatCurrency(item.invoice.amount)} ر.س
                        </div>
                        <div className="text-base text-black/50">
                          مدفوع: {formatCurrency(item.invoice.paid_amount)} ر.س
                        </div>
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>

                  {/* Invoice Status */}
                  <TableCell className="border border-gray-300 text-right text-base px-3 py-2">
                    {item.invoice ? (
                      <Badge variant={getInvoiceStatusVariant(item.invoice.status)}>
                        {getInvoiceStatusLabel(item.invoice.status)}
                      </Badge>
                    ) : (
                      '-'
                    )}
                  </TableCell>

                  {/* Expected Commission */}
                  <TableCell className="border border-gray-300 text-right text-base px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-green-600">
                        {formatCurrency(item.expected_amount)} ر.س
                      </span>
                    </div>
                  </TableCell>

                  {/* Days Pending */}
                  <TableCell className="border border-gray-300 text-right text-base px-3 py-2">
                    <Badge variant={item.days_pending > 7 ? 'destructive' : 'outline'}>
                      {item.days_pending} يوم
                    </Badge>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="border border-gray-300 text-right text-base px-3 py-2">
                    <div className="flex items-center gap-2">
                      {/* Pay Invoice Button */}
                      <Button
                        size="sm"
                        variant="outline-info"
                        onClick={() => handlePayInvoice(item)}
                        disabled={!item.invoice}
                        title="دفع الفاتورة"
                      >
                        <DollarSign className="h-4 w-4" />
                      </Button>

                      {/* Edit Expected Amount Button */}
                      <Button
                        size="sm"
                        variant="outline-info"
                        onClick={() => handleEditAmount(item)}
                        title="تعديل المبلغ المتوقع"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>

                      {/* WhatsApp Reminder Button */}
                      <Button
                        size="sm"
                        variant="outline-success"
                        onClick={() => handleWhatsAppReminder(item)}
                        disabled={!item.client?.phone}
                        title="إرسال تذكير واتساب"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Load More Button */}
          {hasNextPage && (
            <div className="p-4 text-center border-t">
              <Button
                variant="outline-info"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري التحميل...
                  </>
                ) : (
                  'تحميل المزيد'
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Edit Expected Amount Modal */}
      {selectedItem && (
        <EditExpectedCommissionModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedItem(null);
          }}
          pendingItem={selectedItem}
        />
      )}
    </div>
  );
};

export default PendingCommissionsPage;
