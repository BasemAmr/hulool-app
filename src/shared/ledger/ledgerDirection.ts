/**
 * Single source of truth for the ledger type-column colour.
 *
 * The three ledgers (client / treasury / employee) each carried their own
 * transaction_type -> tone map, duplicated twice per file (a label map and a
 * separate tone map). The copies drifted, and the treasury ledger used a
 * different mechanism entirely (cashbox-debit-cell / cashbox-credit-cell),
 * so the same transaction rendered differently depending on which page you were on.
 *
 * ONE RULE for every row, no voucher special-casing:
 *
 *   money IN  -> green   (قبض)
 *   money OUT -> red     (صرف)
 *
 * "Direction" is NOT the raw debit/credit sign, and it is NOT "did this account grow".
 * The same transaction_type sits on opposite sides depending on the ledger - a payment
 * received is a CREDIT on a client (their debt falls) but a DEBIT on a treasury (our
 * cash rises). So which side means "money in" is per-ledger:
 *
 *   client    -> money in is a CREDIT  (the client paid us, so what they owe drops)
 *   employee  -> money in is a CREDIT  (we owe them more: commission, borrowing)
 *   treasury  -> money in is a DEBIT   (our cash/bank asset rises)
 *
 * This is the same relationship the backend encodes when it writes the counter leg:
 * createPayout() debits the account and credits the treasury, createRepayment() does
 * the reverse - so "money in" always lands on the account's credit side for clients and
 * employees, and on the treasury's debit side.
 *
 * Verified against live data: PAYMENT_RECEIVED renders green on BOTH the client and the
 * treasury ledger, and INVOICE_GENERATED renders red on both.
 */

export type LedgerTone = 'success' | 'danger' | 'neutral';
export type AccountKind = 'client' | 'employee' | 'treasury';

/**
 * Which side of the row means "money came IN to the company".
 * True  -> a credit means money in  (client, employee)
 * False -> a debit means money in   (treasury, cashbox, company)
 *
 * 'cashbox' and 'company' are the virtual aliases the backend normalises to 'treasury'
 * (UnifiedTransactionService::normaliseAccountType). They must resolve the SAME way here,
 * or a cashbox voucher reads صرف while the treasury grid beside it reads قبض.
 */
function creditIsMoneyIn(accountType: string): boolean {
  return accountType === 'client' || accountType === 'employee';
}

/**
 * @param debit       Debit amount on this row.
 * @param credit      Credit amount on this row.
 * @param accountType Which ledger this row belongs to.
 * @returns 'success' money in, 'danger' money out, 'neutral' no amount on the row.
 */
export function resolveLedgerTone(
  accountType: string,
  debit: number | string | null | undefined,
  credit: number | string | null | undefined,
): LedgerTone {
  const d = Number(debit ?? 0) || 0;
  const c = Number(credit ?? 0) || 0;

  // Nothing booked on either side - there is no direction to show.
  if (d === 0 && c === 0) return 'neutral';

  // Every row in the ledger books to exactly one side, so the other is the direction.
  // If a row somehow carries both, the larger side decides.
  const debitNormal = !creditIsMoneyIn(accountType);
  const moneyInAmount = debitNormal ? d : c;
  const moneyOutAmount = debitNormal ? c : d;

  return moneyInAmount >= moneyOutAmount ? 'success' : 'danger';
}

/** Full-cell class used by every ledger's type column. */
export function ledgerToneClassName(
  accountType: string,
  debit: number | string | null | undefined,
  credit: number | string | null | undefined,
): string {
  return `ledger-type-${resolveLedgerTone(accountType, debit, credit)}-cell`;
}