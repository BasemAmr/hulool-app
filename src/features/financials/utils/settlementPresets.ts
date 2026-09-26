/**
 * Settlement presets — single source of truth for every تسوية قبض / تسوية صرف
 * opener in the app (navbars, widgets, tables, profile headers).
 *
 * Standard rule, stated in ledger terms:
 * - تسوية قبض (qabd): the client/employee side is FROM (credit on the person,
 *   debt down), the cashbox/bank/treasury side is TO (debit, cash up).
 * - تسوية صرف (sarf): the exact mirror.
 *
 * Matrix (counterparty = the NON-settlement side):
 * - qabd + person (client/employee)   → FROM person TO settlement
 * - qabd + treasury (cashbox/bank/treasury/other) → FROM settlement TO treasury
 * - sarf + person                     → FROM settlement TO person
 * - sarf + treasury                   → FROM treasury TO settlement
 *
 * Normal سند قبض / صرف presets are NOT covered here and are left untouched.
 * Settlement-page سند buttons (isSettlement mode, titled سند not تسوية)
 * are also out of scope and keep their current behavior.
 */

export type SettlementAction = 'qabd' | 'sarf';

/** Counterparty = the non-settlement side of a settlement transaction. */
export type SettlementCounterpartyKind =
  | 'client'
  | 'employee'
  | 'cashbox'
  | 'bank'
  | 'treasury'
  | 'other';

export interface SettlementCounterparty {
  kind: SettlementCounterpartyKind;
  /** Account id when the opener knows it (per-row buttons); omit for generic pickers. */
  id?: string;
}

export interface SettlementPreset {
  defaultFromCardType: string;
  defaultToCardType: string;
  defaultFromAccountId?: string;
  defaultToAccountId?: string;
  title: string;
  /** Explicit action — the modal blocks save when live pickers mismatch it. */
  settlementAction: SettlementAction;
}

/** Person family = client/employee (credit the person on قبض). */
export const isPersonCounterparty = (kind: string | null | undefined): boolean =>
  kind === 'client' || kind === 'employee';

/** Treasury family = cashbox/bank/treasury/other (debit it on قبض). */
export const isTreasuryCounterparty = (kind: string | null | undefined): boolean =>
  kind === 'cashbox' || kind === 'bank' || kind === 'treasury' || kind === 'other';

const withId = (id: string | undefined): { idProp: string | undefined; hasId: boolean } => ({
  idProp: id,
  hasId: typeof id === 'string' && id !== '',
});

export function buildSettlementPreset(
  action: SettlementAction,
  counterparty: SettlementCounterparty,
): SettlementPreset {
  const { kind } = counterparty;
  const { idProp } = withId(counterparty.id);
  const title = action === 'qabd' ? 'تسوية قبض' : 'تسوية صرف';

  if (isPersonCounterparty(kind)) {
    // Person family: قبض = FROM person (credit, debt down), صرف = TO person (debit, debt up).
    if (action === 'qabd') {
      return {
        defaultFromCardType: kind,
        ...(idProp !== undefined ? { defaultFromAccountId: idProp } : {}),
        defaultToCardType: 'settlement',
        title,
        settlementAction: action,
      };
    }
    return {
      defaultFromCardType: 'settlement',
      defaultToCardType: kind,
      ...(idProp !== undefined ? { defaultToAccountId: idProp } : {}),
      title,
      settlementAction: action,
    };
  }

  // Treasury family (cashbox/bank/treasury/other): قبض = TO treasury (debit, cash up).
  if (action === 'qabd') {
    return {
      defaultFromCardType: 'settlement',
      defaultToCardType: kind,
      ...(idProp !== undefined ? { defaultToAccountId: idProp } : {}),
      title,
      settlementAction: action,
    };
  }
  return {
    defaultFromCardType: kind,
    ...(idProp !== undefined ? { defaultFromAccountId: idProp } : {}),
    defaultToCardType: 'settlement',
    title,
    settlementAction: action,
  };
}

export const buildSettlementQabdPreset = (
  counterparty: SettlementCounterparty,
): SettlementPreset => buildSettlementPreset('qabd', counterparty);

export const buildSettlementSarfPreset = (
  counterparty: SettlementCounterparty,
): SettlementPreset => buildSettlementPreset('sarf', counterparty);

/**
 * Live mismatch guard for UnifiedTransactionModal.
 * Returns an Arabic blocking message when the live picker selection
 * contradicts the declared settlement action, otherwise null.
 *
 * - Not a settlement selection (no settlement side yet, or no settlement
 *   at all) → null, existing canSubmit logic already disables save.
 * - Settlement on both sides → message (same-account transfer is invalid).
 * - Otherwise the counterparty family decides the only legal orientation.
 */
export function getSettlementMismatch(
  fromKind: string | null | undefined,
  toKind: string | null | undefined,
  action: SettlementAction | null | undefined,
): string | null {
  if (!action) return null;
  if (!fromKind || !toKind) return null;

  const fromIsSettlement = fromKind === 'settlement';
  const toIsSettlement = toKind === 'settlement';

  if (!fromIsSettlement && !toIsSettlement) return null;
  if (fromIsSettlement && toIsSettlement) {
    return 'لا يمكن التحويل من حساب التسوية إلى نفسه — اختر حساباً مقابلاً مختلفاً.';
  }

  const counterpartyKind = fromIsSettlement ? toKind : fromKind;

  if (isPersonCounterparty(counterpartyKind)) {
    // قبض = FROM person TO settlement; صرف = FROM settlement TO person.
    const ok =
      (action === 'qabd' && !fromIsSettlement && toIsSettlement) ||
      (action === 'sarf' && fromIsSettlement && !toIsSettlement);
    if (!ok) {
      return action === 'qabd'
        ? 'تسوية قبض للعميل/الموظف يجب أن تكون من العميل/الموظف إلى التسوية (دائن على الشخص). الاختيار الحالي معكوس — اعكس الحسابين.'
        : 'تسوية صرف للعميل/الموظف يجب أن تكون من التسوية إلى العميل/الموظف (مدين على الشخص). الاختيار الحالي معكوس — اعكس الحسابين.';
    }
    return null;
  }

  if (isTreasuryCounterparty(counterpartyKind)) {
    // قبض = FROM settlement TO treasury (debit cash up); صرف = FROM treasury TO settlement.
    const ok =
      (action === 'qabd' && fromIsSettlement && !toIsSettlement) ||
      (action === 'sarf' && !fromIsSettlement && toIsSettlement);
    if (!ok) {
      return action === 'qabd'
        ? 'تسوية قبض للصندوق/الخزينة يجب أن تكون من التسوية إلى الصندوق (مدين على الصندوق). الاختيار الحالي معكوس — اعكس الحسابين.'
        : 'تسوية صرف للصندوق/الخزينة يجب أن تكون من الصندوق إلى التسوية (دائن على الصندوق). الاختيار الحالي معكوس — اعكس الحسابين.';
    }
    return null;
  }

  return null;
}
