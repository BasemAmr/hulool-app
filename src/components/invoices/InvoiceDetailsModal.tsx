/**
 * InvoiceDetailsModal Component
 * 
 * Modal for displaying full invoice details including:
 * - Invoice header info (ID, client, task, dates)
 * - Financial summary (amount, paid, remaining)
 * - Payment history with dates and methods
 * - Notes field display
 */

import { useModalStore } from '../../stores/modalStore';
import { useGetInvoice } from '../../queries/invoiceQueries';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Spinner } from '../ui/spinner';
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
import WhatsAppIcon from '../ui/WhatsAppIcon';
import { sendPaymentReminder } from '../../utils/whatsappUtils';

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
          <AlertCircle className="mx-auto mb-3 text-red-500" size={48} />
          <p className="text-red-600">خطأ: لم يتم تحديد الفاتورة</p>
          <Button variant="secondary" onClick={closeModal} className="mt-3">
            إغلاق
          </Button>
        </div>
      </BaseModal>
    );
  }

  const getStatusBadge = (status: string, paidAmount: number, totalAmount: number) => {
    if (paidAmount >= totalAmount) {
      return <Badge variant="default" className="text-xs bg-green-500">مدفوعة</Badge>;
    }
    if (paidAmount > 0) {
      return <Badge variant="secondary" className="text-xs bg-yellow-500 text-black">جزئية</Badge>;
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
          <p className="text-gray-500 mt-3 text-sm">جاري تحميل البيانات...</p>
        </div>
      ) : error ? (
        <div className="text-center py-4">
          <AlertCircle className="mx-auto mb-3 text-red-500" size={48} />
          <p className="text-red-600">حدث خطأ في تحميل بيانات الفاتورة</p>
          <Button variant="secondary" onClick={closeModal} className="mt-3">
            إغلاق
          </Button>
        </div>
      ) : invoice ? (
        <div className="space-y-4">
          {/* Header Info */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-gray-400" />
                <span className="text-gray-600">رقم الفاتورة:</span>
                <span className="font-bold font-mono">#{invoice.id}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">الحالة:</span>
                {getStatusBadge(invoice.status, Number(invoice.paid_amount), Number(invoice.amount))}
              </div>
              <div className="flex items-center gap-2">
                <User size={16} className="text-gray-400" />
                <span className="text-gray-600">العميل:</span>
                <span className="font-medium">{invoice.client?.name || `عميل #${invoice.client_id}`}</span>
              </div>
              {invoice.task && (
                <div className="flex items-center gap-2">
                  <Briefcase size={16} className="text-gray-400" />
                  <span className="text-gray-600">المهمة:</span>
                  <span className="font-medium">{invoice.task.task_name}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-gray-400" />
                <span className="text-gray-600">تاريخ الإنشاء:</span>
                <span>{new Date(invoice.created_at).toLocaleDateString('en-CA')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-gray-400" />
                <span className="text-gray-600">تاريخ الاستحقاق:</span>
                <span>{new Date(invoice.due_date).toLocaleDateString('en-CA')}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          {invoice.description && (
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <p className="text-sm text-gray-700">
                <span className="font-medium text-gray-900">الوصف: </span>
                {invoice.description}
              </p>
            </div>
          )}

          {/* Notes */}
          {invoice.notes && (
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <p className="text-sm text-gray-700">
                <span className="font-medium text-gray-900">ملاحظات: </span>
                {invoice.notes}
              </p>
            </div>
          )}

          {/* Financial Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign size={14} className="text-blue-600" />
                <span className="text-xs text-gray-600">المبلغ الإجمالي</span>
              </div>
              <p className="text-lg font-bold text-blue-700">
                {new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(invoice.amount))}
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 border border-green-200">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle size={14} className="text-green-600" />
                <span className="text-xs text-gray-600">المدفوع</span>
              </div>
              <p className="text-lg font-bold text-green-700">
                {new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(invoice.paid_amount))}
              </p>
            </div>
            <div className={`rounded-lg p-3 border ${Number(invoice.remaining_amount) > 0 ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle size={14} className={Number(invoice.remaining_amount) > 0 ? 'text-orange-600' : 'text-gray-400'} />
                <span className="text-xs text-gray-600">المتبقي</span>
              </div>
              <p className={`text-lg font-bold ${Number(invoice.remaining_amount) > 0 ? 'text-orange-700' : 'text-gray-500'}`}>
                {new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(invoice.remaining_amount))}
              </p>
            </div>
          </div>

          {/* Payment History */}
          <div>
            <h3 className="font-semibold text-sm text-gray-900 mb-2 flex items-center gap-2">
              <CreditCard size={16} />
              سجل الدفعات ({invoice.payments?.length || 0})
            </h3>
            {invoice.payments && invoice.payments.length > 0 ? (
              <Table className="border-collapse border border-gray-300">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-start border border-gray-300 text-xs px-2 py-1">#</TableHead>
                    <TableHead className="text-start border border-gray-300 text-xs px-2 py-1">المبلغ</TableHead>
                    <TableHead className="text-start border border-gray-300 text-xs px-2 py-1">الطريقة</TableHead>
                    <TableHead className="text-start border border-gray-300 text-xs px-2 py-1">التاريخ</TableHead>
                    <TableHead className="text-start border border-gray-300 text-xs px-2 py-1">ملاحظة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.payments.map((payment: any) => (
                    <TableRow key={payment.id}>
                      <TableCell className="border border-gray-300 text-start text-xs px-2 py-1 font-mono">
                        {payment.id}
                      </TableCell>
                      <TableCell className="border border-gray-300 text-start text-xs px-2 py-1 font-medium">
                        {new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(payment.amount || payment.credit || 0))}
                      </TableCell>
                      <TableCell className="border border-gray-300 text-start text-xs px-2 py-1">
                        {payment.payment_method?.name || payment.payment_method_id || '-'}
                      </TableCell>
                      <TableCell className="border border-gray-300 text-start text-xs px-2 py-1">
                        {new Date(payment.paid_at || payment.transaction_date || payment.created_at).toLocaleDateString('en-CA')}
                      </TableCell>
                      <TableCell className="border border-gray-300 text-start text-xs px-2 py-1 text-gray-600">
                        {payment.note || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-4 bg-gray-50 rounded border border-gray-200">
                <p className="text-sm text-gray-500">لا توجد دفعات مسجلة</p>
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
                    className="bg-green-600 hover:bg-green-700"
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
