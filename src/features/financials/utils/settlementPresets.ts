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
 * CLASSIFIER CONTRACT — classifySettlementDirection(fromKind, toKind) is the
 * single truth table for settlement orientation. buildSettlementPreset and
 * getSettlementMismatch delegate to it and must never duplicate the mapping:
 * - either side null/undefined/'' → 'indeterminate' (incomplete picks, never a mismatch)
 * - neither side 'settlement' → 'notSettlement'
 * - both sides 'settlement' → 'invalid'
 * - person (client/employee) counterparty: person-FROM → 'qabd', person-TO → 'sarf'
 * - treasury (cashbox/bank/treasury/other) counterparty: treasury-TO → 'qabd', treasury-FROM → 'sarf'
 * - settlement + unknown-family counterparty → 'indeterminate' (never guess)
 * Normalization (applied inside the classifier and reused by the family
 * helpers below): 'company_cashbox' → 'cashbox'; generic 'treasury' counts as
 * treasury family (it arrives as a preset card-type even though it is never a
 * live PickerKind). Person = client|employee. Treasury = cashbox|bank|treasury|other.
 *
 * Normal سند قبض / صرف presets are NOT covered here and are left untouched.
 * Settlement-page سند buttons (TransactionActionButtons.tsx isSettlement mode,
 * button labels سند قبض/صرف) pass تسوية قبض/صرف titles with no settlementAction
 * prop, so the modal title-fallback guard DOES engage them; they are intentionally
 * left hand-written (settlement-viewpoint labels preserved by product decision)
 * and will be handled by the modal live-derivation phase, not by this file.
 */

export type SettlementAction = 'qabd' | 'sarf';

/** Pure orientation reading of the two picked accounts for a settlement selection. */
export type SettlementDirection = 'qabd' | 'sarf' | 'invalid' | 'notSettlement' | 'indeterminate';

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

/**
 * Canonicalize a card/picker kind before family checks. Only 'company_cashbox'
 * needs remapping today (preset card-type string mapped to 'cashbox');
 * everything else passes through untouched. Idempotent, so calling it twice
 * (here and inside the classifier) is harmless.
 */
const normalizeSettlementKind = (kind: string | null | undefined): string =>
  kind === 'company_cashbox' ? 'cashbox' : (kind ?? '');

/** Person family = client/employee (credit the person on قبض). */
export const isPersonCounterparty = (kind: string | null | undefined): boolean =>
  // Normalized so the 'company_cashbox' preset card-type never leaks into person checks.
  normalizeSettlementKind(kind) === 'client' || normalizeSettlementKind(kind) === 'employee';

/** Treasury family = cashbox/bank/treasury/other (debit it on قبض). */
export const isTreasuryCounterparty = (kind: string | null | undefined): boolean => {
  // Normalized so 'company_cashbox' (preset card-type) counts as cashbox, and
  // generic 'treasury' (preset card-type, never a live PickerKind) still matches.
  const normalized = normalizeSettlementKind(kind);
  return (
    normalized === 'cashbox' ||
    normalized === 'bank' ||
    normalized === 'treasury' ||
    normalized === 'other'
  );
};

/**
 * Single truth table for settlement direction: a pure function of the two
 * picked accounts. Family rule: person-FROM = قبض (credit person, debt down),
 * person-TO = صرف; treasury-TO = قبض (debit, cash up), treasury-FROM = صرف.
 */
export function classifySettlementDirection(
  fromKind: string | null | undefined,
  toKind: string | null | undefined,
): SettlementDirection {
  // Incomplete picks must never read as a mismatch — callers treat this as "no verdict yet".
  if (!fromKind || !toKind) return 'indeterminate';

  const from = normalizeSettlementKind(fromKind);
  const to = normalizeSettlementKind(toKind);

  const fromIsSettlement = from === 'settlement';
  const toIsSettlement = to === 'settlement';

  if (!fromIsSettlement && !toIsSettlement) return 'notSettlement';
  if (fromIsSettlement && toIsSettlement) return 'invalid';

  const counterpartyKind = fromIsSettlement ? to : from;
  const counterpartyIsFrom = !fromIsSettlement;

  if (isPersonCounterparty(counterpartyKind)) {
    // Person family: قبض = FROM person (credit, debt down), صرف = TO person.
    return counterpartyIsFrom ? 'qabd' : 'sarf';
  }

  if (isTreasuryCounterparty(counterpartyKind)) {
    // Treasury family: قبض = TO treasury (debit, cash up), صرف = FROM treasury.
    return counterpartyIsFrom ? 'sarf' : 'qabd';
  }

  // Settlement paired with an unknown family — never guess an orientation.
  return 'indeterminate';
}

const withId = (id: string | undefined): { idProp: string | undefined; hasId: boolean } => ({
  idProp: id,
  hasId: typeof id === 'string' && id !== '',
});

export function buildSettlementPreset(
  action: SettlementAction,
  counterparty: SettlementCounterparty,
): SettlementPreset {
  const { kind } = counterparty;
  const { idProp, hasId } = withId(counterparty.id);
  const title = action === 'qabd' ? 'تسوية قبض' : 'تسوية صرف';

  // Delegate orientation to the single truth table: the only legal orientation
  // is the one that classifies back to `action`. Candidate A (FROM counterparty
  // TO settlement) is the person-قبض / treasury-صرف shape; candidate B mirrors it.
  if (classifySettlementDirection(kind, 'settlement') === action) {
    return {
      defaultFromCardType: kind,
      ...(hasId ? { defaultFromAccountId: idProp } : {}),
      defaultToCardType: 'settlement',
      title,
      settlementAction: action,
    };
  }
  if (classifySettlementDirection('settlement', kind) === action) {
    return {
      defaultFromCardType: 'settlement',
      defaultToCardType: kind,
      ...(hasId ? { defaultToAccountId: idProp } : {}),
      title,
      settlementAction: action,
    };
  }

  // Unknown family (classifier indeterminate both ways): preserve the legacy
  // treasury-orientation fallback so callers still get a usable preset.
  if (action === 'qabd') {
    return {
      defaultFromCardType: 'settlement',
      defaultToCardType: kind,
      ...(hasId ? { defaultToAccountId: idProp } : {}),
      title,
      settlementAction: action,
    };
  }
  return {
    defaultFromCardType: kind,
    ...(hasId ? { defaultFromAccountId: idProp } : {}),
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

  // Delegate the orientation reading to the single truth table — this function
  // only maps the verdict to a message, it never re-derives the mapping.
  const direction = classifySettlementDirection(fromKind, toKind);

  // Incomplete picks or non-settlement selections are not mismatches;
  // existing canSubmit logic already disables save while pickers are incomplete.
  if (direction === 'indeterminate' || direction === 'notSettlement') return null;
  if (direction === 'invalid') {
    return 'لا يمكن التحويل من حساب التسوية إلى نفسه — اختر حساباً مقابلاً مختلفاً.';
  }
  // Live orientation agrees with the declared action → no mismatch.
  if (direction === action) return null;

  // True orientation contradiction: family-specific message so the user knows
  // which way round the accounts should be. Normalization lives inside the
  // family helpers, so the raw picker kinds are passed through as before.
  const fromIsSettlement = normalizeSettlementKind(fromKind) === 'settlement';
  const counterpartyKind = fromIsSettlement ? toKind : fromKind;

  if (isPersonCounterparty(counterpartyKind)) {
    // قبض = FROM person TO settlement; صرف = FROM settlement TO person.
    return action === 'qabd'
      ? 'تسوية قبض للعميل/الموظف يجب أن تكون من العميل/الموظف إلى التسوية (دائن على الشخص). الاختيار الحالي معكوس — اعكس الحسابين.'
      : 'تسوية صرف للعميل/الموظف يجب أن تكون من التسوية إلى العميل/الموظف (مدين على الشخص). الاختيار الحالي معكوس — اعكس الحسابين.';
  }

  if (isTreasuryCounterparty(counterpartyKind)) {
    // قبض = FROM settlement TO treasury (debit cash up); صرف = FROM treasury TO settlement.
    return action === 'qabd'
      ? 'تسوية قبض للصندوق/الخزينة يجب أن تكون من التسوية إلى الصندوق (مدين على الصندوق). الاختيار الحالي معكوس — اعكس الحسابين.'
      : 'تسوية صرف للصندوق/الخزينة يجب أن تكون من الصندوق إلى التسوية (دائن على الصندوق). الاختيار الحالي معكوس — اعكس الحسابين.';
  }

  return null;
}
