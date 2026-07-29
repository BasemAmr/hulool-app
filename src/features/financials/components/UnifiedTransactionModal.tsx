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
import { useToast } from '@/shared/hooks/useToast';
import AccountPickerCard from './AccountPickerCard';
import type { PickerValue, PickerKind } from './AccountPickerCard';
import {
  Loader2,
  CheckCircle2,
  CircleDashed,
} from 'lucide-react';
import type { AccountType } from '@/api/types';

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
      setAutoDescription('');
      setEffectiveDate(new Date().toISOString().split('T')[0]);
      setInitialized(true);
    }
  }, [isVisible, initialized, props, treasuryData]);

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
        effective_date: effectiveDate ? `${effectiveDate}T${new Date().toTimeString().split(' ')[0]}` : undefined,
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
        effective_date: effectiveDate ? `${effectiveDate}T${new Date().toTimeString().split(' ')[0]}` : undefined,
      });

      success('تم التسجيل — جاهز للمعاملة التالية');
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
      const fromStr = fromPicker.kind === 'settlement' ? fromName : `${fromKindLabel}: ${fromName}`;
      const toStr = toPicker.kind === 'settlement' ? toName : `${toKindLabel}: ${toName}`;
      setAutoDescription(`\n\nمن ${fromStr}\nالى ${toStr}`);
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

  const fromIsSettlement = fromPicker.kind === 'settlement';

  const modalTitleProp = (props?.title as string | undefined);
  const dirQabdhLabel = isSettlement ? 'تسوية قبض' : 'سند قبض';
  const dirSarfLabel = isSettlement ? 'تسوية صرف' : 'سند صرف';
  const activeTitle = modalTitleProp || (direction === 'qabdh' ? dirQabdhLabel : dirSarfLabel);

  return (
    <BaseModal
      isOpen={isVisible}
      onClose={handleClose}
      title={activeTitle}
      titleClassName="text-center w-full ms-6"
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
            {/* Amount + Date — same row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
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

              <div>
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
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1.5">
                البيان / الوصف <span className="text-status-danger-text">*</span>
              </label>
              <textarea
                value={displayDescription}
                onChange={handleDescriptionChange}
                placeholder="اكتب بيان المعاملة هنا..."
                rows={3}
                className="w-full rounded-lg border border-border-default bg-background p-2.5 text-xs font-medium text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:ring-1 focus:ring-primary-500/20 focus:border-primary-500/40 transition-all resize-none"
              />
            </div>
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
              onClick={handleSaveAndNew}
            >
              حفظ وإضافة آخر
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={!canSubmit || createTransaction.isPending}
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
    </BaseModal>
  );
};

export default UnifiedTransactionModal;