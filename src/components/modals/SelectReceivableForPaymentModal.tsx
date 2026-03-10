import { useState, useEffect, useMemo } from 'react';
import { CreditCard, CheckSquare, Square, CheckCircle2 } from 'lucide-react';
import { useGetPayableInvoices } from '../../queries/invoiceQueries';
import { useModalStore } from '../../stores/modalStore';
import Button from '../ui/Button';
import BaseModal from '../ui/BaseModal';
import { formatDate } from '../../utils/dateUtils';
import { NumberInput } from '../ui/NumberInput';
import { useTranslation } from 'react-i18next';
import type { Invoice } from '../../api/types';

interface SelectReceivableForPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: number;
}

const SelectReceivableForPaymentModal = ({ isOpen, onClose, clientId }: SelectReceivableForPaymentModalProps) => {
  const openModal = useModalStore((state) => state.openModal);
  // Map of invoiceId -> payment amount
  const [selectedAmounts, setSelectedAmounts] = useState<Map<number, number>>(new Map());
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

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedAmounts(new Map());
    }
  }, [isOpen]);

  const selectedCount = selectedAmounts.size;
  const totalPayment = useMemo(
    () => Array.from(selectedAmounts.values()).reduce((sum, amt) => sum + amt, 0),
    [selectedAmounts]
  );

  const isAllSelected = invoices && invoices.length > 0 && selectedAmounts.size === invoices.length;

  const toggleInvoice = (invoice: Invoice) => {
    setSelectedAmounts(prev => {
      const next = new Map(prev);
      if (next.has(invoice.id)) {
        next.delete(invoice.id);
      } else {
        next.set(invoice.id, invoice.remaining_amount);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (!invoices) return;
    if (isAllSelected) {
      setSelectedAmounts(new Map());
    } else {
      const next = new Map<number, number>();
      invoices.forEach(inv => next.set(inv.id, inv.remaining_amount));
      setSelectedAmounts(next);
    }
  };

  const updateAmount = (invoiceId: number, amount: number) => {
    setSelectedAmounts(prev => {
      const next = new Map(prev);
      next.set(invoiceId, amount);
      return next;
    });
  };

  const handleProceedToPayment = () => {
    if (selectedCount === 0) return;

    const selectedInvoices = invoices?.filter(inv => selectedAmounts.has(inv.id)) || [];

    if (selectedCount === 1) {
      // Single invoice — use existing single payment flow
      const invoice = selectedInvoices[0];
      const amount = selectedAmounts.get(invoice.id) || 0;
      onClose();
      openModal('recordPayment', {
        invoice,
        invoiceId: invoice.id,
        initialPaymentAmount: amount,
      });
    } else {
      // Multiple invoices — use batch payment flow
      const allocations = selectedInvoices.map(inv => ({
        invoice: inv,
        amount: selectedAmounts.get(inv.id) || 0,
      }));
      onClose();
      openModal('recordBatchPayment', {
        clientId,
        allocations,
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

  // Validate: all selected amounts must be > 0 and <= remaining
  const hasValidAllocations = useMemo(() => {
    if (selectedCount === 0) return false;
    for (const [invoiceId, amount] of selectedAmounts) {
      if (amount <= 0) return false;
      const inv = invoices?.find(i => i.id === invoiceId);
      if (inv && amount > inv.remaining_amount) return false;
    }
    return true;
  }, [selectedAmounts, selectedCount, invoices]);

  if (!isOpen) return null;

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="اختيار الفواتير للسداد">
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
            {/* Header with select all */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-black">اختر فاتورة واحدة أو أكثر للسداد:</p>
              <button
                type="button"
                onClick={toggleAll}
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
              >
                {isAllSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                {isAllSelected ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
              </button>
            </div>

            {/* Invoice list */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {invoices.map((invoice) => {
                const isSelected = selectedAmounts.has(invoice.id);
                const currentAmount = selectedAmounts.get(invoice.id) || 0;

                return (
                  <div
                    key={invoice.id}
                    className={`p-4 rounded-lg border transition-colors ${isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                      }`}
                  >
                    {/* Clickable header area */}
                    <div
                      className="flex justify-between items-start gap-3 cursor-pointer"
                      onClick={() => toggleInvoice(invoice)}
                    >
                      <div className="flex items-start gap-2 flex-1">
                        <div className="mt-0.5">
                          {isSelected
                            ? <CheckCircle2 size={20} className="text-primary" />
                            : <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                          }
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm">#{invoice.id}</span>
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

                    {/* Inline amount editor when selected */}
                    {isSelected && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <NumberInput
                          name={`amount_${invoice.id}`}
                          label="مبلغ السداد"
                          value={currentAmount}
                          onChange={(e) => updateAmount(invoice.id, Number(e.target.value))}
                          max={invoice.remaining_amount}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Summary footer */}
        {selectedCount > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-black">
                {selectedCount === 1 ? 'فاتورة واحدة محددة' : `${selectedCount} فواتير محددة`}
              </span>
              <span className="font-bold text-primary text-base">
                الإجمالي: {formatCurrency(totalPayment)}
              </span>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            onClick={handleProceedToPayment}
            disabled={!hasValidAllocations}
          >
            <CreditCard size={16} className="mr-2" />
            {selectedCount > 1 ? `سداد ${selectedCount} فواتير` : 'متابعة للسداد'}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};

export default SelectReceivableForPaymentModal;
