/**
 * UnifiedTransactionModal
 *
 * Single-screen transaction entry between any two account types.
 * All account selection, amount, description, date, category and notes
 * live on one sheet — a live summary strip confirms the transaction
 * as fields fill in, so confirming is a glance, not a navigation.
 */

import { useState, useEffect, useMemo } from 'react';
import BaseModal from '@/shared/ui/layout/BaseModal';
import Button from '@/shared/ui/primitives/Button';
import { NumberInput } from '@/shared/ui/primitives/NumberInput';
import { DateInput } from '@/shared/ui/primitives/DateInput';
import { Card, CardContent } from '@/shared/ui/shadcn/card';
import { useModalStore } from '@/shared/stores/modalStore';
import {
  useGetAccountsByType,
  useCreateUnifiedTransaction,
} from '@/features/financials/api/financialCenterQueries';
import { useGetTreasuryAccounts, useGetCategoryMetadata } from '@/features/financials/api/treasuryQueries';
import { useToast } from '@/shared/hooks/useToast';
import AccountPickerCard from './AccountPickerCard';
import type { PickerValue, PickerKind } from './AccountPickerCard';
// PickerKind: 'client' | 'employee' | 'cashbox' | 'bank'
// PickerValue: { kind, accountId, categorySlug }
import {
  ArrowLeftRight,
  Loader2,
  CheckCircle2,
  CircleDashed,
  RotateCcw,
} from 'lucide-react';
import type { AccountType, TreasuryAccount } from '@/api/types';

// ========================================
// Types
// ========================================

type Step = 1 | 2 | 3;

// ========================================
// Constants
// ========================================

const CATEGORY_OPTIONS = [
  { value: 'salary', label: 'Salary' },
  { value: 'commission', label: 'Commission' },
  { value: 'loan', label: 'Loan' },
  { value: 'expense', label: 'Expense' },
  { value: 'advance_repayment', label: 'Advance Repayment' },
  { value: 'loan_repayment', label: 'Loan Repayment' },
  { value: 'other', label: 'Other' },
] as const;

type TransactionCategory = (typeof CATEGORY_OPTIONS)[number]['value'];

// ========================================
// Component
// ========================================

const UnifiedTransactionModal = () => {
  const { isOpen, modalType, props, closeModal } = useModalStore();
  const { success, error: toastError } = useToast();
  const createTransaction = useCreateUnifiedTransaction();

  // Only render when this modal is active
  const isVisible = isOpen && modalType === 'unifiedTransaction';

  // Read preset defaults from modal store props
  const defaultFromCardType = props?.defaultFromCardType as string | undefined;
  const defaultToCardType = props?.defaultToCardType as string | undefined;
  const defaultFromAccountId = (props?.defaultFromAccountId as string | undefined) ?? '';
  const defaultToAccountId = (props?.defaultToAccountId as string | undefined) ?? '';
  const lockDirection = Boolean(props?.lockDirection);
  const customTitle = props?.title as string | undefined;

  const hasPresets = Boolean(defaultFromCardType && defaultToCardType);

  // Convert card type preset → PickerKind
  const presetToPickerKind = (cardType: string | undefined): PickerKind | null => {
    if (cardType === 'client') return 'client';
    if (cardType === 'employee') return 'employee';
    if (cardType === 'cashbox' || cardType === 'company_cashbox') return 'cashbox';
    if (cardType === 'bank') return 'bank';
    if (cardType === 'settlement') return 'settlement';
    return null;
  };

  // Initial state uses presetToPickerKind (safe, no treasuryData dependency).
  // The re-initialize effect below resolves 'treasury' → cashbox/bank once data loads.
  const initialFromPicker: PickerValue = {
    kind: presetToPickerKind(defaultFromCardType),
    accountId: defaultFromAccountId,
    categorySlug: null,
  };
  const initialToPicker: PickerValue = {
    kind: presetToPickerKind(defaultToCardType),
    accountId: defaultToAccountId,
    categorySlug: null,
  };

  // ---- Multi-step state ----
  const [step, setStep] = useState<Step>(hasPresets ? 1 : 1);
  const [fromPicker, setFromPicker] = useState<PickerValue>(initialFromPicker);
  const [toPicker, setToPicker] = useState<PickerValue>(initialToPicker);
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [autoDescription, setAutoDescription] = useState<string>('');
  const [effectiveDate, setEffectiveDate] = useState<string>(
    new Date().toISOString().split('T')[0],
  );
  const [category, setCategory] = useState<TransactionCategory>('other');
  const [notes, setNotes] = useState<string>('');
  const [initialized, setInitialized] = useState<boolean>(false);

  // ---- Fetch accounts ----
  const { data: clientsData } = useGetAccountsByType('client', {}, isVisible);
  const { data: treasuryData } = useGetTreasuryAccounts();
  const { data: categoryMetadata } = useGetCategoryMetadata();

  const clients = useMemo(() => clientsData?.accounts ?? [], [clientsData]);

  // ---- Auto-resolve settlement account ID when treasury data loads ----
  useEffect(() => {
    if (!isVisible || !treasuryData || treasuryData.length === 0) return;
    // No longer auto-resolving settlement — removed from picker
  }, [treasuryData, isVisible]);

  // ---- Re-initialize when modal opens with new props ----
  useEffect(() => {
    if (isVisible && !initialized) {
      const fType = (props?.defaultFromCardType as string | undefined) ?? '';
      const tType = (props?.defaultToCardType as string | undefined) ?? '';
      const fId = (props?.defaultFromAccountId as string | undefined) ?? '';
      const tId = (props?.defaultToAccountId as string | undefined) ?? '';

      // If we have a preset treasury type but treasuryData is not loaded yet, wait for it
      const needsTreasuryData = fType === 'treasury' || tType === 'treasury' || fType === 'settlement' || tType === 'settlement';
      if (needsTreasuryData && (!treasuryData || treasuryData.length === 0)) {
        return;
      }

      const fKind = (() => {
        if (fType === 'treasury' && fId && treasuryData?.length) {
          const acc = treasuryData.find((t) => String(t.id) === fId);
          if (acc?.sub_type === 'cashbox') return 'cashbox' as PickerKind;
          if (acc?.sub_type === 'bank') return 'bank' as PickerKind;
        }
        return presetToPickerKind(fType);
      })();
      const tKind = (() => {
        if (tType === 'treasury' && tId && treasuryData?.length) {
          const acc = treasuryData.find((t) => String(t.id) === tId);
          if (acc?.sub_type === 'cashbox') return 'cashbox' as PickerKind;
          if (acc?.sub_type === 'bank') return 'bank' as PickerKind;
        }
        return presetToPickerKind(tType);
      })();

      // Resolve categorySlug from treasury data if kind is cashbox or bank
      const resolveCategory = (kind: PickerKind | null, accountId: string) => {
        if ((kind === 'cashbox' || kind === 'bank') && accountId && treasuryData?.length) {
          const acc = treasuryData.find((t) => String(t.id) === accountId);
          if (acc) return acc.sub_type || null;
        }
        return null;
      };

      const fCategory = resolveCategory(fKind, fId);
      const tCategory = resolveCategory(tKind, tId);

      setStep(1);
      setFromPicker({
        kind: fKind,
        accountId: fId,
        categorySlug: fCategory,
      });
      setToPicker({
        kind: tKind,
        accountId: tId,
        categorySlug: tCategory,
      });
      setAmount('');
      setDescription('');
      setAutoDescription('');
      setEffectiveDate(new Date().toISOString().split('T')[0]);
      setCategory('other');
      setNotes('');
      setInitialized(true);
    }
  }, [isVisible, initialized, props, treasuryData]);

  // ---- Resolve account type from PickerValue ----
  const resolveFromPickerType = (pv: PickerValue): AccountType | null => {
    if (!pv.kind || !pv.accountId) return null;
    if (pv.kind === 'client') return 'client';
    if (pv.kind === 'employee') return 'employee';
    if (pv.kind === 'cashbox' || pv.kind === 'bank' || pv.kind === 'settlement') return 'treasury';
    return null;
  };

  const resolvedFromType = resolveFromPickerType(fromPicker);
  const resolvedToType = resolveFromPickerType(toPicker);

  // ---- Stepper (kept internally to preserve isStepComplete/canGoNext contract) ----
  const steps: { num: Step; label: string }[] = [
    { num: 1, label: 'Account' },
    { num: 2, label: 'Details' },
    { num: 3, label: 'Review' },
  ];
  const displayDescription = description + autoDescription;

  const isStepComplete = (s: Step): boolean => {
    switch (s) {
      case 1:
        return fromPicker.accountId !== '' && toPicker.accountId !== '' &&
          resolvedFromType !== null && resolvedToType !== null;
      case 2:
        return amount !== '' && parseFloat(amount) > 0 && displayDescription.trim() !== '';
      case 3:
        return true;
    }
  };

  const accountsReady = isStepComplete(1);
  const detailsReady = isStepComplete(2);
  const canSubmit = accountsReady && detailsReady;

  const handleNext = () => {
    if (step === 1) setStep(2);
    else if (step === 2) setStep(3);
  };

  const handleBack = () => {
    if (step === 1) { handleClose(); return; }
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  };

  // ---- Submit ----
  const handleSubmit = async () => {
    if (!resolvedFromType || !resolvedToType || !fromPicker.accountId || !toPicker.accountId || !amount || !displayDescription.trim()) {
      return;
    }

    try {
      await createTransaction.mutateAsync({
        from_account_type: resolvedFromType,
        from_account_id: Number(fromPicker.accountId),
        to_account_type: resolvedToType,
        to_account_id: Number(toPicker.accountId),
        amount: parseFloat(amount),
        description: displayDescription.trim(),
        effective_date: effectiveDate ? `${effectiveDate}T12:00:00` : undefined,
        category: category,
        notes: notes.trim() || undefined,
      });

      success('تم تسجيل المعاملة بنجاح');
      handleClose();
    } catch (err: any) {
      toastError(
        'فشلت العملية',
        err?.response?.data?.message || err?.message || 'حدث خطأ غير متوقع',
      );
    }
  };

  // ---- Save & New: submit, then immediately reopen fresh with same from/to ----
  const handleSaveAndNew = async () => {
    if (!resolvedFromType || !resolvedToType || !fromPicker.accountId || !toPicker.accountId || !amount || !displayDescription.trim()) {
      return;
    }

    try {
      await createTransaction.mutateAsync({
        from_account_type: resolvedFromType,
        from_account_id: Number(fromPicker.accountId),
        to_account_type: resolvedToType,
        to_account_id: Number(toPicker.accountId),
        amount: parseFloat(amount),
        description: displayDescription.trim(),
        effective_date: effectiveDate ? `${effectiveDate}T12:00:00` : undefined,
        category: category,
        notes: notes.trim() || undefined,
      });

      success('تم التسجيل — جاهز للمعاملة التالية');
      // Keep from/to pair, clear the rest for rapid repeat entry
      setAmount('');
      setDescription('');
      setAutoDescription('');
      setNotes('');
      setEffectiveDate(new Date().toISOString().split('T')[0]);
      setCategory('other');
    } catch (err: any) {
      toastError(
        'فشلت العملية',
        err?.response?.data?.message || err?.message || 'حدث خطأ غير متوقع',
      );
    }
  };

  // ---- Reset on open/close ----
  const handleClose = () => {
    setStep(1);
    setFromPicker({ kind: null, accountId: '', categorySlug: null });
    setToPicker({ kind: null, accountId: '', categorySlug: null });
    setAmount('');
    setDescription('');
    setAutoDescription('');
    setEffectiveDate(new Date().toISOString().split('T')[0]);
    setCategory('other');
    setNotes('');
    setInitialized(false);
    closeModal();
  };

  // ---- Format helpers ----
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);

  // ---- Lookup helper for summary strip ----
  const getPickerLabel = (pv: PickerValue): string => {
    if (!pv.kind || !pv.accountId) return '';
    if (pv.kind === 'client') {
      const c = clients.find((a) => String(a.id) === pv.accountId);
      return c?.name ?? `عميل #${pv.accountId}`;
    }
    if (pv.kind === 'employee') {
      const e = employeesRaw?.accounts?.find((a: any) => String(a.id) === pv.accountId);
      return e?.name ?? `موظف #${pv.accountId}`;
    }
    if (pv.kind === 'cashbox' || pv.kind === 'bank' || pv.kind === 'settlement') {
      const a = (treasuryData ?? []).find((t) => String(t.id) === pv.accountId);
      return a?.name ?? `حساب #${pv.accountId}`;
    }
    return '';
  };

  const getPickerKindLabel = (pv: PickerValue): string => {
    if (!pv.kind) return '';
    if (pv.kind === 'client') return 'عميل';
    if (pv.kind === 'employee') return 'موظف';
    if (pv.kind === 'cashbox') return 'صندوق';
    if (pv.kind === 'bank') return 'بنك';
    if (pv.kind === 'settlement') return 'تسوية';
    return '';
  };

  // ---- Fetch employees for the picker ----
  const { data: employeesRaw } = useGetAccountsByType('employee', {}, isVisible);
  const employees = useMemo(() => employeesRaw?.accounts ?? [], [employeesRaw]);

  const fromName = getPickerLabel(fromPicker);
  const toName = getPickerLabel(toPicker);
  const fromKindLabel = getPickerKindLabel(fromPicker);
  const toKindLabel = getPickerKindLabel(toPicker);


  // ---- Auto-generate description suffix from from/to accounts ----
  useEffect(() => {
    if (fromName && toName && fromPicker.accountId && toPicker.accountId) {
      setAutoDescription(`\n\nمن ${fromKindLabel}: ${fromName}\nالى ${toKindLabel}: ${toName}`);
    } else {
      setAutoDescription('');
    }
  }, [fromName, toName, fromKindLabel, toKindLabel, fromPicker.accountId, toPicker.accountId]);

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (autoDescription && val.endsWith(autoDescription)) {
      setDescription(val.slice(0, -autoDescription.length));
    } else {
      setDescription(val);
      setAutoDescription('');
    }
  };

  const categoryLabel = CATEGORY_OPTIONS.find((c) => c.value === category)?.label ?? category;

  // ---- Main render: single-sheet layout ----
  return (
    <BaseModal
      isOpen={isVisible}
      onClose={handleClose}
      title={customTitle || 'معاملة مالية'}
    >
      <div dir="rtl" className="space-y-5">
        {/* ============ ACCOUNTS ============ */}
        <section>
          <div className="flex items-center gap-2 mb-2.5">
            {accountsReady ? (
              <CheckCircle2 className="h-4 w-4 text-status-success-text shrink-0" />
            ) : (
              <CircleDashed className="h-4 w-4 text-text-secondary shrink-0" />
            )}
            <span className="text-sm font-bold text-text-primary">الحسابات</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <AccountPickerCard
              label="إلى"
              value={toPicker}
              onChange={setToPicker}
              clients={clients}
              employees={employees}
              treasuryData={treasuryData ?? []}
              categoryMetadata={categoryMetadata ?? []}
              presetKind={(() => {
                if (defaultToCardType === 'treasury' && defaultToAccountId && treasuryData?.length) {
                  const acc = treasuryData.find((t) => String(t.id) === defaultToAccountId);
                  if (acc?.sub_type === 'cashbox') return 'cashbox' as PickerKind;
                  if (acc?.sub_type === 'bank') return 'bank' as PickerKind;
                }
                return presetToPickerKind(defaultToCardType);
              })()}
              isVisible={isVisible}
            />
            <AccountPickerCard
              label="من"
              value={fromPicker}
              onChange={setFromPicker}
              clients={clients}
              employees={employees}
              treasuryData={treasuryData ?? []}
              categoryMetadata={categoryMetadata ?? []}
              presetKind={(() => {
                if (defaultFromCardType === 'treasury' && defaultFromAccountId && treasuryData?.length) {
                  const acc = treasuryData.find((t) => String(t.id) === defaultFromAccountId);
                  if (acc?.sub_type === 'cashbox') return 'cashbox' as PickerKind;
                  if (acc?.sub_type === 'bank') return 'bank' as PickerKind;
                }
                return presetToPickerKind(defaultFromCardType);
              })()}
              isVisible={isVisible}
            />
          </div>
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
            {/* Amount — largest, boldest field on the sheet */}
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1.5">
                المبلغ <span className="text-status-danger-text">*</span>
              </label>
              <div className="relative">
                <NumberInput
                  name="amount"
                  label=""
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="text-2xl font-extrabold h-14 pl-16"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-text-secondary pointer-events-none">
                  SAR
                </span>
              </div>
            </div>

            {/* Description — full width, primary text field */}
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1.5">
                الوصف <span className="text-status-danger-text">*</span>
              </label>
              <textarea
                value={displayDescription}
                onChange={handleDescriptionChange}
                maxLength={255}
                rows={5}
                className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500 resize-none"
                placeholder="مثال: دفعة راتب، تحويل عمولة..."
                required
              />
            </div>

            {/* Date + Category — paired, secondary priority */}
            <div className="grid grid-cols-2 gap-3">
              <DateInput
                name="effectiveDate"
                label="تاريخ التنفيذ"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
              />
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1.5">
                  التصنيف
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as TransactionCategory)}
                  className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes — collapsed priority, optional */}
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1.5">
                ملاحظات <span className="font-normal text-text-secondary/70">(اختياري)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={1000}
                rows={2}
                className="w-full resize-none rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500"
                placeholder="ملاحظات إضافية..."
              />
            </div>
          </div>
        </section>

        {/* ============ LIVE SUMMARY STRIP ============ */}
        {(fromName || toName || amount) && (
          <Card className="border-2 border-primary-500/20 bg-primary-500/[0.03] overflow-hidden">
            <CardContent className="p-3.5">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0 text-right">
                  <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wide">
                    {fromKindLabel || 'من'}
                  </div>
                  <div className="text-sm font-bold text-text-primary truncate">
                    {fromName || '—'}
                  </div>
                </div>
                <ArrowLeftRight className="h-4 w-4 text-primary-500 shrink-0" />
                <div className="flex-1 min-w-0 text-right">
                  <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wide">
                    {toKindLabel || 'إلى'}
                  </div>
                  <div className="text-sm font-bold text-text-primary truncate">
                    {toName || '—'}
                  </div>
                </div>
                <div className="w-px h-9 bg-border shrink-0" />
                <div className="text-right shrink-0">
                  <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wide">
                    المبلغ
                  </div>
                  <div className="text-lg font-extrabold text-primary-500 whitespace-nowrap">
                    {formatCurrency(parseFloat(amount) || 0)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error message from submission */}
        {createTransaction.isError && (
          <div className="rounded-lg border border-status-danger-border bg-status-danger-bg p-3">
            <p className="text-sm font-semibold text-status-danger-text text-right">
              {(createTransaction.error as any)?.response?.data?.message ||
                createTransaction.error?.message ||
                'حدث خطأ أثناء تسجيل المعاملة.'}
            </p>
          </div>
        )}

        {/* ============ ACTIONS ============ */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-border">
          <Button
            type="button"
            variant="outline-info"
            onClick={handleClose}
            disabled={createTransaction.isPending}
          >
            إلغاء
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline-info"
              onClick={handleSaveAndNew}
              disabled={!canSubmit || createTransaction.isPending}
              title="حفظ وتسجيل معاملة أخرى بنفس الحسابات"
            >
              <RotateCcw className="h-4 w-4" />
              حفظ وجديد
            </Button>

            <Button
              type="button"
              variant="primary"
              onClick={handleSubmit}
              disabled={!canSubmit || createTransaction.isPending}
              isLoading={createTransaction.isPending}
              className="min-w-[140px]"
            >
              {createTransaction.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جارٍ الإرسال...
                </>
              ) : (
                'تأكيد المعاملة'
              )}
            </Button>
          </div>
        </div>
      </div>
    </BaseModal>
  );
};

export default UnifiedTransactionModal;