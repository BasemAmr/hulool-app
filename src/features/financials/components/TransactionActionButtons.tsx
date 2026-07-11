import { useRef, useState, useEffect } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { useModalStore } from '@/shared/stores/modalStore';
import Button from '@/shared/ui/primitives/Button';

interface TransactionActionButtonsProps {
  accountId: number;
  /** treasury / company_cashbox / client / employee */
  cardType: 'company_cashbox' | 'treasury' | 'client' | 'employee';
  /**
   * When true the account is a settlement account (sub_type=internal, is_settlement=true).
   * Renders سند تسوية قبض + سند تسوية صرف instead of the normal 3-button set.
   */
  isSettlement?: boolean;
  isClosed?: boolean;
  onExport?: () => void;
  isExporting?: boolean;
  onClose?: () => void;
  closePending?: boolean;
}

const TransactionActionButtons: React.FC<TransactionActionButtonsProps> = ({
  accountId,
  cardType,
  isSettlement = false,
  isClosed,
  onExport,
  isExporting,
  onClose,
  closePending,
}) => {
  const openModal = useModalStore(s => s.openModal);
  const [settlementOpen, setSettlementOpen] = useState(false);
  const settlementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settlementRef.current && !settlementRef.current.contains(e.target as Node)) {
        setSettlementOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openUnified = (overrides: Record<string, any>) => {
    openModal('unifiedTransaction', {
      lockDirection: true,
      ...overrides,
    });
  };

  const accountIdStr = String(accountId);

  // ─── Settlement Account Mode ─────────────────────────────────────────────────
  // On a settlement account page the two sides are: settlement (this account) ↔ free choice.
  // سند تسوية قبض  →  settlement is the FROM side (money comes OUT of settlement to treasury)
  // سند تسوية صرف  →  settlement is the TO side (money goes IN to settlement)
  if (isSettlement) {
    return (
      <div className="flex items-center gap-2">
        {/* سند قبض */}
        <Button
          variant="outline-success"
          size="sm"
          disabled={isClosed}
          onClick={() =>
            openUnified({
              defaultFromCardType: 'settlement',
              defaultFromAccountId: accountIdStr,
              defaultToCardType: 'treasury',
              title: 'تسوية قبض',
            })
          }
          className="font-bold"
        >
          سند قبض
        </Button>

        {/* سند صرف */}
        <Button
          variant="outline-danger"
          size="sm"
          disabled={isClosed}
          onClick={() =>
            openUnified({
              defaultFromCardType: 'treasury',
              defaultToCardType: 'settlement',
              defaultToAccountId: accountIdStr,
              title: 'تسوية صرف',
            })
          }
          className="font-bold"
        >
          سند صرف
        </Button>

        <div className="flex-1" />

        {onExport && (
          <Button variant="outline-primary" size="sm" onClick={onExport} isLoading={isExporting}>
            <FileSpreadsheet size={14} className="ms-1" />
            تصدير
          </Button>
        )}
      </div>
    );
  }

  // ─── Normal Mode (cashbox / treasury / client / employee) ────────────────────
  // سند قبض  →  money flows TO this account  (this account is the TO/debit side)
  // سند صرف  →  money flows FROM this account (this account is the FROM/credit side)
  const toCardType   = cardType;
  const fromCardType = cardType;

  return (
    <div className="flex items-center gap-2">
      {/* سند قبض — current account is the TO (debit) side, FROM side is free */}
      <Button
        variant="outline-success"
        size="sm"
        disabled={isClosed}
        onClick={() =>
          openUnified({
            defaultToCardType: toCardType,
            defaultToAccountId: accountIdStr,
            title: 'سند قبض',
          })
        }
        className="font-bold"
      >
        سند قبض
      </Button>

      {/* سند صرف — current account is the FROM (credit) side, TO side is free */}
      <Button
        variant="outline-danger"
        size="sm"
        disabled={isClosed}
        onClick={() =>
          openUnified({
            defaultFromCardType: fromCardType,
            defaultFromAccountId: accountIdStr,
            title: 'سند صرف',
          })
        }
        className="font-bold"
      >
        سند صرف
      </Button>

      {/* سند تسوية - dropdown */}
      <div ref={settlementRef} className="relative">
        <Button
          variant="outline-secondary"
          size="sm"
          disabled={isClosed}
          onClick={() => setSettlementOpen(v => !v)}
          className="font-bold"
        >
          سند تسوية
        </Button>
        {settlementOpen && (
          <div className="absolute left-0 top-full mt-1 z-50 min-w-[160px] rounded-lg border border-border-default bg-card shadow-xl">
            <button
              type="button"
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-semibold text-text-primary hover:bg-muted/50 transition-colors rounded-t-lg"
              onClick={() => {
                setSettlementOpen(false);
                openUnified({
                  defaultFromCardType: 'settlement',
                  title: 'تسوية قبض',
                });
              }}
            >
              تسوية قبض
            </button>
            <div className="border-t border-border-default" />
            <button
              type="button"
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-semibold text-text-primary hover:bg-muted/50 transition-colors rounded-b-lg"
              onClick={() => {
                setSettlementOpen(false);
                openUnified({
                  defaultToCardType: 'settlement',
                  title: 'تسوية صرف',
                });
              }}
            >
              تسوية صرف
            </button>
          </div>
        )}
      </div>

      <div className="flex-1" />

      {onExport && (
        <Button variant="outline-primary" size="sm" onClick={onExport} isLoading={isExporting}>
          <FileSpreadsheet size={14} className="ms-1" />
          تصدير
        </Button>
      )}

      {onClose && !isClosed && (
        <Button variant="outline-danger" size="sm" onClick={onClose} isLoading={closePending}>
          إغلاق الصندوق
        </Button>
      )}
    </div>
  );
};

export default TransactionActionButtons;
