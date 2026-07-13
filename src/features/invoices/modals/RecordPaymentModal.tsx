/**
 * RecordPaymentModal Component
 *
 * Modal for recording payments against an invoice.
 * Uses the unified transaction modal layout pattern.
 * Payment method is hardcoded to cash (always first).
 */

import { useState, useEffect, useMemo, type ChangeEvent } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useRecordInvoicePayment } from '@/features/invoices/api/invoiceQueries';
import { useGetPaymentMethods } from '@/features/receivables/api/paymentQueries';
import { useModalStore } from '@/shared/stores/modalStore';
import { useToast } from '@/shared/hooks/useToast';
import type { RecordInvoicePaymentPayload, Invoice } from '@/api/types';
import BaseModal from '@/shared/ui/layout/BaseModal';
import Button from '@/shared/ui/primitives/Button';
import { NumberInput } from '@/shared/ui/primitives/NumberInput';
import { DateInput } from '@/shared/ui/primitives/DateInput';
import { Card, CardContent } from '@/shared/ui/shadcn/card';
import { AlertCircle, Loader2, CheckCircle2, CircleDashed, ArrowLeftRight } from 'lucide-react';
import { TOAST_MESSAGES } from '@/shared/constants/toastMessages';
import TreasuryAccountPaymentPicker from '@/features/invoices/components/TreasuryAccountPaymentPicker';
import { useGetMyTreasuryAccounts } from '@/features/financials/api/treasuryQueries';

// ========================================
// Types
// ========================================

interface RecordPaymentModalProps {
  invoiceId?: number;
  invoice?: Invoice;
  amountDue?: number;
  clientId?: number;
  clientName?: string;
  initialPaymentAmount?: number;
}

// ========================================
// Helpers
// ========================================

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

// ========================================
// Component
// ========================================

const RecordPaymentModal = () => {
  const { t } = useTranslation();
  const props = useModalStore((state) => state.props) as RecordPaymentModalProps;
  const closeModal = useModalStore((state) => state.closeModal);
  const { success, error: toastError } = useToast();

  const { invoiceId, invoice, amountDue, clientName, initialPaymentAmount } = props;
  const targetInvoiceId = invoiceId || invoice?.id;

  // Use amountDue from props first, then invoice.remaining_amount, then calculate
  const remainingAmount =
    amountDue ??
    invoice?.remaining_amount ??
    (invoice ? Number(invoice.amount) - Number(invoice.paid_amount) : 0);
  const displayClientName = clientName || invoice?.client?.name || '';

  // ---- Payment methods: find cash method ID ----
  const { data: paymentMethods, isLoading: methodsLoading } = useGetPaymentMethods();
  const cashMethodId = useMemo(() => {
    if (!paymentMethods) return undefined;
    // Cash is always first; fall back to code-based lookup
    const cashMethod = paymentMethods.find((m) => m.code === 'cash') ?? paymentMethods[0];
    return cashMethod?.id;
  }, [paymentMethods]);

  // ---- Treasury accounts: used to resolve selected treasury name ----
  const { data: treasuryAccounts } = useGetMyTreasuryAccounts();

  // ---- Form ----
  const {
    handleSubmit,
    formState: { errors, isValid },
    control,
    watch,
    setValue,
  } = useForm<RecordInvoicePaymentPayload>({
    mode: 'onChange',
    defaultValues: {
      amount: typeof initialPaymentAmount !== 'undefined' ? Number(initialPaymentAmount) : Number(remainingAmount) || 0,
      payment_method_id: cashMethodId as unknown as number,
      treasury_account_id: undefined as unknown as number,
      paid_at: new Date().toISOString().split('T')[0],
      note: '',
    },
  });

  // Set payment_method_id once cashMethodId resolves
  useEffect(() => {
    if (cashMethodId) {
      setValue('payment_method_id', cashMethodId, { shouldValidate: true });
    }
  }, [cashMethodId, setValue]);

  // Sync form amount when remainingAmount changes (only if initialPaymentAmount wasn't provided)
  useEffect(() => {
    if (typeof remainingAmount !== 'undefined' && typeof initialPaymentAmount === 'undefined') {
      setValue('amount', Number(remainingAmount), { shouldValidate: true, shouldDirty: false });
    }
  }, [remainingAmount, initialPaymentAmount, setValue]);

  // ---- Watched fields ----
  const watchedAmount = watch('amount');
  const watchedTreasuryId = watch('treasury_account_id');

  // ---- Treasury name tracking ----
  const [treasuryName, setTreasuryName] = useState('');

  useEffect(() => {
    if (watchedTreasuryId && treasuryAccounts) {
      const account = treasuryAccounts.find((a) => a.id === watchedTreasuryId);
      setTreasuryName(account?.name || '');
    } else {
      setTreasuryName('');
    }
  }, [watchedTreasuryId, treasuryAccounts]);

  // ---- Notes: editable textarea with auto-generated content pre-filled ----
  const autoNotes = displayClientName && treasuryName
    ? `من العميل: ${displayClientName}\nإلى حساب: ${treasuryName}`
    : '';
  const [editableNotes, setEditableNotes] = useState('');
  // Track whether user has manually edited notes
  const [userEditedNotes, setUserEditedNotes] = useState(false);

  // Auto-fill notes when autoNotes changes (only if user hasn't edited yet)
  useEffect(() => {
    if (!userEditedNotes) {
      setEditableNotes(autoNotes);
    }
  }, [autoNotes, userEditedNotes]);

  const handleNotesChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setEditableNotes(e.target.value);
    setUserEditedNotes(true);
  };

  // ---- Overpayment check ----
  const isOverpayment = watchedAmount > remainingAmount;
  const remainingAfterPayment = remainingAmount - watchedAmount;

  // ---- Submit ----
  const recordPaymentMutation = useRecordInvoicePayment();

  const onSubmit = (data: RecordInvoicePaymentPayload) => {
    if (!targetInvoiceId) return;

    // Send auto-generated note to backend
    const payload: RecordInvoicePaymentPayload = {
      ...data,
      note: editableNotes || undefined,
    };

    recordPaymentMutation.mutate(
      { invoiceId: targetInvoiceId, payload },
      {
        onSuccess: () => {
          success(TOAST_MESSAGES.INVOICE_PAYMENT_RECORDED);
          closeModal();
        },
        onError: (err: any) => {
          toastError(err?.message || 'حدث خطأ أثناء تسجيل الدفعة');
        },
      }
    );
  };

  // ---- Section readiness ----
  const treasuryReady = !!watchedTreasuryId;
  const detailsReady = !!watchedAmount && !!watch('paid_at');
  const canSubmit = isValid && !!watchedTreasuryId && !!watchedAmount;

  // ---- Error guard ----
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

  if (methodsLoading) {
    return (
      <BaseModal isOpen={true} onClose={closeModal} title="تسجيل دفعة">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin" size={32} />
        </div>
      </BaseModal>
    );
  }

  // ---- Render ----
  return (
    <BaseModal isOpen={true} onClose={closeModal} title="تسجيل دفعة">
      <div dir="rtl" className="space-y-5">
        {/* ============ INVOICE INFO ============ */}
        <section>
          <div className="flex items-center gap-2 mb-2.5">
            <CheckCircle2 className="h-4 w-4 text-status-success-text shrink-0" />
            <span className="text-sm font-bold text-text-primary">الفاتورة</span>
          </div>
          <div className="rounded-lg border border-border bg-bg-surface-muted p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-secondary">رقم الفاتورة</span>
              <span className="text-sm font-bold text-text-primary">#{targetInvoiceId}</span>
            </div>
            {displayClientName && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-secondary">العميل</span>
                <span className="text-sm font-bold text-text-primary">{displayClientName}</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-border pt-1.5">
              <span className="text-xs text-text-secondary">المبلغ المتبقي</span>
              <span className="text-sm font-extrabold text-primary-500">
                {formatCurrency(remainingAmount)} SAR
              </span>
            </div>
          </div>
        </section>

        <div className="border-t border-border" />

        {/* ============ TREASURY ACCOUNT ============ */}
        <section>
          <div className="flex items-center gap-2 mb-2.5">
            {treasuryReady ? (
              <CheckCircle2 className="h-4 w-4 text-status-success-text shrink-0" />
            ) : (
              <CircleDashed className="h-4 w-4 text-text-secondary shrink-0" />
            )}
            <span className="text-sm font-bold text-text-primary">حساب الخزينة</span>
          </div>
          <Controller
            name="treasury_account_id"
            control={control}
            rules={{ required: t('common.required') }}
            render={({ field }) => (
              <TreasuryAccountPaymentPicker
                value={field.value || null}
                onChange={(id) => field.onChange(id)}
              />
            )}
          />
          {errors.treasury_account_id && (
            <div className="text-danger text-xs mt-1">{errors.treasury_account_id.message}</div>
          )}
        </section>

        <div className="border-t border-border" />

        {/* ============ DETAILS ============ */}
        <section>
          <div className="flex items-center gap-2 mb-2.5">
            {detailsReady ? (
              <CheckCircle2 className="h-4 w-4 text-status-success-text shrink-0" />
            ) : (
              <CircleDashed className="h-4 w-4 text-text-secondary shrink-0" />
            )}
            <span className="text-sm font-bold text-text-primary">التفاصيل</span>
          </div>
          <div className="space-y-3.5">
            {/* Amount — large bold field */}
            <Controller
              name="amount"
              control={control}
              rules={{
                required: t('common.required'),
                min: { value: 0.01, message: 'المبلغ يجب أن يكون أكبر من صفر' },
              }}
              defaultValue={Number(remainingAmount) || 0}
              render={({ field }) => (
                <div className="relative">
                  <NumberInput
                    name={field.name}
                    label=""
                    value={field.value}
                    onChange={(e) => {
                      field.onChange(e.target.value ? Number(e.target.value) : '');
                    }}
                    placeholder="0.00"
                    className="text-2xl font-extrabold h-14 pl-16"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-text-secondary pointer-events-none">
                    SAR
                  </span>
                </div>
              )}
            />
            {errors.amount && (
              <div className="text-danger text-xs mt-1">{errors.amount.message}</div>
            )}

            {/* Payment Preview */}
            {watchedAmount > 0 && (
              <div
                className={`rounded-lg p-3 text-sm ${
                  isOverpayment
                    ? 'bg-status-warning-bg text-status-warning-text'
                    : 'bg-status-info-bg text-text-primary'
                }`}
              >
                {isOverpayment ? (
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>
                      المبلغ أكبر من المطلوب! سيتم إضافة{' '}
                      {formatCurrency(watchedAmount - remainingAmount)} SAR كرصيد للعميل
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span>المتبقي بعد الدفع:</span>
                    <span className={remainingAfterPayment === 0 ? 'font-bold text-status-success-text' : ''}>
                      {remainingAfterPayment === 0
                        ? 'تم السداد الكامل ✓'
                        : `${formatCurrency(remainingAfterPayment)} SAR`}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Date */}
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
                  onChange={(e) => {
                    field.onChange(e.target.value);
                  }}
                  error={errors.paid_at?.message}
                />
              )}
            />

            {/* Notes — editable textarea with auto-generated content */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">ملاحظات</label>
              <textarea
                className="w-full rounded-lg border border-border-default bg-transparent px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:ring-1 focus:ring-primary-500/20 focus:border-primary-500/40 transition-all resize-y"
                rows={3}
                placeholder="من العميل: ...\nإلى حساب: ..."
                value={editableNotes}
                onChange={handleNotesChange}
              />
            </div>
          </div>
        </section>

        {/* ============ LIVE SUMMARY STRIP ============ */}
        {(displayClientName || treasuryName || watchedAmount) && (
          <Card className="border-2 border-primary-500/20 bg-primary-500/[0.03] overflow-hidden">
            <CardContent className="p-3.5">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0 text-right">
                  <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wide">
                    العميل
                  </div>
                  <div className="text-sm font-bold text-text-primary truncate">
                    {displayClientName || '—'}
                  </div>
                </div>
                <ArrowLeftRight className="h-4 w-4 text-primary-500 shrink-0" />
                <div className="flex-1 min-w-0 text-right">
                  <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wide">
                    الخزينة
                  </div>
                  <div className="text-sm font-bold text-text-primary truncate">
                    {treasuryName || '—'}
                  </div>
                </div>
                <div className="w-px h-9 bg-border shrink-0" />
                <div className="text-right shrink-0">
                  <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wide">
                    المبلغ
                  </div>
                  <div className="text-lg font-extrabold text-primary-500 whitespace-nowrap">
                    {formatCurrency(watchedAmount || 0)} SAR
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ============ ACTIONS ============ */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-border">
          <Button
            type="button"
            variant="outline-info"
            onClick={closeModal}
            disabled={recordPaymentMutation.isPending}
          >
            إلغاء
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit(onSubmit)}
            disabled={!canSubmit || recordPaymentMutation.isPending}
            isLoading={recordPaymentMutation.isPending}
            className="min-w-[140px]"
          >
            {recordPaymentMutation.isPending ? 'جارٍ الإرسال...' : 'تسجيل الدفعة'}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};

export default RecordPaymentModal;
