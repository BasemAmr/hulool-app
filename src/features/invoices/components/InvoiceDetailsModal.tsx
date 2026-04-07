/**
 * InvoiceDetailsModal Component
 * 
 * Modal for displaying full invoice details including:
 * - Invoice header info (ID, client, task, dates)
 * - Financial summary (amount, paid, remaining)
 * - Payment history with dates and methods
 * - Notes field display
 */

import { useModalStore } from '@/shared/stores/modalStore';
import { useGetInvoice } from '@/features/invoices/api/invoiceQueries';
import BaseModal from '@/shared/ui/layout/BaseModal';
import Button from '@/shared/ui/primitives/Button';
import { Badge } from '@/shared/ui/shadcn/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/shadcn/table';
import { Spinner } from '@/shared/ui/shadcn/spinner';
import {
  FileText,
  User,
  Briefcase,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  CreditCard
} from 'lucide-react';
import WhatsAppIcon from '@/shared/ui/icons/WhatsAppIcon';
import { sendPaymentReminder } from '@/shared/utils/whatsappUtils';

interface InvoiceDetailsModalProps {
  invoiceId?: number;
  isEmployeeView?: boolean;
}

const InvoiceDetailsModal = () => {
  const props = useModalStore((state) => state.props) as InvoiceDetailsModalProps;
  const closeModal = useModalStore((state) => state.closeModal);
  const openModal = useModalStore((state) => state.openModal);

  const { invoiceId, isEmployeeView = false } = props;

  // Fetch invoice data
  const { data: invoice, isLoading, error } = useGetInvoice(invoiceId || 0, !!invoiceId);

  if (!invoiceId) {
    return (
      <BaseModal isOpen={true} onClose={closeModal} title="تفاصيل الفاتورة">
        <div className="text-center py-4">
          <AlertCircle className="mx-auto mb-3 text-status-danger-text" size={48} />
          <p className="text-status-danger-text">خطأ: لم يتم تحديد الفاتورة</p>
          <Button variant="secondary" onClick={closeModal} className="mt-3">
            إغلاق
          </Button>
        </div>
      </BaseModal>
    );
  }

  const getStatusBadge = (status: string, paidAmount: number, totalAmount: number) => {
    if (paidAmount >= totalAmount) {
      return <Badge variant="default" className="text-xs bg-status-success-bg0">مدفوعة</Badge>;
    }
    if (paidAmount > 0) {
      return <Badge variant="secondary" className="text-xs bg-status-warning-bg0 text-text-primary">جزئية</Badge>;
    }
    if (status === 'draft') {
      return <Badge variant="secondary" className="text-xs">مسودة</Badge>;
    }
    if (status === 'overdue') {
      return <Badge variant="destructive" className="text-xs">متأخرة</Badge>;
    }
    return <Badge variant="default" className="text-xs">معلقة</Badge>;
  };

  const handleRecordPayment = () => {
    if (invoice && invoice.remaining_amount > 0) {
      openModal('recordPayment', {
        invoiceId: invoice.id,
        amountDue: invoice.remaining_amount,
        clientName: invoice.client?.name
      });
    }
  };

  const handleWhatsAppReminder = () => {
    if (!invoice?.client?.phone) return;

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount);
    };

    const formattedAmount = formatCurrency(Number(invoice.remaining_amount));
    sendPaymentReminder(
      invoice.client.phone,
      invoice.client.name || `عميل #${invoice.client_id}`,
      formattedAmount
    );
  };

  return (
    <BaseModal
      isOpen={true}
      onClose={closeModal}
      title="تفاصيل الفاتورة"
    >
      {isLoading ? (
        <div className="text-center py-8">
          <Spinner size="lg" />
          <p className="text-text-muted mt-3 text-sm">جاري تحميل البيانات...</p>
        </div>
      ) : error ? (
        <div className="text-center py-4">
          <AlertCircle className="mx-auto mb-3 text-status-danger-text" size={48} />
          <p className="text-status-danger-text">حدث خطأ في تحميل بيانات الفاتورة</p>
          <Button variant="secondary" onClick={closeModal} className="mt-3">
            إغلاق
          </Button>
        </div>
      ) : invoice ? (
        <div className="space-y-4">
          {/* Header Info */}
          <div className="bg-background rounded-lg p-4 border border-border-default">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-text-muted" />
                <span className="text-text-secondary">رقم الفاتورة:</span>
                <span className="font-bold font-mono">#{invoice.id}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-text-secondary">الحالة:</span>
                {getStatusBadge(invoice.status, Number(invoice.paid_amount), Number(invoice.amount))}
              </div>
              <div className="flex items-center gap-2">
                <User size={16} className="text-text-muted" />
                <span className="text-text-secondary">العميل:</span>
                <span className="font-medium">{invoice.client?.name || `عميل #${invoice.client_id}`}</span>
              </div>
              {invoice.task && (
                <div className="flex items-center gap-2">
                  <Briefcase size={16} className="text-text-muted" />
                  <span className="text-text-secondary">المهمة:</span>
                  <span className="font-medium">{invoice.task.task_name}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-text-muted" />
                <span className="text-text-secondary">تاريخ الإنشاء:</span>
                <span>{new Date(invoice.created_at).toLocaleDateString('en-CA')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-text-muted" />
                <span className="text-text-secondary">تاريخ الاستحقاق:</span>
                <span>{new Date(invoice.due_date).toLocaleDateString('en-CA')}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          {invoice.description && (
            <div className="bg-status-info-bg rounded-lg p-3 border border-status-info-border">
              <p className="text-sm text-text-primary">
                <span className="font-medium text-text-primary">الوصف: </span>
                {invoice.description}
              </p>
            </div>
          )}

          {/* Notes */}
          {invoice.notes && (
            <div className="bg-background rounded-lg p-3 border border-border-default">
              <p className="text-sm text-text-primary">
                <span className="font-medium text-text-primary">ملاحظات: </span>
                {invoice.notes}
              </p>
            </div>
          )}

          {/* Financial Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-status-info-bg rounded-lg p-3 border border-status-info-border">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign size={14} className="text-status-info-text" />
                <span className="text-xs text-text-secondary">المبلغ الإجمالي</span>
              </div>
              <p className="text-lg font-bold text-status-info-text">
                {new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(invoice.amount))}
              </p>
            </div>
            <div className="bg-status-success-bg rounded-lg p-3 border border-status-success-border">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle size={14} className="text-status-success-text" />
                <span className="text-xs text-text-secondary">المدفوع</span>
              </div>
              <p className="text-lg font-bold text-status-success-text">
                {new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(invoice.paid_amount))}
              </p>
            </div>
            <div className={`rounded-lg p-3 border ${Number(invoice.remaining_amount) > 0 ? 'bg-orange-50 border-orange-200' : 'bg-background border-border-default'}`}>
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle size={14} className={Number(invoice.remaining_amount) > 0 ? 'text-orange-600' : 'text-text-muted'} />
                <span className="text-xs text-text-secondary">المتبقي</span>
              </div>
              <p className={`text-lg font-bold ${Number(invoice.remaining_amount) > 0 ? 'text-orange-700' : 'text-text-muted'}`}>
                {new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(invoice.remaining_amount))}
              </p>
            </div>
          </div>

          {/* Payment History */}
          <div>
            <h3 className="font-semibold text-sm text-text-primary mb-2 flex items-center gap-2">
              <CreditCard size={16} />
              سجل الدفعات ({invoice.payments?.length || 0})
            </h3>
            {invoice.payments && invoice.payments.length > 0 ? (
              <Table className="border-collapse border border-border-strong">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-start border border-border-strong text-xs px-2 py-1">#</TableHead>
                    <TableHead className="text-start border border-border-strong text-xs px-2 py-1">المبلغ</TableHead>
                    <TableHead className="text-start border border-border-strong text-xs px-2 py-1">الطريقة</TableHead>
                    <TableHead className="text-start border border-border-strong text-xs px-2 py-1">التاريخ</TableHead>
                    <TableHead className="text-start border border-border-strong text-xs px-2 py-1">ملاحظة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.payments.map((payment: any) => (
                    <TableRow key={payment.id}>
                      <TableCell className="border border-border-strong text-start text-xs px-2 py-1 font-mono">
                        {payment.id}
                      </TableCell>
                      <TableCell className="border border-border-strong text-start text-xs px-2 py-1 font-medium">
                        {new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(payment.amount || payment.credit || 0))}
                      </TableCell>
                      <TableCell className="border border-border-strong text-start text-xs px-2 py-1">
                        {payment.payment_method?.name || payment.payment_method_id || '-'}
                      </TableCell>
                      <TableCell className="border border-border-strong text-start text-xs px-2 py-1">
                        {new Date(payment.paid_at || payment.transaction_date || payment.created_at).toLocaleDateString('en-CA')}
                      </TableCell>
                      <TableCell className="border border-border-strong text-start text-xs px-2 py-1 text-text-secondary">
                        {payment.note || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-4 bg-background rounded border border-border-default">
                <p className="text-sm text-text-muted">لا توجد دفعات مسجلة</p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex justify-between items-center pt-3 border-t">
            <Button variant="secondary" onClick={closeModal}>
              إغلاق
            </Button>
            {Number(invoice.remaining_amount) > 0 && (
              isEmployeeView ? (
                invoice.client?.phone && (
                  <Button
                    variant="primary"
                    onClick={handleWhatsAppReminder}
                    className="bg-status-success-text hover:bg-status-success-border"
                  >
                    <WhatsAppIcon size={16} className="me-1" />
                    إرسال تذكير دفع
                  </Button>
                )
              ) : (
                <Button variant="primary" onClick={handleRecordPayment}>
                  <DollarSign size={16} className="me-1" />
                  تسجيل دفعة
                </Button>
              )
            )}
          </div>
        </div>
      ) : null}
    </BaseModal>
  );
};

export default InvoiceDetailsModal;
