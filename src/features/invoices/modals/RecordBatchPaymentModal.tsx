/**
 * RecordBatchPaymentModal Component
 *
 * Modal for recording a single payment split across multiple invoices.
 * Uses the batch payment API endpoint for atomic processing.
 * Payment method is auto-selected as "cash" — no manual selector.
 */

import { useState, useMemo, useEffect, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useRecordBatchPayment } from '@/features/invoices/api/invoiceQueries';
import { useGetPaymentMethods } from '@/features/receivables/api/paymentQueries';
import { useGetMyTreasuryAccounts } from '@/features/financials/api/treasuryQueries';
import { useModalStore } from '@/shared/stores/modalStore';
import { useToast } from '@/shared/hooks/useToast';
import type { Invoice } from '@/api/types';
import BaseModal from '@/shared/ui/layout/BaseModal';
import Button from '@/shared/ui/primitives/Button';
import { DateInput } from '@/shared/ui/primitives/DateInput';
import { Card, CardContent } from '@/shared/ui/shadcn/card';
import { Loader2, CheckCircle2, CircleDashed, ArrowLeftRight } from 'lucide-react';
import { TOAST_MESSAGES } from '@/shared/constants/toastMessages';
import TreasuryAccountPaymentPicker from '@/features/invoices/components/TreasuryAccountPaymentPicker';

interface RecordBatchPaymentModalProps {
  clientId: number;
  clientName?: string;
  allocations: { invoice: Invoice; amount: number }[];
}

const RecordBatchPaymentModal = () => {
  const { t } = useTranslation();
  const props = useModalStore((state) => state.props) as RecordBatchPaymentModalProps;
  const closeModal = useModalStore((state) => state.closeModal);
  const { success } = useToast();

  const { clientId, allocations } = props;

  // ── State ──────────────────────────────────────────────────────────
  const [allocationTreasuryAccounts, setAllocationTreasuryAccounts] = useState<Record<number, number>>({});
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split('T')[0]);
  const [editableNotes, setEditableNotes] = useState('');
  const [userEditedNotes, setUserEditedNotes] = useState(false);

  // ── Derived values ─────────────────────────────────────────────────
  const totalAmount = useMemo(
    () => allocations.reduce((sum, a) => sum + a.amount, 0),
    [allocations]
  );

  const clientName = props.clientName || 'عميل';

  const autoNotes = `سداد ${allocations.length} فواتير للعميل: ${clientName}`;

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

  // ── Queries ────────────────────────────────────────────────────────
  const { data: paymentMethods, isLoading: methodsLoading } = useGetPaymentMethods();

  // Find the cash payment method dynamically
  const cashMethodId = useMemo(() => {
    if (!paymentMethods) return undefined;
    const cashMethod = paymentMethods.find(
      (m) => m.code === 'cash' || m.name?.toLowerCase() === 'cash' || m.name === 'نقد'
    );
    return cashMethod?.id;
  }, [paymentMethods]);

  const batchPaymentMutation = useRecordBatchPayment();

  // ── Submit ─────────────────────────────────────────────────────────
  const canSubmit =
    allocations.every((a) => allocationTreasuryAccounts[a.invoice.id]) &&
    cashMethodId !== undefined;

  const onSubmit = () => {
    if (!cashMethodId) return;

    for (const a of allocations) {
      if (!allocationTreasuryAccounts[a.invoice.id]) return;
    }

    batchPaymentMutation.mutate(
      {
        client_id: clientId,
        payment_method_id: cashMethodId,
        paid_at: paidAt,
        note: editableNotes || undefined,
        allocations: allocations.map((a) => ({
          invoice_id: a.invoice.id,
          amount: a.amount,
          treasury_account_id: allocationTreasuryAccounts[a.invoice.id],
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

  // ── Formatting ─────────────────────────────────────────────────────
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2,
    }).format(Number(amount) || 0);
  };

  // ── Loading state ──────────────────────────────────────────────────
  if (methodsLoading) {
    return (
      <BaseModal isOpen={true} onClose={closeModal} title="تسجيل دفعة لعدة فواتير">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin h-6 w-6 text-primary-500" />
        </div>
      </BaseModal>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <BaseModal isOpen={true} onClose={closeModal} title="تسجيل دفعة لعدة فواتير">
      <div dir="rtl" className="space-y-5">
        {/* ============ INVOICES & TREASURIES ============ */}
        <section>
          <div className="flex items-center gap-2 mb-2.5">
            <CheckCircle2 className="h-4 w-4 text-status-success-text shrink-0" />
            <span className="text-sm font-bold text-text-primary">الفواتير والخزائن</span>
          </div>
          <div className="space-y-3">
            {allocations.map((a) => (
              <div
                key={a.invoice.id}
                className="rounded-lg border border-border-default p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">فاتورة #{a.invoice.id}</span>
                    <span className="text-xs text-text-secondary mr-2">
                      {a.invoice.description || ''}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-primary">
                    {formatCurrency(a.amount)} SAR
                  </span>
                </div>
                <TreasuryAccountPaymentPicker
                  value={allocationTreasuryAccounts[a.invoice.id] ?? null}
                  onChange={(id) =>
                    setAllocationTreasuryAccounts((prev) => ({
                      ...prev,
                      [a.invoice.id]: id,
                    }))
                  }
                />
              </div>
            ))}
          </div>
          {/* Total */}
          <div className="mt-3 flex items-center justify-between rounded-lg border-2 border-primary-500/20 bg-primary-500/[0.03] px-4 py-3">
            <span className="text-sm font-bold text-text-primary">إجمالي الدفع</span>
            <span className="text-lg font-extrabold text-primary-500">
              {formatCurrency(totalAmount)} SAR
            </span>
          </div>
        </section>

        <div className="border-t border-border" />

        {/* ============ DETAILS ============ */}
        <section>
          <div className="flex items-center gap-2 mb-2.5">
            <CircleDashed className="h-4 w-4 text-text-secondary shrink-0" />
            <span className="text-sm font-bold text-text-primary">التفاصيل</span>
          </div>
          <div className="space-y-3.5">
            <DateInput
              name="paidAt"
              label="تاريخ الدفع"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
            />
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1.5">
                ملاحظات{' '}
                <span className="font-normal text-text-secondary/70">(اختياري)</span>
              </label>
              <textarea
                value={editableNotes}
                onChange={handleNotesChange}
                maxLength={1000}
                rows={2}
                className="w-full resize-none rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500"
                placeholder="سداد فواتير للعميل: ..."
              />
            </div>
          </div>
        </section>

        {/* ============ LIVE SUMMARY STRIP ============ */}
        <Card className="border-2 border-primary-500/20 bg-primary-500/[0.03] overflow-hidden">
          <CardContent className="p-3.5">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0 text-right">
                <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wide">
                  العميل
                </div>
                <div className="text-sm font-bold text-text-primary truncate">{clientName}</div>
              </div>
              <ArrowLeftRight className="h-4 w-4 text-primary-500 shrink-0" />
              <div className="flex-1 min-w-0 text-right">
                <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wide">
                  عدد الفواتير
                </div>
                <div className="text-sm font-bold text-text-primary">
                  {allocations.length} فواتير
                </div>
              </div>
              <div className="w-px h-9 bg-border shrink-0" />
              <div className="text-right shrink-0">
                <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wide">
                  المبلغ
                </div>
                <div className="text-lg font-extrabold text-primary-500 whitespace-nowrap">
                  {formatCurrency(totalAmount)} SAR
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ============ ACTIONS ============ */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-border">
          <Button
            type="button"
            variant="outline-info"
            onClick={closeModal}
            disabled={batchPaymentMutation.isPending}
          >
            إلغاء
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={onSubmit}
            disabled={!canSubmit || batchPaymentMutation.isPending}
            isLoading={batchPaymentMutation.isPending}
            className="min-w-[140px]"
          >
            {batchPaymentMutation.isPending
              ? 'جارٍ الإرسال...'
              : `تسجيل دفعة ${formatCurrency(totalAmount)}`}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};

export default RecordBatchPaymentModal;
