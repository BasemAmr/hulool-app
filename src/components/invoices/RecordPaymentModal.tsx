/**
 * RecordPaymentModal Component
 * 
 * Modal for recording payments against an invoice.
 * Uses the new Invoice Payment API endpoints.
 */

import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { useRecordInvoicePayment } from '../../queries/invoiceQueries';
import { useGetPaymentMethods } from '../../queries/paymentQueries';
import { useModalStore } from '../../stores/modalStore';
import { useToast } from '../../hooks/useToast';
import type { RecordInvoicePaymentPayload, Invoice } from '../../api/types';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { AlertCircle, Loader2 } from 'lucide-react';

interface RecordPaymentModalProps {
  invoiceId?: number;
  invoice?: Invoice;
  amountDue?: number;
  clientId?: number;
  clientName?: string;
}

const RecordPaymentModal = () => {
  const { t } = useTranslation();
  const props = useModalStore((state) => state.props) as RecordPaymentModalProps;
  const closeModal = useModalStore((state) => state.closeModal);

  const { invoiceId, invoice, amountDue, clientName } = props;
  const targetInvoiceId = invoiceId || invoice?.id;

  // Use amountDue from props first (passed from parent), then invoice.remaining_amount, then calculate
  const remainingAmount = amountDue ?? invoice?.remaining_amount ?? (invoice ? Number(invoice.amount) - Number(invoice.paid_amount) : 0);
  const displayClientName = clientName || invoice?.client?.name || '';

  // Fetch available payment methods
  const { data: paymentMethods, isLoading: methodsLoading } = useGetPaymentMethods();

  const { handleSubmit, formState: { errors }, control, watch, setValue } = useForm<RecordInvoicePaymentPayload>({
    defaultValues: {
      amount: Number(remainingAmount) || 0,
      payment_method_id: undefined,
      paid_at: new Date().toISOString().split('T')[0],
      note: '',
      reference_number: ''
    }
  });

  // Sync form amount when remainingAmount changes (handles async prop updates)
  useEffect(() => {
    if (typeof remainingAmount !== 'undefined') {
      setValue('amount', Number(remainingAmount), { shouldValidate: true, shouldDirty: false });
    }
  }, [remainingAmount, setValue]);

  const recordPaymentMutation = useRecordInvoicePayment();
  const watchedAmount = watch('amount');
  const watchedMethodId = watch('payment_method_id');

  // Get selected payment method details
  const selectedMethod = paymentMethods?.find(m => m.id === watchedMethodId);
  const isCashMethod = selectedMethod?.code === 'cash';

  const onSubmit = (data: RecordInvoicePaymentPayload) => {
    if (!targetInvoiceId) return;

    recordPaymentMutation.mutate(
      { invoiceId: targetInvoiceId, payload: data },
      {
        onSuccess: () => {
          closeModal();
        },
      }
    );
  };

  const setFullAmount = () => {
    setValue('amount', Number(remainingAmount), { shouldValidate: true, shouldDirty: true });
  };

  const isOverpayment = watchedAmount > remainingAmount;
  const remainingAfterPayment = remainingAmount - watchedAmount;

  if (!targetInvoiceId) {
    return (
      <BaseModal isOpen={true} onClose={closeModal} title="تسجيل دفعة">
        <div className="text-center py-4">
          <AlertCircle className="mx-auto mb-3 text-danger" size={48} />
          <p className="text-danger">خطأ: لم يتم تحديد الفاتورة</p>
          <Button variant="secondary" onClick={closeModal} className="mt-3">
            إغلاق
          </Button>
        </div>
      </BaseModal>
    );
  }

  return (
    <BaseModal isOpen={true} onClose={closeModal} title="تسجيل دفعة">
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Invoice Summary */}
        <div className="invoice-summary mb-4">
          <div className="summary-row">
            <span className="summary-label">رقم الفاتورة:</span>
            <span className="summary-value">#{targetInvoiceId}</span>
          </div>
          {displayClientName && (
            <div className="summary-row">
              <span className="summary-label">العميل:</span>
              <span className="summary-value">{displayClientName}</span>
            </div>
          )}
          <div className="summary-row highlight">
            <span className="summary-label">المبلغ المتبقي:</span>
            <span className="summary-value text-primary font-bold">
              {remainingAmount.toFixed(2)} ر.س
            </span>
          </div>
        </div>

        {/* Payment Method Selection */}
        <div className="mb-4">
          <label className="form-label font-medium mb-2">طريقة الدفع</label>
          {methodsLoading ? (
            <div className="text-center py-3">
              <Loader2 className="animate-spin mx-auto" size={24} />
              <p className="text-muted small mt-2">جاري تحميل طرق الدفع...</p>
            </div>
          ) : (
            <Controller
              name="payment_method_id"
              control={control}
              rules={{ required: t('common.required') }}
              render={({ field }) => (
                <div className="payment-methods-grid">
                  {paymentMethods?.map((method) => (
                    <div
                      key={method.id}
                      className={`payment-method-card ${field.value === method.id ? 'selected' : ''}`}
                      onClick={() => field.onChange(method.id)}
                    >
                      <div className="method-label">{method.name}</div>
                    </div>
                  ))}
                </div>
              )}
            />
          )}
          {errors.payment_method_id && (
            <div className="text-danger small mt-1">{errors.payment_method_id.message}</div>
          )}
        </div>

        {/* Amount Input */}
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <label className="form-label font-medium mb-0">المبلغ المدفوع</label>
          </div>
          <Controller
            name="amount"
            control={control}
            rules={{
              required: t('common.required'),
              min: { value: 0.01, message: 'المبلغ يجب أن يكون أكبر من صفر' }
            }}
            defaultValue={Number(remainingAmount) || 0}
            render={({ field }) => (
              <Input
                type="number"
                step="0.01"
                {...field}
                value={field.value || ''}
                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : '')}
                error={errors.amount?.message}
              />
            )}
          />

          {/* Payment Preview */}
          {watchedAmount > 0 && (
            <div className={`payment-preview mt-2 ${isOverpayment ? 'warning' : ''}`}>
              {isOverpayment ? (
                <div className="preview-item warning">
                  <AlertCircle size={16} className="ml-1" />
                  <span>المبلغ أكبر من المطلوب! سيتم إضافة {(watchedAmount - remainingAmount).toFixed(2)} ر.س كرصيد للعميل</span>
                </div>
              ) : (
                <div className="preview-item">
                  <span>المتبقي بعد الدفع:</span>
                  <span className={remainingAfterPayment === 0 ? 'text-success font-bold' : ''}>
                    {remainingAfterPayment === 0 ? 'تم السداد الكامل ✓' : `${remainingAfterPayment.toFixed(2)} ر.س`}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Payment Date */}
        <Controller
          name="paid_at"
          control={control}
          rules={{ required: t('common.required') }}
          defaultValue={new Date().toISOString().split('T')[0]}
          render={({ field }) => (
            <Input
              label="تاريخ الدفع"
              type="date"
              {...field}
              error={errors.paid_at?.message}
            />
          )}
        />

        {/* Reference Number (for non-cash payments) */}
        {!isCashMethod && selectedMethod && (
          <Controller
            name="reference_number"
            control={control}
            defaultValue=""
            render={({ field }) => (
              <Input
                label="رقم المرجع / العملية"
                {...field}
                placeholder={
                  selectedMethod?.code === 'bank_transfer' ? 'رقم الحوالة البنكية' :
                    selectedMethod?.code === 'card' ? 'آخر 4 أرقام من البطاقة' :
                      selectedMethod?.code === 'check' ? 'رقم الشيك' : 'رقم المرجع'
                }
              />
            )}
          />
        )}

        {/* Notes */}
        <div className="mb-4">
          <label className="form-label">ملاحظات</label>
          <Controller
            name="note"
            control={control}
            defaultValue=""
            render={({ field }) => (
              <textarea
                className="form-control"
                rows={2}
                placeholder="أي ملاحظات على الدفعة..."
                {...field}
              />
            )}
          />
        </div>

        {/* Footer */}
        <div className="modal-footer-compact">
          <div className="footer-content">
            <div className="footer-left">
              {/* Empty for alignment */}
            </div>
            <div className="footer-right">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={closeModal}
                disabled={recordPaymentMutation.isPending}
                className="me-2"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={recordPaymentMutation.isPending}
              >
                {recordPaymentMutation.isPending ? 'جاري الحفظ...' : 'تسجيل الدفعة'}
              </Button>
            </div>
          </div>
        </div>

        <style>{`
          .invoice-summary {
            background-color: #f8f9fa;
            border-radius: 0.5rem;
            padding: 1rem;
            border: 1px solid #e9ecef;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem 0;
            border-bottom: 1px solid #e9ecef;
          }
          .summary-row:last-child {
            border-bottom: none;
          }
          .summary-row.highlight {
            background-color: #e7f3ff;
            margin: 0.5rem -1rem -1rem -1rem;
            padding: 0.75rem 1rem;
            border-radius: 0 0 0.5rem 0.5rem;
          }
          .summary-label {
            color: #6c757d;
            font-size: 0.875rem;
          }
          .summary-value {
            font-weight: 500;
          }
          
          .payment-methods-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 0.75rem;
          }
          @media (max-width: 576px) {
            .payment-methods-grid {
              grid-template-columns: repeat(2, 1fr);
            }
          }
          .payment-method-card {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 1rem 0.5rem;
            border: 2px solid #e9ecef;
            border-radius: 0.5rem;
            cursor: pointer;
            transition: all 0.2s ease;
            background: white;
          }
          .payment-method-card:hover {
            border-color: var(--color-primary);
            box-shadow: 0 2px 8px rgba(0,123,255,0.15);
          }
          .payment-method-card.selected {
            border-color: var(--color-primary);
            background-color: var(--color-primary-light, #e7f3ff);
          }
          .method-label {
            font-size: 0.9rem;
            font-weight: 500;
            text-align: center;
          }
          
          .payment-preview {
            background-color: #e7f3ff;
            border-radius: 0.375rem;
            padding: 0.75rem;
            font-size: 0.875rem;
          }
          .payment-preview.warning {
            background-color: #fff3cd;
          }
          .preview-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .preview-item.warning {
            color: #856404;
            justify-content: flex-start;
          }
          
          .modal-footer-compact {
            border-top: 1px solid #e9ecef;
            padding: 0.75rem 1rem;
            background-color: #f8f9fa;
            border-radius: 0 0 0.375rem 0.375rem;
          }
          .footer-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .footer-left,
          .footer-right {
            display: flex;
            align-items: center;
          }
        `}</style>
      </form>
    </BaseModal>
  );
};

export default RecordPaymentModal;
