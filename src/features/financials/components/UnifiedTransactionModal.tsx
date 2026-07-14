/**
 * UnifiedTransactionModal
 *
 * Single-screen transaction entry between any two account types.
 * - Direction toggle (قبض / صرف) at the top swaps from/to
 * - Settlement side renders nothing (clean, hidden)
 * - Account pickers: من (right in RTL) → إلى (left in RTL)
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
import type { AccountType } from '@/api/types';

// ========================================
// Types
// ========================================

type Step = 1 | 2 | 3;

/**
 * Direction: 'qabdh' = incoming (قبض), 'sarf' = outgoing (صرف)
 * When settlement is involved: 'qabdh' = تسوية قبض, 'sarf' = تسوية صرف
 */
type Direction = 'qabdh' | 'sarf';

// ========================================
// Component
// ========================================

const UnifiedTransactionModal = () => {
  const { isOpen, modalType, props, closeModal } = useModalStore();
  const { success, error: toastError } = useToast();
  const createTransaction = useCreateUnifiedTransaction();

  const isVisible = isOpen && modalType === 'unifiedTransaction';

  // Read preset defaults from modal store props
  const defaultFromCardType = props?.defaultFromCardType as string | undefined;
  const defaultToCardType = props?.defaultToCardType as string | undefined;
  const defaultFromAccountId = (props?.defaultFromAccountId as string | undefined) ?? '';
  const defaultToAccountId = (props?.defaultToAccountId as string | undefined) ?? '';

  // ---- Settlement detection ----
  const isSettlement =
    defaultFromCardType === 'settlement' || defaultToCardType === 'settlement';

  // Convert card type preset → PickerKind
  const presetToPickerKind = (cardType: string | undefined): PickerKind | null => {
    if (cardType === 'client') return 'client';
    if (cardType === 'employee') return 'employee';
    if (cardType === 'cashbox' || cardType === 'company_cashbox') return 'cashbox';
    if (cardType === 'bank') return 'bank';
    if (cardType === 'settlement') return 'settlement';
    return null;
  };

  // ---- State ----
  const [direction, setDirection] = useState<Direction>(() => {
    const modalTitle = (props?.title as string | undefined) || '';
    if (defaultFromCardType === 'settlement') return 'qabdh';
    if (defaultToCardType === 'settlement') return 'sarf';
    if (defaultToCardType === 'treasury' || defaultToCardType === 'cashbox') return 'qabdh';
    if (modalTitle.includes('قبض')) return 'qabdh';
    if (modalTitle.includes('صرف')) return 'sarf';
    return 'sarf';
  });
  const [fromPicker, setFromPicker] = useState<PickerValue>({
    kind: presetToPickerKind(defaultFromCardType),
    accountId: defaultFromAccountId,
    categorySlug: null,
  });
  const [toPicker, setToPicker] = useState<PickerValue>({
    kind: presetToPickerKind(defaultToCardType),
    accountId: defaultToAccountId,
    categorySlug: null,
  });
  // Preset kind locks — travel with the picker on swaps
  const [fromPresetKind, setFromPresetKind] = useState<PickerKind | null>(null);
  const [toPresetKind, setToPresetKind] = useState<PickerKind | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [autoDescription, setAutoDescription] = useState<string>('');
  const [effectiveDate, setEffectiveDate] = useState<string>(
    new Date().toISOString().split('T')[0],
  );
  const [initialized, setInitialized] = useState<boolean>(false);

  // ---- Fetch accounts ----
  const { data: clientsData } = useGetAccountsByType('client', {}, isVisible);
  const { data: treasuryData } = useGetTreasuryAccounts();
  const { data: categoryMetadata } = useGetCategoryMetadata();
  const { data: employeesRaw } = useGetAccountsByType('employee', {}, isVisible);

  const clients = useMemo(() => clientsData?.accounts ?? [], [clientsData]);
  const employees = useMemo(() => employeesRaw?.accounts ?? [], [employeesRaw]);

  // ---- Re-initialize when modal opens with new props ----
  useEffect(() => {
    if (isVisible && !initialized) {
      const fType = (props?.defaultFromCardType as string | undefined) ?? '';
      const tType = (props?.defaultToCardType as string | undefined) ?? '';
      const fId = (props?.defaultFromAccountId as string | undefined) ?? '';
      const tId = (props?.defaultToAccountId as string | undefined) ?? '';

      const needsTreasuryData =
        fType === 'treasury' || tType === 'treasury' ||
        fType === 'settlement' || tType === 'settlement';
      if (needsTreasuryData && (!treasuryData || treasuryData.length === 0)) return;

      const resolveKind = (type: string, id: string): PickerKind | null => {
        if (type === 'treasury' && id && treasuryData?.length) {
          const acc = treasuryData.find((t) => String(t.id) === id);
          if (acc?.sub_type === 'cashbox') return 'cashbox';
          if (acc?.sub_type === 'bank') return 'bank';
        }
        return presetToPickerKind(type);
      };

      const resolveCategory = (kind: PickerKind | null, id: string) => {
        if ((kind === 'cashbox' || kind === 'bank') && id && treasuryData?.length) {
          const acc = treasuryData.find((t) => String(t.id) === id);
          if (acc) return acc.sub_type || null;
        }
        return null;
      };

      // Helper to find settlement account id
      const getSettlementId = (): string => {
        const settlementAcc = treasuryData?.find(
          (t) =>
            typeof t.metadata === 'object' &&
            t.metadata !== null &&
            ((t.metadata as any).is_settlement === true ||
              (t.metadata as any).is_settlement === 'true' ||
              (t.metadata as any).type === 'settlement')
        );
        return settlementAcc ? String(settlementAcc.id) : '';
      };

      const resolvedFromId = fType === 'settlement' ? getSettlementId() : fId;
      const resolvedToId = tType === 'settlement' ? getSettlementId() : tId;

      const fKind = resolveKind(fType, resolvedFromId);
      const tKind = resolveKind(tType, resolvedToId);

      // Determine initial direction from props: card types, or modal title parameter
      const modalTitle = (props?.title as string | undefined) || '';
      const initDir: Direction =
        fType === 'settlement' ? 'qabdh'
        : tType === 'settlement' ? 'sarf'
        : (tType === 'treasury' || tType === 'cashbox') ? 'qabdh'
        : modalTitle.includes('قبض') ? 'qabdh'
        : modalTitle.includes('صرف') ? 'sarf'
        : 'sarf';

      // Preset kind = the resolved kind only when that side has a pre-selected account id
      const fPreset: PickerKind | null = resolvedFromId ? fKind : null;
      const tPreset: PickerKind | null = resolvedToId ? tKind : null;

      setDirection(initDir);
      setFromPicker({ kind: fKind, accountId: resolvedFromId, categorySlug: resolveCategory(fKind, resolvedFromId) });
      setToPicker({ kind: tKind, accountId: resolvedToId, categorySlug: resolveCategory(tKind, resolvedToId) });
      setFromPresetKind(fPreset);
      setToPresetKind(tPreset);
      setAmount('');
      setDescription('');
      setAutoDescription('');
      setEffectiveDate(new Date().toISOString().split('T')[0]);
      setInitialized(true);
    }
  }, [isVisible, initialized, props, treasuryData]);

  // ---- Direction toggle: swap from ↔ to (presets travel with their pickers) ----
  const handleDirectionToggle = (newDir: Direction) => {
    if (newDir === direction) return;
    setDirection(newDir);
    // Swap pickers
    setFromPicker(toPicker);
    setToPicker(fromPicker);
    // Swap their associated preset locks
    setFromPresetKind(toPresetKind);
    setToPresetKind(fromPresetKind);
  };

  // ---- Resolve account type from PickerValue ----
  const resolvePickerType = (pv: PickerValue): AccountType | null => {
    if (!pv.kind || !pv.accountId) return null;
    if (pv.kind === 'client') return 'client';
    if (pv.kind === 'employee') return 'employee';
    if (pv.kind === 'cashbox' || pv.kind === 'bank' || pv.kind === 'settlement' || pv.kind === 'other') return 'treasury';
    return null;
  };

  const resolvedFromType = resolvePickerType(fromPicker);
  const resolvedToType = resolvePickerType(toPicker);

  const displayDescription = description + autoDescription;

  const accountsReady =
    fromPicker.accountId !== '' && toPicker.accountId !== '' &&
    resolvedFromType !== null && resolvedToType !== null;
  const detailsReady =
    amount !== '' && parseFloat(amount) > 0 && displayDescription.trim() !== '';
  const canSubmit = accountsReady && detailsReady;

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
      });

      success('تم التسجيل — جاهز للمعاملة التالية');
      // Keep from/to pair, clear the rest for rapid repeat entry
      setAmount('');
      setDescription('');
      setAutoDescription('');
      setEffectiveDate(new Date().toISOString().split('T')[0]);
    } catch (err: any) {
      toastError(
        'فشلت العملية',
        err?.response?.data?.message || err?.message || 'حدث خطأ غير متوقع',
      );
    }
  };

  // ---- Reset on open/close ----
  const handleClose = () => {
    setFromPicker({ kind: null, accountId: '', categorySlug: null });
    setToPicker({ kind: null, accountId: '', categorySlug: null });
    setFromPresetKind(null);
    setToPresetKind(null);
    setAmount('');
    setDescription('');
    setAutoDescription('');
    setEffectiveDate(new Date().toISOString().split('T')[0]);
    setInitialized(false);
    setDirection('sarf');
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
    if (pv.kind === 'cashbox' || pv.kind === 'bank' || pv.kind === 'settlement' || pv.kind === 'other') {
      const a = (treasuryData ?? []).find((t) => String(t.id) === pv.accountId);
      return a?.name ?? `حساب #${pv.accountId}`;
    }
    return '';
  };

  const getPickerKindLabel = (pv: PickerValue): string => {
    if (!pv.kind) return '';
    const map: Record<string, string> = { client: 'عميل', employee: 'موظف', cashbox: 'صندوق', bank: 'بنك', settlement: 'تسوية', other: 'حساب آخر' };
    return map[pv.kind] ?? '';
  };

  const fromName = getPickerLabel(fromPicker);
  const toName = getPickerLabel(toPicker);
  const fromKindLabel = getPickerKindLabel(fromPicker);
  const toKindLabel = getPickerKindLabel(toPicker);
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

  // ---- Settlement / presetKind helpers ----
  const fromIsSettlement = fromPicker.kind === 'settlement';
  const toIsSettlement = toPicker.kind === 'settlement';

  const resolvePresetKind = (cardType: string | undefined, accountId: string): PickerKind | null => {
    if (cardType === 'treasury' && accountId && treasuryData?.length) {
      const acc = treasuryData.find((t) => String(t.id) === accountId);
      if (acc?.sub_type === 'cashbox') return 'cashbox';
      if (acc?.sub_type === 'bank') return 'bank';
    }
    return presetToPickerKind(cardType);
  };

  const dirQabdhLabel = isSettlement ? 'تسوية قبض' : 'سند قبض';
  const dirSarfLabel = isSettlement ? 'تسوية صرف' : 'سند صرف';

  // ---- Active modal title follows direction ----
  const activeTitle = direction === 'qabdh' ? dirQabdhLabel : dirSarfLabel;

  // ---- Direction tabs — welded into modal header ----
  const directionTabs = (
    <div dir="rtl" className="flex gap-0 -mb-px">
      <button
        type="button"
        onClick={() => handleDirectionToggle('qabdh')}
        className={`
          cursor-pointer px-5 py-3 text-sm font-bold border-b-2 transition-all duration-150
          ${direction === 'qabdh'
            ? 'border-status-success-text text-status-success-text'
            : 'border-transparent text-text-muted hover:text-text-primary hover:border-border-strong'}
        `}
      >
        {dirQabdhLabel}
      </button>
      <button
        type="button"
        onClick={() => handleDirectionToggle('sarf')}
        className={`
          cursor-pointer px-5 py-3 text-sm font-bold border-b-2 transition-all duration-150
          ${direction === 'sarf'
            ? 'border-status-danger-text text-status-danger-text'
            : 'border-transparent text-text-muted hover:text-text-primary hover:border-border-strong'}
        `}
      >
        {dirSarfLabel}
      </button>
    </div>
  );


  // ---- Main render ----
  return (
    <BaseModal
      isOpen={isVisible}
      onClose={handleClose}
      title={activeTitle}
      headerContent={directionTabs}
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

          {/* من (right) → إلى (left) — settlement side is empty, counterparty always in col 1 */}
          <div className="grid grid-cols-2 gap-3">
            {isSettlement ? (
              <>
                {/* Counterparty picker — always first column, no kind lock */}
                <AccountPickerCard
                  label={fromIsSettlement ? 'إلى' : 'من'}
                  value={fromIsSettlement ? toPicker : fromPicker}
                  onChange={fromIsSettlement ? setToPicker : setFromPicker}
                  clients={clients}
                  employees={employees}
                  treasuryData={treasuryData ?? []}
                  categoryMetadata={categoryMetadata ?? []}
                  presetKind={null}
                  isVisible={isVisible}
                />
                {/* Empty second column */}
                <div />
              </>
            ) : (
              <>
                <AccountPickerCard
                  label="من"
                  value={fromPicker}
                  onChange={setFromPicker}
                  clients={clients}
                  employees={employees}
                  treasuryData={treasuryData ?? []}
                  categoryMetadata={categoryMetadata ?? []}
                  presetKind={fromPresetKind}
                  isVisible={isVisible}
                />
                <AccountPickerCard
                  label="إلى"
                  value={toPicker}
                  onChange={setToPicker}
                  clients={clients}
                  employees={employees}
                  treasuryData={treasuryData ?? []}
                  categoryMetadata={categoryMetadata ?? []}
                  presetKind={toPresetKind}
                  isVisible={isVisible}
                />
              </>
            )}
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
            {/* Amount + Date — same row, half/half */}
            <div className="grid grid-cols-2 gap-3">
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
                    className="text-lg font-extrabold h-11 pl-14"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-text-secondary pointer-events-none">
                    SAR
                  </span>
                </div>
              </div>
              <DateInput
                name="effectiveDate"
                label="تاريخ التنفيذ"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
              />
            </div>

            {/* Description — full width */}
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1.5">
                الوصف <span className="text-status-danger-text">*</span>
              </label>
              <textarea
                value={displayDescription}
                onChange={handleDescriptionChange}
                maxLength={255}
                rows={4}
                className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500 resize-none"
                placeholder="مثال: دفعة راتب، تحويل عمولة..."
                required
              />
            </div>
          </div>
        </section>

        {/* ============ LIVE SUMMARY STRIP ============ */}
        {(fromName || toName || fromIsSettlement || toIsSettlement || amount) && (
          <Card className="border-2 border-primary-500/20 bg-primary-500/[0.03] overflow-hidden">
            <CardContent className="p-3.5">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0 text-right">
                  <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wide">
                    {fromKindLabel || 'من'}
                  </div>
                  <div className="text-sm font-bold text-text-primary truncate">
                    {fromIsSettlement ? 'تسوية' : (fromName || '—')}
                  </div>
                </div>
                <ArrowLeftRight className="h-4 w-4 text-primary-500 shrink-0" />
                <div className="flex-1 min-w-0 text-right">
                  <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wide">
                    {toKindLabel || 'إلى'}
                  </div>
                  <div className="text-sm font-bold text-text-primary truncate">
                    {toIsSettlement ? 'تسوية' : (toName || '—')}
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