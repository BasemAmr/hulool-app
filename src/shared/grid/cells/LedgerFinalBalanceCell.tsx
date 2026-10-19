import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '@/shared/utils';

export interface LedgerFinalBalanceCellProps {
  balance: number | string | null | undefined;
  hideAmounts?: boolean;
  /**
   * Signed change this single transaction made to the balance: positive = the row pushed the
   * balance up, negative = down, 0/undefined = unknown.
   *
   * The ARROW tracks this, not the sign of the balance. Those are different questions: on an
   * overdrawn account every row is red and a down-arrow, which tells the reader nothing about
   * whether THIS row helped or hurt. Colour still follows the sign of the balance (red
   * negative / green positive); only the icon follows the movement.
   */
  delta?: number | null;
}

export const LedgerFinalBalanceCell: React.FC<LedgerFinalBalanceCellProps> = ({
  balance,
  hideAmounts = false,
  delta,
}) => {
  if (balance === null || balance === undefined || (typeof balance === 'string' && balance.trim() === '')) {
    return <span className="hulool-cell-content" style={{ justifyContent: 'center' }}>—</span>;
  }

  const num = typeof balance === 'number' ? balance : parseFloat(balance);
  if (isNaN(num)) {
    return <span className="hulool-cell-content" style={{ justifyContent: 'center' }}>—</span>;
  }

  if (hideAmounts) {
    return <span className="hulool-cell-content" style={{ justifyContent: 'center' }}>***</span>;
  }

  const isNegative = num < 0;
  const iconColor = isNegative
    ? 'var(--token-ledger-balance-neg-text)'
    : 'var(--token-ledger-balance-pos-text)';
  // Fall back to the old sign-based arrow only when the caller has not told us the movement,
  // so behaviour is unchanged for any cell that has not been updated yet.
  const wentDown = delta === null || delta === undefined ? isNegative : Number(delta) < 0;

  return (
    <div
      className="hulool-cell-content w-full h-full flex items-center justify-center gap-1.5 font-bold text-sm tabular-nums"
      style={{ color: iconColor }}
    >
      {wentDown ? (
        <TrendingDown size={15} className="shrink-0" style={{ color: iconColor }} />
      ) : (
        <TrendingUp size={15} className="shrink-0" style={{ color: iconColor }} />
      )}
      <span style={{ color: 'inherit' }}>{formatCurrency(num)}</span>
    </div>
  );
};

export default LedgerFinalBalanceCell;
