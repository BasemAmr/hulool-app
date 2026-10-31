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
  /**
   * Account type for semantic polarity determination.
   * On 'client', balance > 0 is DEBT owed to company (RED / negative business state),
   * and balance <= 0 is zero or in credit (GREEN / positive business state).
   */
  accountType?: 'client' | 'employee' | 'treasury' | string;
}

export const LedgerFinalBalanceCell: React.FC<LedgerFinalBalanceCellProps> = ({
  balance,
  hideAmounts = false,
  delta,
  accountType,
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

  // Polarity: For clients, positive balance is debt owed (danger/red), <= 0 is settled/credit (success/green).
  // For treasury/employee, positive balance is healthy funds/payable (success/green), < 0 is deficit (danger/red).
  const isDanger = accountType === 'client' ? num > 0 : num < 0;
  const isZero = Math.abs(num) < 0.005;

  const iconColor = isZero
    ? 'var(--token-text-primary)'
    : isDanger
    ? 'var(--token-ledger-balance-neg-text)'
    : 'var(--token-ledger-balance-pos-text)';

  // Fall back to the old sign-based arrow only when the caller has not told us the movement,
  // so behaviour is unchanged for any cell that has not been updated yet.
  const wentDown = delta === null || delta === undefined ? isDanger : Number(delta) < 0;

  return (
    <div
      className="hulool-cell-content w-full h-full flex items-center justify-center gap-1.5 font-bold text-sm tabular-nums"
      style={{ color: iconColor }}
    >
      {!isZero && (
        wentDown ? (
          <TrendingDown size={15} className="shrink-0" style={{ color: iconColor }} />
        ) : (
          <TrendingUp size={15} className="shrink-0" style={{ color: iconColor }} />
        )
      )}
      <span style={{ color: 'inherit' }}>{formatCurrency(num)}</span>
    </div>
  );
};

export default LedgerFinalBalanceCell;
