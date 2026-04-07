/**
 * RecordBatchPaymentModal Component
 *
 * Modal for recording a single payment split across multiple invoices.
 * Uses the batch payment API endpoint for atomic processing.
 */

import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useRecordBatchPayment } from '@/features/invoices/api/invoiceQueries';
import { useGetPaymentMethods } from '@/features/receivables/api/paymentQueries';
import { useModalStore } from '@/shared/stores/modalStore';
import { useToast } from '@/shared/hooks/useToast';
import type { Invoice } from '@/api/types';
import BaseModal from '@/shared/ui/layout/BaseModal';
import Button from '@/shared/ui/primitives/Button';
import { DateInput } from '@/shared/ui/primitives/DateInput';
import Input from '@/shared/ui/primitives/Input';
import { Loader2 } from 'lucide-react';
import { TOAST_MESSAGES } from '@/shared/constants/toastMessages';

interface BatchPaymentFormData {
  payment_method_id: number;
  paid_at: string;
  note: string;
  reference_number: string;
}

interface RecordBatchPaymentModalProps {
  clientId: number;
  allocations: { invoice: Invoice; amount: number }[];
}

const RecordBatchPaymentModal = () => {
  const { t } = useTranslation();
  const props = useModalStore((state) => state.props) as RecordBatchPaymentModalProps;
  const closeModal = useModalStore((state) => state.closeModal);
  const { success } = useToast();

  const { clientId, allocations } = props;

  const totalAmount = allocations.reduce((sum, a) => sum + a.amount, 0);

  // Fetch available payment methods
  const { data: paymentMethods, isLoading: methodsLoading } = useGetPaymentMethods();

  const { handleSubmit, formState: { errors }, control, watch } = useForm<BatchPaymentFormData>({
    defaultValues: {
      payment_method_id: undefined as unknown as number,
      paid_at: new Date().toISOString().split('T')[0],
      note: '',
      reference_number: ''
    }
  });

  const batchPaymentMutation = useRecordBatchPayment();
  const watchedMethodId = watch('payment_method_id');

  const selectedMethod = paymentMethods?.find(m => m.id === watchedMethodId);
  const isCashMethod = selectedMethod?.code === 'cash';

  const onSubmit = (data: BatchPaymentFormData) => {
    batchPaymentMutation.mutate(
      {
        client_id: clientId,
        payment_method_id: data.payment_method_id,
        paid_at: data.paid_at,
        note: data.note || undefined,
        reference_number: data.reference_number || undefined,
        allocations: allocations.map(a => ({
          invoice_id: a.invoice.id,
          amount: a.amount,
        })),
      },
      {
        onSuccess: () => {
          success(TOAST_MESSAGES.INVOICE_PAYMENT_RECORDED || 'تم تسجيل الدفعات بنجاح');
          closeModal();
        },
      }
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2
    }).format(Number(amount) || 0);
  };

  return (
    <BaseModal isOpen={true} onClose={closeModal} title="تسجيل دفعة لعدة فواتير">
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Allocations Summary Table */}
        <div className="invoice-summary mb-4">
          <div className="text-sm font-medium text-text-primary mb-2">
            سيتم سداد {allocations.length} فواتير:
          </div>
          <div className="space-y-1">
            {allocations.map((a) => (
              <div key={a.invoice.id} className="summary-row">
                <div className="flex-1">
                  <span className="text-sm font-medium">#{a.invoice.id}</span>
                  <span className="text-xs text-text-secondary mr-2">
                    {a.invoice.description || 'بدون وصف'}
                  </span>
                </div>
                <span className="text-sm font-semibold text-primary">
                  {formatCurrency(a.amount)}
                </span>
              </div>
            ))}
          </div>
          <div className="summary-row highlight">
            <span className="summary-label font-bold">إجمالي الدفع:</span>
            <span className="summary-value text-primary font-bold text-base">
              {formatCurrency(totalAmount)}
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
                      <div className="method-label">
                        {method.name === 'بنكي' ? 'تحويل بنكي' :
                          method.name === 'شبكة' ? 'شبكة بنكية' :
                            method.name === 'نقد' ? 'دفع نقدي' :
                              method.name}
                      </div>
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

        {/* Date */}
        <div className="mb-4">
          <Controller
            name="paid_at"
            control={control}
            rules={{ required: t('common.required') }}
            defaultValue={new Date().toISOString().split('T')[0]}
            render={({ field }) => (
              <DateInput
                name={field.name}
                label="تاريخ الدفع"
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                error={errors.paid_at?.message}
              />
            )}
          />
        </div>

        {/* Reference Number (for non-cash) */}
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
                className="form-control w-100"
                rows={2}
                style={{ width: '100%', resize: 'vertical' }}
                placeholder="أي ملاحظات على الدفعة..."
                {...field}
              />
            )}
          />
        </div>

        {/* Footer */}
        <div className="modal-footer-compact">
          <div className="footer-content">
            <div className="footer-left" />
            <div className="footer-right">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={closeModal}
                disabled={batchPaymentMutation.isPending}
                className="me-2"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={batchPaymentMutation.isPending}
              >
                {batchPaymentMutation.isPending
                  ? 'جاري الحفظ...'
                  : `تسجيل دفعة ${formatCurrency(totalAmount)}`}
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

export default RecordBatchPaymentModal;
