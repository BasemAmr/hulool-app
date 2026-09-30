import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '@/shared/utils';

export interface LedgerFinalBalanceCellProps {
  balance: number | string | null | undefined;
  hideAmounts?: boolean;
}

export const LedgerFinalBalanceCell: React.FC<LedgerFinalBalanceCellProps> = ({
  balance,
  hideAmounts = false,
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

  return (
    <div
      className="hulool-cell-content w-full h-full flex items-center justify-center gap-1.5 font-bold text-sm tabular-nums"
      style={{
        color: isNegative ? 'var(--token-ledger-balance-neg-text)' : 'var(--token-ledger-balance-pos-text)',
      }}
    >
      {isNegative ? (
        <TrendingDown size={15} className="shrink-0" style={{ color: 'var(--token-ledger-balance-neg-text)' }} />
      ) : (
        <TrendingUp size={15} className="shrink-0" style={{ color: 'var(--token-ledger-balance-pos-text)' }} />
      )}
      <span style={{ color: 'inherit' }}>{formatCurrency(num)}</span>
    </div>
  );
};

export default LedgerFinalBalanceCell;
