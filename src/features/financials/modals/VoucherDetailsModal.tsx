import React, { useState, useEffect, useMemo } from 'react';
import BaseModal from '@/shared/ui/layout/BaseModal';
import Button from '@/shared/ui/primitives/Button';
import { NumberInput } from '@/shared/ui/primitives/NumberInput';
import AccountPickerCard, { type PickerValue, type PickerKind } from '@/features/financials/components/AccountPickerCard';
import { useModalStore } from '@/shared/stores/modalStore';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useUpdateTransaction } from '@/features/financials/api/transactionQueries';
import { useGetAccountsByType } from '@/features/financials/api/financialCenterQueries';
import { useGetTreasuryAccounts, useGetCategoryMetadata } from '@/features/financials/api/treasuryQueries';
import { useToast } from '@/shared/hooks/useToast';
import { resolveLedgerTone, isKnownLedgerType } from '@/shared/ledger/ledgerDirection';
import { Pencil, Printer, CheckCircle2, CircleDashed, Loader2 } from 'lucide-react';
import type { UpdateTransactionPayload } from '@/api/types';

function parseDateTimeParts(raw: any): { date: string; time: string } {
  if (!raw) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return { date: `${y}-${m}-${d}`, time: `${hh}:${mm}:${ss}` };
  }

  const str = String(raw).trim().replace('Z', '').split('.')[0];
  let d = '';
  let t = '00:00:00';

  if (str.includes('T')) {
    const parts = str.split('T');
    d = parts[0] || '';
    t = parts[1] || '00:00:00';
  } else if (str.includes(' ')) {
    const parts = str.split(' ');
    d = parts[0] || '';
    t = parts[1] || '00:00:00';
  } else {
    d = str;
  }

  if (d.includes('/')) {
    const slashParts = d.split('/');
    if (slashParts[0].length === 4) {
      d = `${slashParts[0]}-${slashParts[1].padStart(2, '0')}-${slashParts[2].padStart(2, '0')}`;
    } else if (slashParts[2]?.length === 4) {
      d = `${slashParts[2]}-${slashParts[1].padStart(2, '0')}-${slashParts[0].padStart(2, '0')}`;
    }
  }

  const timeParts = t.split(':');
  if (timeParts.length === 2) {
    t = `${timeParts[0].padStart(2, '0')}:${timeParts[1].padStart(2, '0')}:00`;
  } else if (timeParts.length >= 3) {
    t = `${timeParts[0].padStart(2, '0')}:${timeParts[1].padStart(2, '0')}:${timeParts[2].substring(0, 2).padStart(2, '0')}`;
  }

  return { date: d, time: t };
}

interface VoucherDetailsModalProps {
  voucher?: any;
  transaction?: any;
  initialEditing?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

export const VoucherDetailsModal: React.FC<VoucherDetailsModalProps> = ({
  voucher: propVoucher,
  transaction: propTransaction,
  initialEditing = false,
  isOpen: propIsOpen,
  onClose: propOnClose,
}) => {
  const storeIsOpen = useModalStore((state) => state.isOpen);
  const storeCloseModal = useModalStore((state) => state.closeModal);
  const openModal = useModalStore((state) => state.openModal);
  const storeProps = useModalStore((state) => state.props) as any;

  const isOpen = propIsOpen !== undefined ? propIsOpen : storeIsOpen;
  const handleClose = propOnClose || storeCloseModal;

  const rawTxn = propVoucher || propTransaction || storeProps?.voucher || storeProps?.transaction;

  const { isAdmin } = useAuthStore();
  const toast = useToast();
  const updateTransaction = useUpdateTransaction();

  const [isEditing, setIsEditing] = useState(initialEditing || !!storeProps?.initialEditing);
  const [amount, setAmount] = useState<string>('');
  const [datePart, setDatePart] = useState<string>('');
  const [timePart, setTimePart] = useState<string>('00:00:00');
  const [description, setDescription] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  // Fetch account listings for the readOnly AccountPickerCards
  const { data: clientsData } = useGetAccountsByType('client', {}, isOpen);
  const { data: treasuryData } = useGetTreasuryAccounts();
  const { data: categoryMetadata } = useGetCategoryMetadata();
  const { data: employeesRaw } = useGetAccountsByType('employee', {}, isOpen);

  const clients = useMemo(() => clientsData?.accounts ?? [], [clientsData]);
  const employees = useMemo(() => employeesRaw?.accounts ?? [], [employeesRaw]);

  // Sync state from incoming transaction/voucher
  useEffect(() => {
    if (rawTxn && isOpen) {
      const amt = Number(rawTxn.debit || 0) > 0 ? Number(rawTxn.debit) : Number(rawTxn.credit || rawTxn.amount || 0);
      setAmount(String(amt || ''));
      setDescription(rawTxn.description || '');
      setReason('');

      const rawDate = rawTxn.date || rawTxn.transaction_date || rawTxn.created_at || '';
      const { date: d, time: t } = parseDateTimeParts(rawDate);
      setDatePart(d);
      setTimePart(t);
      setIsEditing(initialEditing || !!storeProps?.initialEditing);
    }
  }, [rawTxn, isOpen, initialEditing, storeProps?.initialEditing]);

  if (!rawTxn) return null;

  // Determine Qabd vs Sarf dynamically by transaction money movement across ledgers
  const debitAmount = Number(rawTxn.debit || (rawTxn.direction === 'debit' ? rawTxn.amount : 0));
  const creditAmount = Number(rawTxn.credit || (rawTxn.direction === 'credit' ? rawTxn.amount : 0));
  const accountType = String(rawTxn.account_type || 'treasury');

  let meta: any = rawTxn.metadata;
  if (typeof meta === 'string') {
    try { meta = JSON.parse(meta); } catch {}
  }

  // Money movement calculation:
  // - Treasury/Cashbox: debit > 0 is Qabd (inflow), credit > 0 is Sarf (outflow)
  // - Client: credit > 0 is Qabd (payment received), debit > 0 is Sarf (invoice/debt)
  // - Employee: credit > 0 is Qabd (earnings), debit > 0 is Sarf (payout)
  const isQabd = useMemo(() => {
    if (meta?.voucher_type_override === 'receipt') return true;
    if (meta?.voucher_type_override === 'expense') return false;

    if (isKnownLedgerType(accountType)) {
      const tone = resolveLedgerTone(accountType, debitAmount, creditAmount);
      return tone === 'success';
    }

    return debitAmount > 0;
  }, [accountType, debitAmount, creditAmount, meta]);

  // Construct PickerValues for From Account and To Account
  // Double-entry semantics: money moves FROM Credit Account TO Debit Account.
  const fromPicker: PickerValue = useMemo(() => {
    if (creditAmount > 0) {
      // THIS account is the Credit (From) account
      return {
        kind: (accountType === 'client' ? 'client' : (accountType === 'employee' ? 'employee' : (accountType === 'bank' ? 'bank' : 'cashbox'))) as PickerKind,
        accountId: String(rawTxn.account_id || ''),
        categorySlug: null,
      };
    } else {
      // Counterparty is the Credit (From) account
      const targetType = String(rawTxn.target_type || '');
      return {
        kind: (targetType === 'client' ? 'client' : (targetType === 'employee' ? 'employee' : (targetType === 'bank' ? 'bank' : (targetType === 'cashbox' ? 'cashbox' : 'other')))) as PickerKind,
        accountId: String(rawTxn.target_id || ''),
        categorySlug: null,
      };
    }
  }, [rawTxn, creditAmount, accountType]);

  const toPicker: PickerValue = useMemo(() => {
    if (debitAmount > 0) {
      // THIS account is the Debit (To) account
      return {
        kind: (accountType === 'client' ? 'client' : (accountType === 'employee' ? 'employee' : (accountType === 'bank' ? 'bank' : 'cashbox'))) as PickerKind,
        accountId: String(rawTxn.account_id || ''),
        categorySlug: null,
      };
    } else {
      // Counterparty is the Debit (To) account
      const targetType = String(rawTxn.target_type || '');
      return {
        kind: (targetType === 'client' ? 'client' : (targetType === 'employee' ? 'employee' : (targetType === 'bank' ? 'bank' : (targetType === 'cashbox' ? 'cashbox' : 'other')))) as PickerKind,
        accountId: String(rawTxn.target_id || ''),
        categorySlug: null,
      };
    }
  }, [rawTxn, debitAmount, accountType]);

  const activeTitle = isEditing
    ? `تعديل المعاملة #${rawTxn.id}`
    : (isQabd ? `سند قبض #${rawTxn.id}` : `سند صرف #${rawTxn.id}`);

  const handleSave = async () => {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error('خطأ', 'يرجى إدخال مبلغ صالح أكبر من الصفر');
      return;
    }
    if (!description.trim()) {
      toast.error('خطأ', 'البيان (الوصف) مطلوب');
      return;
    }
    if (!reason.trim()) {
      toast.error('خطأ', 'سبب التعديل مطلوب للمراجعة وسجل التدقيق');
      return;
    }

    const finalDateTime = `${datePart} ${timePart || '00:00:00'}`;
    const wasDebit = debitAmount > 0;

    const payload: UpdateTransactionPayload = {
      debit: wasDebit ? parsedAmount : 0,
      credit: !wasDebit ? parsedAmount : 0,
      description: description.trim(),
      transaction_date: finalDateTime,
      reason: reason.trim(),
    };

    try {
      await updateTransaction.mutateAsync({
        id: rawTxn.id,
        payload,
      });
      toast.success('تم تحديث المعاملة بنجاح');
      setIsEditing(false);
      handleClose();
    } catch (err: any) {
      toast.error('فشل التعديل', err.message || 'حدث خطأ أثناء تعديل المعاملة');
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={activeTitle}
      className={`unified-tx-modal max-w-4xl ${isQabd ? 'unified-tx-modal-qabd' : 'unified-tx-modal-sarf'}`}
      titleClassName={`text-center w-full ms-6 font-bold ${isQabd ? 'text-status-info-text' : 'text-status-danger-text'}`}
    >
      <style>{`
        /* Scoped solely to UnifiedTransactionModal and VoucherDetailsModal */
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

        .unified-tx-modal.unified-tx-modal-sarf {
          background-color: var(--primitive-red-50) !important;
          border-color: var(--primitive-red-200) !important;
        }
        .unified-tx-modal.unified-tx-modal-sarf header {
          background-color: color-mix(in srgb, var(--primitive-red-600) 12%, var(--primitive-red-50)) !important;
          border-bottom-color: var(--primitive-red-200) !important;
        }
        .unified-tx-modal.unified-tx-modal-sarf .unified-tx-footer {
          background-color: color-mix(in srgb, var(--primitive-red-600) 8%, var(--primitive-red-50)) !important;
          border-top-color: var(--primitive-red-200) !important;
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

        .dark .unified-tx-modal.unified-tx-modal-sarf,
        html.dark .unified-tx-modal.unified-tx-modal-sarf {
          background-color: #200d11 !important;
          border-color: #4c1d24 !important;
        }
        .dark .unified-tx-modal.unified-tx-modal-sarf header,
        html.dark .unified-tx-modal.unified-tx-modal-sarf header {
          background-color: #2b1218 !important;
          border-bottom-color: #4c1d24 !important;
        }
        .dark .unified-tx-modal.unified-tx-modal-sarf .unified-tx-footer,
        html.dark .unified-tx-modal.unified-tx-modal-sarf .unified-tx-footer {
          background-color: #251015 !important;
          border-top-color: #4c1d24 !important;
        }
      `}</style>

      <div dir="rtl" className="space-y-5">
        {/* ============ ACCOUNTS (Read-only Account Picker Cards) ============ */}
        <section>
          <div className="flex items-center gap-2 mb-2.5">
            <CheckCircle2 className="h-4 w-4 text-status-success-text shrink-0" />
            <span className="text-sm font-bold text-text-primary">الحسابات</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Natural RTL order: for Qabd, destination (toAccount) on right; for Sarf, origin (fromAccount) on right */}
            {isQabd ? (
              <>
                <AccountPickerCard
                  label="إلى حساب (المدين)"
                  value={toPicker}
                  onChange={() => {}}
                  clients={clients}
                  employees={employees}
                  treasuryData={treasuryData ?? []}
                  categoryMetadata={categoryMetadata ?? []}
                  isVisible={isOpen}
                  readOnly={true}
                />
                <AccountPickerCard
                  label="من حساب (الدائن)"
                  value={fromPicker}
                  onChange={() => {}}
                  clients={clients}
                  employees={employees}
                  treasuryData={treasuryData ?? []}
                  categoryMetadata={categoryMetadata ?? []}
                  isVisible={isOpen}
                  readOnly={true}
                />
              </>
            ) : (
              <>
                <AccountPickerCard
                  label="من حساب (الدائن)"
                  value={fromPicker}
                  onChange={() => {}}
                  clients={clients}
                  employees={employees}
                  treasuryData={treasuryData ?? []}
                  categoryMetadata={categoryMetadata ?? []}
                  isVisible={isOpen}
                  readOnly={true}
                />
                <AccountPickerCard
                  label="إلى حساب (المدين)"
                  value={toPicker}
                  onChange={() => {}}
                  clients={clients}
                  employees={employees}
                  treasuryData={treasuryData ?? []}
                  categoryMetadata={categoryMetadata ?? []}
                  isVisible={isOpen}
                  readOnly={true}
                />
              </>
            )}
          </div>
        </section>

        <div className="border-t border-border" />

        {/* ============ DETAILS ============ */}
        <section>
          <div className="flex items-center gap-2 mb-2.5">
            <CheckCircle2 className="h-4 w-4 text-status-success-text shrink-0" />
            <span className="text-sm font-bold text-text-primary">التفاصيل</span>
          </div>

          <div className="space-y-3.5">
            {/* Amount + Date + Time row */}
            <div className="grid grid-cols-12 gap-2.5">
              <div className="col-span-5">
                <label className="block text-xs font-bold text-text-secondary mb-1.5">
                  المبلغ <span className="text-status-danger-text">*</span>
                </label>
                <div className="relative">
                  <NumberInput
                    value={amount}
                    onChange={(val: any) => setAmount(typeof val === 'string' ? val : val?.target?.value ?? '')}
                    placeholder="0.00"
                    min={0}
                    step="0.01"
                    disabled={!isEditing}
                    className="w-full text-left font-mono font-bold disabled:opacity-85 disabled:cursor-not-allowed"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-text-secondary/60">
                    ر.س
                  </span>
                </div>
              </div>

              <div className="col-span-4">
                <label className="block text-xs font-bold text-text-secondary mb-1.5">
                  التاريخ <span className="text-status-danger-text">*</span>
                </label>
                <input
                  type="date"
                  value={datePart}
                  onChange={(e) => setDatePart(e.target.value)}
                  disabled={!isEditing}
                  className="base-input w-full rounded-lg border border-border-default bg-background p-2.5 text-xs font-medium text-text-primary disabled:opacity-85 disabled:cursor-not-allowed"
                />
              </div>

              <div className="col-span-3">
                <label className="block text-xs font-bold text-text-secondary mb-1.5">
                  الوقت (HH:MM:SS)
                </label>
                <input
                  type="time"
                  step="1"
                  dir="ltr"
                  value={timePart}
                  onChange={(e) => setTimePart(e.target.value)}
                  disabled={!isEditing}
                  className="base-input w-full text-center font-mono text-xs rounded-lg border border-border-default bg-background p-2.5 disabled:opacity-85 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1.5">
                البيان / الوصف <span className="text-status-danger-text">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="اكتب بيان المعاملة..."
                rows={2}
                disabled={!isEditing}
                className="w-full rounded-lg border border-border-default bg-background p-2.5 text-xs font-medium text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:ring-1 focus:ring-primary-500/20 focus:border-primary-500/40 transition-all resize-none disabled:opacity-85 disabled:cursor-not-allowed"
              />
            </div>

            {/* Reason for edit (Visible only when editing) */}
            {isEditing && (
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1.5">
                  سبب التعديل <span className="text-status-danger-text">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="مطلوب للمراجعة وسجل التدقيق..."
                  rows={2}
                  className="w-full rounded-lg border border-border-default bg-background p-2.5 text-xs font-medium text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:ring-1 focus:ring-primary-500/20 focus:border-primary-500/40 transition-all resize-none"
                />
              </div>
            )}
          </div>
        </section>

        {/* ============ FOOTER ============ */}
        <div className="unified-tx-footer flex items-center justify-between p-3.5 -mx-6 -mb-6 mt-4 rounded-b-xl border-t">
          {/* Cancel / Close */}
          <Button
            type="button"
            variant="outline-danger"
            size="sm"
            onClick={isEditing ? () => setIsEditing(false) : handleClose}
          >
            {isEditing ? 'إلغاء التعديل' : 'إغلاق'}
          </Button>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <>
                <Button
                  type="button"
                  variant="outline-primary"
                  size="sm"
                  onClick={() => openModal('voucherPreview', { transactionId: rawTxn.id })}
                  className="flex items-center gap-1.5 text-xs font-bold"
                  title="طباعة السند"
                >
                  <Printer size={14} />
                  <span>طباعة السند</span>
                </Button>

                {isAdmin() && (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    className="!bg-emerald-600 hover:!bg-emerald-700 !text-white font-bold flex items-center gap-1.5 shadow-sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Pencil size={13} />
                    <span>تعديل المعاملة</span>
                  </Button>
                )}
              </>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={updateTransaction.isPending}
                className="!bg-emerald-600 hover:!bg-emerald-700 !text-white font-bold shadow-sm"
                onClick={handleSave}
              >
                {updateTransaction.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    جاري الحفظ...
                  </span>
                ) : (
                  'حفظ التعديل'
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </BaseModal>
  );
};

export default VoucherDetailsModal;
