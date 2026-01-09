import { useState, useEffect } from 'react';
import { CreditCard } from 'lucide-react';
import { useGetPayableInvoices } from '../../queries/invoiceQueries';
import { useModalStore } from '../../stores/modalStore';
import Button from '../ui/Button';
import BaseModal from '../ui/BaseModal';
import { formatDate } from '../../utils/dateUtils';
import { NumberInput } from '../ui/NumberInput';
import { useTranslation } from 'react-i18next';

interface SelectReceivableForPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: number;
}

const SelectReceivableForPaymentModal = ({ isOpen, onClose, clientId }: SelectReceivableForPaymentModalProps) => {
  const openModal = useModalStore((state) => state.openModal);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const { t } = useTranslation();

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Use Invoice Query instead of Receivable Query
  const { data: invoices, isLoading } = useGetPayableInvoices(clientId);

  const selectedInvoice = invoices?.find(inv => inv.id === selectedInvoiceId);

  useEffect(() => {
    if (!isOpen) {
      setSelectedInvoiceId(null);
      setPaymentAmount(0); // Reset payment amount when modal closes
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedInvoice) {
      setPaymentAmount(selectedInvoice.remaining_amount); // Set default payment amount to remaining
    } else {
      setPaymentAmount(0);
    }
  }, [selectedInvoice]);

  const handleInvoiceSelect = (invoiceId: number) => {
    setSelectedInvoiceId(invoiceId);
  };

  const handleProceedToPayment = () => {
    if (selectedInvoice && paymentAmount > 0) {
      onClose();
      // Open the invoice payment modal with correct data structure
      openModal('recordPayment', {
        invoice: selectedInvoice,
        invoiceId: selectedInvoice.id,
        initialPaymentAmount: paymentAmount, // Pass the selected payment amount
      });
    }
  };

  const formatCurrency = (amount: number) => {
    const numAmount = Number(amount) || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2
    }).format(numAmount);
  };

  if (!isOpen) return null;

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="اختيار الفاتورة للسداد">
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-4">
            <div className="inline-block animate-spin text-primary">
              <div className="h-6 w-6 border-3 border-primary border-t-transparent rounded-full"></div>
            </div>
          </div>
        ) : !invoices || invoices.length === 0 ? (
          <div className="text-center text-muted-foreground py-4">
            <p>لا توجد فواتير قابلة للسداد لهذا العميل</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-black">يرجى اختيار الفاتورة التي تريد سدادها:</p>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${selectedInvoiceId === invoice.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                    }`}
                  onClick={() => handleInvoiceSelect(Number(invoice.id))}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">#{invoice.invoice_number}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${invoice.status === 'paid' ? 'bg-green-100 text-green-700' :
                            invoice.status === 'partially_paid' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                          }`}>
                          {invoice.status === 'paid' ? 'مدفوعة' :
                            invoice.status === 'partially_paid' ? 'مدفوعة جزئياً' : 'غير مدفوعة'}
                        </span>
                      </div>
                      <h6 className="font-semibold text-black text-sm mt-1">{invoice.description || 'بدون وصف'}</h6>
                      <small className="text-muted-foreground text-xs block mt-1">
                        تاريخ الاستحقاق: {formatDate(invoice.due_date)}
                      </small>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-black text-sm">
                        {formatCurrency(invoice.total_amount || invoice.amount || 0)}
                      </div>
                      <small className="text-green-600 text-xs block">
                        مدفوع: {formatCurrency(invoice.paid_amount || 0)}
                      </small>
                      <div className="font-semibold text-primary text-sm mt-1">
                        متبقي: {formatCurrency(invoice.remaining_amount)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedInvoice && (
          <div className="mb-4">
            <NumberInput
              name="payment_amount"
              label={t('receivables.paymentAmount')}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(Number(e.target.value))}
              max={selectedInvoice.remaining_amount}
            />
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            onClick={handleProceedToPayment}
            disabled={!selectedInvoiceId || paymentAmount <= 0 || paymentAmount > (selectedInvoice?.remaining_amount || 0)}
          >
            <CreditCard size={16} className="mr-2" />
            متابعة للسداد
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};

export default SelectReceivableForPaymentModal;
