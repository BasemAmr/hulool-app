/**
 * UnifiedTransactionModal
 *
 * Single-screen transaction entry between any two account types.
 * - Account pickers: من حساب → إلى حساب
 * - Settlement side renders target account picker card row-wide
 */

import { useState, useEffect, useMemo } from 'react';
import BaseModal from '@/shared/ui/layout/BaseModal';
import Button from '@/shared/ui/primitives/Button';
import { NumberInput } from '@/shared/ui/primitives/NumberInput';
import { DateInput } from '@/shared/ui/primitives/DateInput';
import { useModalStore } from '@/shared/stores/modalStore';
import {
  useGetAccountsByType,
  useCreateUnifiedTransaction,
} from '@/features/financials/api/financialCenterQueries';
import { useGetTreasuryAccounts, useGetCategoryMetadata } from '@/features/financials/api/treasuryQueries';
import { useCanUseSettlement } from '@/features/financials/api/treasuryQueries';
import { useToast } from '@/shared/hooks/useToast';
import AccountPickerCard from './AccountPickerCard';
import type { PickerValue, PickerKind } from './AccountPickerCard';
import {
  classifySettlementDirection,
  isPersonCounterparty,
  isTreasuryCounterparty,
  type SettlementDirection,
  type SettlementAction,
} from '@/features/financials/utils/settlementPresets';
import {
  Loader2,
  CheckCircle2,
  CircleDashed,
  AlertCircle,
} from 'lucide-react';
import type { AccountType } from '@/api/types';

// ========================================
// Configuration / Feature Flags
// ========================================

/**
 * Feature flag: Disallow outgoing treasury transactions (صرف / from) if
 * the resulting balance after the transaction would become negative.
 * Set to false to disable this check and allow overdrafts.
 */
export const DISALLOW_NEGATIVE_TREASURY_BALANCE = true;

// ========================================
// Types
// ========================================

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

  // Single source of truth for settlement access. Every سند تسوية button in the app funnels
  // through this modal, so gating here means a new surface cannot leak the action by simply
  // forgetting the check. Individual call sites still hide their buttons for UX, but this is
  // what actually guarantees it. The server answers 403 regardless.
  const canUseSettlement = useCanUseSettlement();
  const settlementDenied = isSettlement && !canUseSettlement;

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
  const [fromPresetKind, setFromPresetKind] = useState<PickerKind | null>(null);
  const [toPresetKind, setToPresetKind] = useState<PickerKind | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  // Both parts default to the CURRENT local clock. Previously the date came from
  // toISOString() (UTC) while the submitted time came from toTimeString() (local),
  // so near midnight the two could describe different days.
  const nowLocalDate = () => {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  };
  const nowLocalTime = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  // The REST arg is validated as `date-time`, which REQUIRES seconds. The <input
  // type="time"> gives HH:MM only, so append :00 or WP rejects the request before it
  // ever reaches the service's normaliser.
  const buildEffectiveDateTime = (date: string, time: string) => {
    const hhmm = /^\d{2}:\d{2}$/.test(time) ? time : nowLocalTime();
    return `${date}T${hhmm}:00`;
  };

  const [effectiveDate, setEffectiveDate] = useState<string>(nowLocalDate);
  const [effectiveTime, setEffectiveTime] = useState<string>(nowLocalTime);
  const [voucherTypeOverride, setVoucherTypeOverride] = useState<'receipt' | 'expense' | ''>('');
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
    if (!isVisible) return;

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

    const modalTitle = (props?.title as string | undefined) || '';
    const initDir: Direction =
      fType === 'settlement' ? 'qabdh'
      : tType === 'settlement' ? 'sarf'
      : (tType === 'treasury' || tType === 'cashbox') ? 'qabdh'
      : modalTitle.includes('قبض') ? 'qabdh'
      : modalTitle.includes('صرف') ? 'sarf'
      : 'sarf';

    const fPreset: PickerKind | null = resolvedFromId ? fKind : null;
    const tPreset: PickerKind | null = resolvedToId ? tKind : null;

    setDirection(initDir);
    setFromPicker({ kind: fKind, accountId: resolvedFromId, categorySlug: resolveCategory(fKind, resolvedFromId) });
    setToPicker({ kind: tKind, accountId: resolvedToId, categorySlug: resolveCategory(tKind, resolvedToId) });
    setFromPresetKind(fPreset);
    setToPresetKind(tPreset);
    setAmount('');
    setDescription('');
    setEffectiveDate(nowLocalDate());
    setEffectiveTime(nowLocalTime());
  }, [isVisible, props, treasuryData]);

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
  // Live settlement orientation — plain const per render (no state/effect).
  // Feeds the banner + the invalid-only save gate. The title itself NEVER
  // changes after open (opener's promise); the swap effect below moves the
  // picker sides instead, so the fixed title stays true.
  const liveDirection: SettlementDirection = classifySettlementDirection(
    fromPicker.kind,
    toPicker.kind,
  );

  // ---- Declared تسوية action (opener intent; explicit prop wins, تسوية
  // titles fall back; سند titles declare nothing and never auto-orient) ----
  const declaredSettlementAction: SettlementAction | null =
    (props?.settlementAction as SettlementAction | undefined) ??
    (isSettlement && (props?.title as string | undefined)?.includes('تسوية قبض') ? 'qabd'
      : isSettlement && (props?.title as string | undefined)?.includes('تسوية صرف') ? 'sarf'
      : null);

  // ---- Dynamic orientation: the counterparty card follows action × family ----
  // قبض + person → person is FROM; قبض + treasury → treasury is TO; صرف mirrors.
  // When the live kinds disagree (user flipped the counterparty family after
  // open), swap both picker states wholesale — kind+id travel together, so the
  // fixed title stays true and nothing is ever posted to the wrong side.
  const liveSettlementSide: 'from' | 'to' | null =
    fromPicker.kind === 'settlement' ? 'from' : toPicker.kind === 'settlement' ? 'to' : null;
  const liveCounterpartyKind =
    liveSettlementSide === 'from' ? toPicker.kind : liveSettlementSide === 'to' ? fromPicker.kind : null;
  useEffect(() => {
    if (!declaredSettlementAction || !liveSettlementSide || !liveCounterpartyKind) return;
    const person = isPersonCounterparty(liveCounterpartyKind);
    const treasury = isTreasuryCounterparty(liveCounterpartyKind);
    if (!person && !treasury) return;
    // Desired side for the COUNTERPARTY under the declared action.
    const desiredCounterpartySide: 'from' | 'to' =
      declaredSettlementAction === 'qabd' ? (person ? 'from' : 'to') : (person ? 'to' : 'from');
    const currentCounterpartySide: 'from' | 'to' =
      liveSettlementSide === 'from' ? 'to' : 'from';
    if (currentCounterpartySide !== desiredCounterpartySide) {
      const nextFrom = { ...toPicker };
      const nextTo = { ...fromPicker };
      setFromPicker(nextFrom);
      setToPicker(nextTo);
    }
    // Intentionally keyed on kinds + declared action only: the swap itself
    // resolves the mismatch, so the effect goes quiet (no loop).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromPicker.kind, toPicker.kind, declaredSettlementAction]);

  // ---- Treasury Negative Balance Validation (Client-side calculated) ----
  const parsedAmount = parseFloat(amount) || 0;

  // Check if FROM side is a treasury account (cashbox, bank, other treasury) being debited/paid out (صرف)
  const isFromTreasury =
    resolvedFromType === 'treasury' &&
    fromPicker.accountId !== '' &&
    fromPicker.kind !== 'settlement';

  const fromTreasuryAccount = useMemo(() => {
    if (!isFromTreasury || !treasuryData?.length) return null;
    return treasuryData.find((t) => String(t.id) === String(fromPicker.accountId)) ?? null;
  }, [isFromTreasury, treasuryData, fromPicker.accountId]);

  const currentFromBalance = fromTreasuryAccount
    ? (typeof fromTreasuryAccount.balance === 'number'
        ? fromTreasuryAccount.balance
        : parseFloat(String(fromTreasuryAccount.balance ?? 0)))
    : null;

  // Projected balance when money is taken out of this treasury account
  const projectedFromBalance =
    currentFromBalance !== null ? currentFromBalance - parsedAmount : null;

  // Disallow if feature flag is active AND projected balance would drop below zero (< 0)
  const isNegativeTreasuryDisallowed = Boolean(
    DISALLOW_NEGATIVE_TREASURY_BALANCE &&
    isFromTreasury &&
    projectedFromBalance !== null &&
    parsedAmount > 0 &&
    projectedFromBalance < 0
  );

  const accountsReady =
    fromPicker.accountId !== '' && toPicker.accountId !== '' &&
    resolvedFromType !== null && resolvedToType !== null;
  const detailsReady =
    amount !== '' && parsedAmount > 0 && description.trim() !== '';

  // Live settlement guard — product decision is to silently adopt the derived
  // direction and block save ONLY when both sides are settlement (invalid).
  // Also blocked if negative treasury balance is disallowed.
  const canSubmit =
    accountsReady &&
    detailsReady &&
    liveDirection !== 'invalid' &&
    !isNegativeTreasuryDisallowed;

  // ---- Submit ----
  const handleSubmit = async () => {
    if (
      !resolvedFromType ||
      !resolvedToType ||
      !fromPicker.accountId ||
      !toPicker.accountId ||
      !amount ||
      !description.trim() ||
      isNegativeTreasuryDisallowed
    ) {
      return;
    }
    // Both-settlement is the only settlement selection that blocks save.
    if (liveDirection === 'invalid') {
      return;
    }

    try {
      await createTransaction.mutateAsync({
        from_account_type: resolvedFromType,
        from_account_id: Number(fromPicker.accountId),
        to_account_type: resolvedToType,
        to_account_id: Number(toPicker.accountId),
        amount: parseFloat(amount),
        description: finalDescription,
        effective_date: effectiveDate ? buildEffectiveDateTime(effectiveDate, effectiveTime) : undefined,
        voucher_type_override: effectiveVoucherType,
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

  // ---- Save & New ----
  const handleSaveAndNew = async () => {
    if (
      !resolvedFromType ||
      !resolvedToType ||
      !fromPicker.accountId ||
      !toPicker.accountId ||
      !amount ||
      !description.trim() ||
      isNegativeTreasuryDisallowed
    ) {
      return;
    }
    // Both-settlement is the only settlement selection that blocks save.
    if (liveDirection === 'invalid') {
      return;
    }

    try {
      await createTransaction.mutateAsync({
        from_account_type: resolvedFromType,
        from_account_id: Number(fromPicker.accountId),
        to_account_type: resolvedToType,
        to_account_id: Number(toPicker.accountId),
        amount: parseFloat(amount),
        description: finalDescription,
        effective_date: effectiveDate ? buildEffectiveDateTime(effectiveDate, effectiveTime) : undefined,
        voucher_type_override: effectiveVoucherType,
      });

      success('تم التسجيل — جاهز للمعاملة التالية');
      setAmount('');
      setDescription('');
      setEffectiveDate(nowLocalDate());
      setEffectiveTime(nowLocalTime());
      setVoucherTypeOverride('');
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
    setEffectiveDate(nowLocalDate());
    setEffectiveTime(nowLocalTime());
    setVoucherTypeOverride('');
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

  // The textarea holds ONLY what the user typed. The account trail is a separate
  // auto-generated prefix assembled at submit time - rendering it inside the field made
  // the description look pre-filled and made the user fight the auto-complete on every
  // keystroke. Names only, no "kind: name" - the account type is redundant here.
  const accountTrailPrefix = useMemo(() => {
    if (!fromName || !toName || !fromPicker.accountId || !toPicker.accountId) return '';
    return `من "${fromName}" الى "${toName}"`;
  }, [fromName, toName, fromPicker.accountId, toPicker.accountId]);

  const finalDescription = useMemo(() => {
    const note = description.trim();
    return accountTrailPrefix ? `${accountTrailPrefix} - ${note}` : note;
  }, [accountTrailPrefix, description]);

  // Print mask defaults to the direction the user picked: قبض → سند قبض,
  // صرف → سند صرف. Only an explicit toggle deviates from that default.
  const effectiveVoucherType: 'receipt' | 'expense' =
    voucherTypeOverride || (direction === 'qabdh' ? 'receipt' : 'expense');

  const defaultVoucherLabel = effectiveVoucherType === 'receipt' ? 'سند قبض' : 'سند صرف';
  const altVoucherType: 'receipt' | 'expense' = effectiveVoucherType === 'receipt' ? 'expense' : 'receipt';
  const altVoucherLabel = altVoucherType === 'receipt' ? 'سند قبض' : 'سند صرف';

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
  };

  const fromIsSettlement = fromPicker.kind === 'settlement';

  // Red guard shows ONLY for both-settlement (invalid).
  const settlementGuardMessage =
    liveDirection === 'invalid'
      ? 'لا يمكن التحويل من حساب التسوية إلى نفسه — اختر حساباً مقابلاً مختلفاً.'
      : null;

  const modalTitleProp = (props?.title as string | undefined);
  const dirQabdhLabel = isSettlement ? 'تسوية قبض' : 'سند قبض';
  const dirSarfLabel = isSettlement ? 'تسوية صرف' : 'سند صرف';
  // Fixed title promise: the header ALWAYS shows what the opener passed (or the
  // direction fallback). Orientation is enforced by swapping the picker sides
  // above, so the title never needs to change and can never go stale.
  const isSettlementSideLive =
    fromPicker.kind === 'settlement' || toPicker.kind === 'settlement';
  const liveSettlementTitle =
    liveDirection === 'qabd' ? 'تسوية قبض' : liveDirection === 'sarf' ? 'تسوية صرف' : null;
  const activeTitle =
    modalTitleProp || (direction === 'qabdh' ? dirQabdhLabel : dirSarfLabel);
  // Banner strings mirror the submitted description: settlement side bare
  // name, other side 'kind: name'.
  const bannerFromStr =
    fromPicker.kind === 'settlement' ? fromName : `${fromKindLabel}: ${fromName}`;
  const bannerToStr =
    toPicker.kind === 'settlement' ? toName : `${toKindLabel}: ${toName}`;
  const liveBannerLabel = liveSettlementTitle;

  return (
    <BaseModal
      isOpen={isVisible}
      onClose={handleClose}
      title={activeTitle}
      titleClassName="text-center w-full ms-6"
    >
      {/* Structural settlement gate. Any surface that opens a تسوية preset lands here, so a
          caller that forgets to hide its button still cannot create the transaction. */}
      {settlementDenied && (
        <div dir="rtl" className="py-6 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-status-danger-text" />
          <p className="mt-3 text-sm font-bold text-text-primary">لا تملك صلاحية تسوية الحساب</p>
          <p className="mt-1 text-xs text-text-secondary">
            لا تملك صلاحية الحركة على حساب التسوية. راجع مدير النظام.
          </p>
          <Button variant="outline-secondary" size="sm" className="mt-4" onClick={handleClose}>
            إغلاق
          </Button>
        </div>
      )}

      {!settlementDenied && (
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

          {/* من حساب → إلى حساب — In settlement mode, target account picker spans full row */}
          {isSettlement ? (
            <div className="w-full">
              <AccountPickerCard
                label={fromIsSettlement ? 'إلى حساب' : 'من حساب'}
                value={fromIsSettlement ? toPicker : fromPicker}
                onChange={fromIsSettlement ? setToPicker : setFromPicker}
                clients={clients}
                employees={employees}
                treasuryData={treasuryData ?? []}
                categoryMetadata={categoryMetadata ?? []}
                presetKind={null}
                isVisible={isVisible}
                isRowWide={true}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {/* In RTL the first grid child renders at the visual start (right). For قبض
                  the money arrives AT the treasury, so the treasury card ("إلى حساب")
                  reads first. Values are untouched - only presentation order changes. */}
              {direction === 'qabdh' ? (
                <>
                  <AccountPickerCard
                    label="إلى حساب"
                    value={toPicker}
                    onChange={setToPicker}
                    clients={clients}
                    employees={employees}
                    treasuryData={treasuryData ?? []}
                    categoryMetadata={categoryMetadata ?? []}
                    presetKind={toPresetKind}
                    isVisible={isVisible}
                  />
                  <AccountPickerCard
                    label="من حساب"
                    value={fromPicker}
                    onChange={setFromPicker}
                    clients={clients}
                    employees={employees}
                    treasuryData={treasuryData ?? []}
                    categoryMetadata={categoryMetadata ?? []}
                    presetKind={fromPresetKind}
                    isVisible={isVisible}
                  />
                </>
              ) : (
                <>
                  <AccountPickerCard
                    label="من حساب"
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
                    label="إلى حساب"
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
          )}

          {/* Live settlement banner — derived from liveDirection every render, never stale. */}
          {isSettlementSideLive && liveDirection === 'indeterminate' && (
            <div className="mt-3 rounded-lg border border-status-warning-border bg-status-warning-bg/20 p-2.5 text-xs font-bold text-status-warning-text">
              أكمل اختيار الحسابين لعرض اتجاه التسوية
            </div>
          )}
          {isSettlementSideLive && liveBannerLabel && (liveDirection === 'qabd' || liveDirection === 'sarf') && (
            <div className="mt-3 rounded-lg border border-status-info-border bg-status-info-bg p-2.5 text-xs font-bold text-status-info-text">
              {`${liveBannerLabel} — من ${bannerFromStr} إلى ${bannerToStr}`}
            </div>
          )}

          {/* Both-settlement guard — the only settlement selection that blocks save. */}
          {settlementGuardMessage && (
            <div className="mt-3 rounded-lg border border-status-danger-border bg-status-danger-bg/40 p-2.5 text-xs font-bold text-status-danger-text">
              {settlementGuardMessage}
            </div>
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
            {/* Amount + Date + Time — one row. Time defaults to the current clock and stays
                editable for backdated/forward-dated entries. */}
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
                    className="w-full text-left font-mono font-bold"
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
                <DateInput
                  name="effective_date"
                  value={effectiveDate}
                  onChange={(val: any) => setEffectiveDate(typeof val === 'string' ? val : val?.target?.value ?? '')}
                  className="w-full"
                />
              </div>

              <div className="col-span-3">
                <label className="block text-xs font-bold text-text-secondary mb-1.5">
                  الوقت
                </label>
                <input
                  type="time"
                  name="effective_time"
                  value={effectiveTime}
                  onChange={(e) => setEffectiveTime(e.target.value)}
                  dir="ltr"
                  className="base-input w-full text-center font-mono text-xs"
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
                onChange={handleDescriptionChange}
                placeholder="اكتب بيان المعاملة هنا..."
                rows={3}
                className="w-full rounded-lg border border-border-default bg-background p-2.5 text-xs font-medium text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:ring-1 focus:ring-primary-500/20 focus:border-primary-500/40 transition-all resize-none"
              />
            </div>

            {/* Document Template / Print Mask for Treasury <-> Client transactions */}
            {((resolvedFromType === 'treasury' && resolvedToType === 'client') ||
              (resolvedFromType === 'client' && resolvedToType === 'treasury')) && (
              <div className="flex items-center justify-between p-2.5 bg-surface-subtle/50 rounded-lg border border-border/60 text-xs">
                <div className="flex flex-col">
                  <span className="font-semibold text-text-primary">نوع السند المطبوع للعميل</span>
                  <span className="text-[11px] text-text-secondary/80">تحديد صيغة السند المطبوع في الـ PDF دون التأثير على القيد المحاسبي</span>
                </div>
                <div className="flex items-center gap-1 bg-background p-0.5 rounded-md border border-border">
                  <button
                    type="button"
                    onClick={() => setVoucherTypeOverride('')}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                      voucherTypeOverride === ''
                        ? 'bg-primary-50 text-primary-700 font-bold shadow-xs border border-primary-200'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {defaultVoucherLabel} (افتراضي)
                  </button>
                  <button
                    type="button"
                    onClick={() => setVoucherTypeOverride(altVoucherType)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                      voucherTypeOverride === altVoucherType
                        ? (altVoucherType === 'receipt'
                            ? 'bg-status-success-bg text-status-success-text font-bold shadow-xs border border-status-success-border'
                            : 'bg-status-danger-bg text-status-danger-text font-bold shadow-xs border border-status-danger-border')
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {altVoucherLabel}
                  </button>
                </div>
              </div>
            )}

            {/* Negative Treasury Balance Warning (No fluff) */}
            {isNegativeTreasuryDisallowed && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-status-danger-bg/40 border border-status-danger-border/60 text-status-danger-text text-xs font-semibold">
                <AlertCircle size={15} className="shrink-0 text-status-danger-text" />
                <span>
                  لا يمكن إتمام عملية الصرف: الرصيد الحالي ({currentFromBalance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ريال) غير كافٍ وسيصبح سالباً ({projectedFromBalance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ريال).
                </span>
              </div>
            )}
          </div>
        </section>

        {/* ============ FOOTER ============ */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <Button
            type="button"
            variant="outline-secondary"
            size="sm"
            onClick={handleClose}
          >
            إلغاء
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline-primary"
              size="sm"
              disabled={!canSubmit || createTransaction.isPending}
              className={isNegativeTreasuryDisallowed ? 'opacity-40 cursor-not-allowed bg-muted/20 border-border-default text-text-secondary' : ''}
              onClick={handleSaveAndNew}
            >
              حفظ وإضافة آخر
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={!canSubmit || createTransaction.isPending}
              className={isNegativeTreasuryDisallowed ? 'opacity-40 cursor-not-allowed bg-muted/40 text-text-secondary border-transparent shadow-none hover:bg-muted/40' : ''}
              onClick={handleSubmit}
            >
              {createTransaction.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  جاري الحفظ...
                </span>
              ) : (
                'حفظ المعاملة'
              )}
            </Button>
          </div>
        </div>
      </div>
      )}
    </BaseModal>
  );
};

export default UnifiedTransactionModal;