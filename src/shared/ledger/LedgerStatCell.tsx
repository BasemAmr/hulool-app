import React from 'react';
import { formatCurrency } from '@/shared/utils/formatUtils';

/** Semantic tone for a ledger total. Maps to status/design tokens so the value stays
 *  legible in both light and dark themes — never a hardcoded hex. */
export type LedgerTone = 'debit' | 'credit' | 'balance';

const TONE_CLASS: Record<LedgerTone, string> = {
  debit: 'text-status-danger-text',
  credit: 'text-status-success-text',
  balance: 'text-text-brand',
};

/**
 * One flush cell in a ledger toolbar: label above, value below.
 *
 * Layout note: cells in these toolbars sit in the RTL *end* group and run right-to-left,
 * so `divider` draws on the inline-END side. Using border-s here would put the line on each
 * cell's outer edge and leave the credit|balance boundary unmarked.
 *
 * Values must be passed in already computed by the server (total_debits / total_credits /
 * balance from the account-history response). Do NOT sum the current page of rows here —
 * that is the bug that made the footer disagree with the balance beside it.
 */
export const LedgerStatCell: React.FC<{
  label: string;
  value: number;
  tone: LedgerTone;
  divider?: boolean;
}> = ({ label, value, tone, divider }) => (
  <div
    className={`flex flex-col justify-center px-5 py-1.5 ${divider ? 'border-e border-border-default' : ''}`}
  >
    <span className="text-xs leading-tight text-text-secondary whitespace-nowrap">{label}</span>
    <span className={`text-lg leading-tight font-bold whitespace-nowrap ${TONE_CLASS[tone]}`}>
      {formatCurrency(value)}
    </span>
  </div>
);