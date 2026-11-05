/**
 * RecordPaymentModal Component
 *
 * Full unified invoice payment modal matching UnifiedTransactionModal layout:
 * - Centered modal title with bluish qabd theme
 * - Single row-wide AccountPickerCard for destination (إلى حساب الخزينة)
 * - Orientation banner: من حساب (العميل) الى حساب (الخزينة)
 * - Single row for Amount (prefilled to full due amount), Date, and Time
 * - Editable description textarea prefilled with payment trail
 * - Submits via normal invoice pay API (useRecordInvoicePayment)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useRecordInvoicePayment, useGetInvoice } from '@/features/invoices/api/invoiceQueries';
import { useGetPaymentMethods } from '@/features/receivables/api/paymentQueries';
import { useModalStore } from '@/shared/stores/modalStore';
import { useToast } from '@/shared/hooks/useToast';
import type { RecordInvoicePaymentPayload, Invoice } from '@/api/types';
import BaseModal from '@/shared/ui/layout/BaseModal';
import Button from '@/shared/ui/primitives/Button';
import { NumberInput } from '@/shared/ui/primitives/NumberInput';
import { DateInput } from '@/shared/ui/primitives/DateInput';
import {
  AlertCircle,
  Loader2,
  CheckCircle2,
  CircleDashed,
} from 'lucide-react';
import AccountPickerCard, { type PickerValue, type PickerKind } from '@/features/financials/components/AccountPickerCard';
import { useGetAccountsByType } from '@/features/financials/api/financialCenterQueries';
import { useGetTreasuryAccounts, useGetCategoryMetadata } from '@/features/financials/api/treasuryQueries';

// ========================================
// Types
// ========================================

interface RecordPaymentModalProps {
  invoiceId?: number;
  invoice?: Invoice | any;
  amountDue?: number;
  clientId?: number;
  clientName?: string;
  taskName?: string;
  initialPaymentAmount?: number;
}

// ========================================
// Helpers
// ========================================

const nowLocalDate = () => new Date().toISOString().split('T')[0];
const nowLocalTime = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// ========================================
// Component
// ========================================

const RecordPaymentModal: React.FC = () => {
  const { t } = useTranslation();
  const props = useModalStore((state) => state.props) as RecordPaymentModalProps;
  const closeModal = useModalStore((state) => state.closeModal);
  const { success, error: toastError } = useToast();

  const { invoiceId, invoice: propInvoice, amountDue, clientName, taskName, initialPaymentAmount } = props || {};
  const targetInvoiceId = invoiceId || propInvoice?.id;

  // Fetch full invoice data if not passed directly
  const { data: fetchedInvoice, isLoading: isInvoiceLoading } = useGetInvoice(
    Number(targetInvoiceId),
    !propInvoice && !!targetInvoiceId
  );

  const invoice = propInvoice || fetchedInvoice;

  // Account pickers data
  const { data: clientsData } = useGetAccountsByType('client', {}, true);
  const { data: treasuryData } = useGetTreasuryAccounts();
  const { data: categoryMetadata } = useGetCategoryMetadata();
  const { data: employeesRaw } = useGetAccountsByType('employee', {}, true);

  const clients = useMemo(() => clientsData?.accounts ?? [], [clientsData]);
  const employees = useMemo(() => employeesRaw?.accounts ?? [], [employeesRaw]);

  // Compute remaining amount (predefined to full current due amount)
  const remainingAmount = useMemo(() => {
    if (typeof amountDue === 'number' && amountDue > 0) return amountDue;
    if (invoice?.remaining_amount !== undefined) return Number(invoice.remaining_amount);
    if (invoice?.amount !== undefined) return Math.max(0, Number(invoice.amount) - Number(invoice.paid_amount || 0));
    return 0;
  }, [amountDue, invoice]);

  const displayClientName = clientName || invoice?.client?.name || invoice?.client_name || '';
  const displayTaskName = taskName || invoice?.task?.task_name || invoice?.task_name || invoice?.description || '';

  // ---- Form State matching UnifiedTransactionModal ----
  const [amount, setAmount] = useState<string>('');
  const [paidAtDate, setPaidAtDate] = useState<string>(nowLocalDate());
  const [paidAtTime, setPaidAtTime] = useState<string>(nowLocalTime());
  const [description, setDescription] = useState<string>('');
  const [userEditedNotes, setUserEditedNotes] = useState<boolean>(false);

  // Pre-fill amount with full current due amount as soon as remainingAmount is known
  useEffect(() => {
    if (typeof remainingAmount === 'number' && remainingAmount > 0) {
      const initialAmt = typeof initialPaymentAmount !== 'undefined' ? initialPaymentAmount : remainingAmount;
      setAmount(String(initialAmt));
    }
  }, [remainingAmount, initialPaymentAmount]);

  // Destination (To) Account is Treasury / Cashbox
  const [toPicker, setToPicker] = useState<PickerValue>({
    kind: 'cashbox',
    accountId: '',
    accountName: '',
    categorySlug: 'cashbox',
  });

  // Set default treasury account (cashbox)
  useEffect(() => {
    if (treasuryData && treasuryData.length > 0 && !toPicker.accountId) {
      const defaultCashbox = treasuryData.find(
        (t) => (t as any).can_transact !== false && t.sub_type === 'cashbox' && !(t.metadata as any)?.is_settlement
      ) || treasuryData[0];

      if (defaultCashbox) {
        setToPicker({
          kind: defaultCashbox.sub_type === 'bank' ? 'bank' : 'cashbox',
          accountId: String(defaultCashbox.id),
          accountName: defaultCashbox.name,
          categorySlug: defaultCashbox.sub_type || null,
        });
      }
    }
  }, [treasuryData, toPicker.accountId]);

  // Payment methods: find cash method ID
  const { data: paymentMethods, isLoading: methodsLoading } = useGetPaymentMethods();
  const cashMethodId = useMemo(() => {
    if (!paymentMethods) return undefined;
    const cashMethod = paymentMethods.find((m) => m.code === 'cash') ?? paymentMethods[0];
    return cashMethod?.id;
  }, [paymentMethods]);

  // Auto-notes pre-fill
  useEffect(() => {
    if (!userEditedNotes) {
      const parts: string[] = [];
      if (displayClientName) parts.push(`من العميل: ${displayClientName}`);
      if (targetInvoiceId) {
        const taskLabel = displayTaskName ? ` (${displayTaskName})` : '';
        parts.push(`سداد فاتورة: #${targetInvoiceId}${taskLabel}`);
      }
      if (toPicker.accountName) parts.push(`إلى حساب: ${toPicker.accountName}`);
      setDescription(parts.join('\n'));
    }
  }, [displayClientName, targetInvoiceId, displayTaskName, toPicker.accountName, userEditedNotes]);

  // Calculations
  const parsedAmount = parseFloat(amount) || 0;

  // Submit mutation
  const recordPaymentMutation = useRecordInvoicePayment();

  const accountsReady = !!toPicker.accountId;
  const detailsReady = parsedAmount > 0 && !!paidAtDate;
  const canSubmit = accountsReady && detailsReady && !recordPaymentMutation.isPending;

  const handleSubmit = () => {
    if (!targetInvoiceId || !canSubmit) return;

    const paidDateTime = `${paidAtDate} ${paidAtTime}:00`;

    const payload: RecordInvoicePaymentPayload = {
      amount: parsedAmount,
      treasury_account_id: Number(toPicker.accountId),
      payment_method_id: cashMethodId || 1,
      paid_at: paidDateTime,
      note: description || undefined,
    };

    recordPaymentMutation.mutate(
      { invoiceId: Number(targetInvoiceId), payload },
      {
        onSuccess: () => {
          success('تم تسجيل الدفعة بنجاح');
          closeModal();
        },
        onError: (err: any) => {
          toastError(err?.message || 'حدث خطأ أثناء تسجيل الدفعة');
        },
      }
    );
  };

  // Error guard
  if (!targetInvoiceId) {
    return (
      <BaseModal isOpen={true} onClose={closeModal} title="سداد فاتورة" titleClassName="text-center w-full ms-6 font-bold text-status-info-text">
        <div className="text-center py-4">
          <AlertCircle className="mx-auto mb-3 text-status-danger-text" size={48} />
          <p className="text-status-danger-text font-bold">خطأ: لم يتم تحديد الفاتورة</p>
          <Button variant="secondary" onClick={closeModal} className="mt-3">
            إغلاق
          </Button>
        </div>
      </BaseModal>
    );
  }

  if (isInvoiceLoading || methodsLoading) {
    return (
      <BaseModal isOpen={true} onClose={closeModal} title="سداد فاتورة" titleClassName="text-center w-full ms-6 font-bold text-status-info-text">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      </BaseModal>
    );
  }

  const modalTitle = targetInvoiceId
    ? `سداد فاتورة #${targetInvoiceId}${displayTaskName ? ` (${displayTaskName})` : ''}`
    : 'سداد فاتورة';

  return (
    <BaseModal
      isOpen={true}
      onClose={closeModal}
      title={modalTitle}
      className="unified-tx-modal unified-tx-modal-qabd"
      titleClassName="text-center w-full ms-6 font-bold text-status-info-text"
    >
      <style>{`
        /* Scoped solely to RecordPaymentModal matching UnifiedTransactionModal qabd theme */
        .unified-tx-modal.unified-tx-modal-qabd {
          background-color: var(--primitive-blue-50) !important;
          border-color: var(--primitive-blue-200) !important;
        }
        .unified-tx-modal.unified-tx-modal-qabd header {
          background-color: color-mix(in srgb, var(--primitive-blue-700) 12%, var(--primitive-blue-50)) !important;
          border-bottom-color: var(--primitive-blue-200) !important;
        }
        .unified-tx-modal.unified-tx-modal-qabd .unified-tx-footer {
          background-color: color-mix(in srgb, var(--primitive-blue-700) 8%, var(--primitive-blue-50)) !important;
          border-top-color: var(--primitive-blue-200) !important;
        }

        /* Dark mode overrides */
        .dark .unified-tx-modal.unified-tx-modal-qabd,
        html.dark .unified-tx-modal.unified-tx-modal-qabd {
          background-color: #0d1b2a !important;
          border-color: #1e3a5f !important;
        }
        .dark .unified-tx-modal.unified-tx-modal-qabd header,
        html.dark .unified-tx-modal.unified-tx-modal-qabd header {
          background-color: #122338 !important;
          border-bottom-color: #1e3a5f !important;
        }
        .dark .unified-tx-modal.unified-tx-modal-qabd .unified-tx-footer,
        html.dark .unified-tx-modal.unified-tx-modal-qabd .unified-tx-footer {
          background-color: #102033 !important;
          border-top-color: #1e3a5f !important;
        }
      `}</style>

      <div dir="rtl" className="space-y-4">
        {/* ============ ACCOUNTS (Single Row-Wide Picker for Destination) ============ */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            {accountsReady ? (
              <CheckCircle2 className="h-4 w-4 text-status-success-text shrink-0" />
            ) : (
              <CircleDashed className="h-4 w-4 text-text-secondary shrink-0" />
            )}
            <span className="text-xs font-bold text-text-primary">الحسابات</span>
          </div>

          <div className="w-full space-y-2.5">
            <AccountPickerCard
              label="إلى حساب (الخزينة المستلمة)"
              value={toPicker}
              onChange={setToPicker}
              clients={clients}
              employees={employees}
              treasuryData={treasuryData ?? []}
              categoryMetadata={categoryMetadata ?? []}
              presetKind={null}
              isVisible={true}
              isRowWide={true}
              excludeKinds={['client', 'employee', 'settlement']}
            />

            {displayClientName && toPicker.accountName && (
              <div className="rounded-lg border px-3 py-2 text-xs font-bold border-status-info-border bg-status-info-bg text-status-info-text">
                <span>{`من العميل (${displayClientName}) الى حساب (${toPicker.accountName})`}</span>
              </div>
            )}
          </div>
        </section>

        <div className="border-t border-border" />

        {/* ============ DETAILS (Amount, Date, Time, Notes) ============ */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            {detailsReady ? (
              <CheckCircle2 className="h-4 w-4 text-status-success-text shrink-0" />
            ) : (
              <CircleDashed className="h-4 w-4 text-text-secondary shrink-0" />
            )}
            <span className="text-xs font-bold text-text-primary">تفاصيل الدفعة</span>
          </div>

          <div className="space-y-3">
            {/* Amount + Date + Time — 12-column grid matching UnifiedTransactionModal */}
            <div className="grid grid-cols-12 gap-2.5">
              <div className="col-span-5">
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  المبلغ <span className="text-status-danger-text">*</span>
                </label>
                <div className="relative">
                  <NumberInput
                    value={amount}
                    onChange={(val: any) => setAmount(typeof val === 'string' ? val : val?.target?.value ?? '')}
                    placeholder="0.00"
                    min={0}
                    step="0.01"
                    className="w-full text-left font-mono font-bold"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-text-secondary/60">
                    ر.س
                  </span>
                </div>
              </div>

              <div className="col-span-4">
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  التاريخ <span className="text-status-danger-text">*</span>
                </label>
                <DateInput
                  name="paid_at"
                  value={paidAtDate}
                  onChange={(val: any) => setPaidAtDate(typeof val === 'string' ? val : val?.target?.value ?? '')}
                  className="w-full"
                />
              </div>

              <div className="col-span-3">
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  الوقت
                </label>
                <input
                  type="time"
                  name="paid_at_time"
                  value={paidAtTime}
                  onChange={(e) => setPaidAtTime(e.target.value)}
                  dir="ltr"
                  className="base-input w-full text-center font-mono text-xs"
                />
              </div>
            </div>

            {/* Description / Notes */}
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1">
                البيان / الملاحظات
              </label>
              <textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setUserEditedNotes(true);
                }}
                placeholder="اكتب بيان سداد الفاتورة هنا..."
                rows={2}
                className="w-full rounded-lg border border-border-default bg-background p-2.5 text-xs font-medium text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary/40 transition-all resize-none"
              />
            </div>
          </div>
        </section>

        {/* ============ FOOTER ACTIONS ============ */}
        <div className="unified-tx-footer flex items-center justify-between p-3.5 -mx-6 -mb-6 mt-4 rounded-b-xl border-t">
          <Button
            type="button"
            variant="outline-danger"
            size="sm"
            onClick={closeModal}
            disabled={recordPaymentMutation.isPending}
          >
            إلغاء
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={!canSubmit}
            isLoading={recordPaymentMutation.isPending}
            className="!bg-emerald-600 hover:!bg-emerald-700 !text-white font-bold shadow-sm min-w-[140px]"
          >
            {recordPaymentMutation.isPending ? 'جارٍ السداد...' : 'تسجيل الدفعة'}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};

export default RecordPaymentModal;