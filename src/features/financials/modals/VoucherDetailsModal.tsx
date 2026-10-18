import React from 'react';
import { Link } from 'react-router-dom';
import { useModalStore } from '@/shared/stores/modalStore';
import BaseModal from '@/shared/ui/layout/BaseModal';
import Button from '@/shared/ui/primitives/Button';
import type { CashBoxVoucher } from '@/api/types';
import { formatCurrency } from '@/shared/utils';
import { formatDateTime } from '@/shared/utils/dateUtils';
import { resolveLedgerTone } from '@/shared/ledger/ledgerDirection';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useGetMyTreasuryAccounts } from '@/features/financials/api/treasuryQueries';

interface VoucherDetailsModalProps {
  voucher: CashBoxVoucher | any;
}

/**
 * Where the paired leg of a transaction lives, or null when the viewer may not follow it.
 * Returns a PATH ONLY - the caller appends `?search=<id>` so the destination ledger opens
 * scoped to that one transaction instead of dumping the employee on a full ledger.
 *
 *   client    -> always allowed. Client ledgers have no per-account gating: any employee
 *                may read any client ledger, so there is nothing to check.
 *   employee  -> admin route only. The employee profile page exists solely under /employees,
 *                which is AdminRoute-gated; a plain employee would be bounced to their
 *                dashboard, so linking them there would be a dead end.
 *   treasury  -> only with an explicit can_view on THAT account. Treasury ledgers are the
 *   cashbox     one account type gated per-account, so this is the case that can 403.
 *
 * Null for everything else: unknown type, missing id, or no permission. A link that lands on
 * a forbidden page is more confusing than no link at all.
 */
function pairedLedgerPath(
  targetType: string,
  targetId: number,
  isAdmin: boolean,
  canViewPairedTreasury: boolean,
): string | null {
  if (!targetId) return null;
  switch (targetType) {
    case 'client':
      return `${isAdmin ? '' : '/employee'}/clients/${targetId}`;
    case 'employee':
      return isAdmin ? `/employees/${targetId}` : null;
    case 'treasury':
    case 'cashbox':
      return canViewPairedTreasury
        ? `${isAdmin ? '/financial-center' : '/employee'}/treasury-accounts/${targetId}`
        : null;
    default:
      return null;
  }
}

const VoucherDetailsModal = () => {
  const closeModal = useModalStore((state) => state.closeModal);
  const props = useModalStore((state) => state.props as VoucherDetailsModalProps);
  const { voucher } = props;

  // Above the early return below: these are hooks, so they must run every render.
  // isAdmin picks the route family (AdminRoute vs EmployeeRoute); the permission list is the
  // only source of "may this user open that treasury account" - no second endpoint.
  const isAdmin = useAuthStore((state) => state.isAdmin());
  const { data: myTreasuryAccounts } = useGetMyTreasuryAccounts();

  if (!voucher) return null;

  const isClientTx = voucher.account_type === 'client';

  // Every transaction in this ledger is one leg of a double-entry pair. The API resolves
  // the two account names onto the debit and credit sides of THIS row, so the counterparty
  // account is whichever side this row did NOT book to.
  const isDebitRow = Number(voucher.debit) > 0;
  const pairedAccountName = isDebitRow
    ? voucher.credit_account_name
    : voucher.debit_account_name;

  const pairedTransactionId = Number(voucher.related_transaction_id || 0);
  const pairedType = String(voucher.target_type || '');
  const pairedId = Number(voucher.target_id || 0);

  // A permission row exists only for accounts explicitly granted to this user. Absence means
  // "no access", exactly as useCanUseSettlement treats it.
  const canViewPairedTreasury = (myTreasuryAccounts ?? []).some(
    (a) => Number(a.id) === pairedId && a.can_view === true,
  );

  const pairedPath = pairedTransactionId > 0
    ? pairedLedgerPath(pairedType, pairedId, isAdmin, canViewPairedTreasury)
    : null;
  const pairedHref = pairedPath
    ? `${pairedPath}?search=${encodeURIComponent(pairedTransactionId)}`
    : null;
  
  let voucherTypeLabel = '';
  let badgeColorClass = '';

  // Direction MUST come from the same resolver the grids use, or the same transaction reads
  // one way in the table and the opposite way here. The old check keyed off the raw sign:
  // on a treasury a payment received is a DEBIT, so it showed "سند صرف" in red while the
  // ledger beside it showed a green قبض.
  const voucherAccountType = String(voucher.account_type || '');
  const hasPolarity = ['client', 'employee', 'treasury'].includes(voucherAccountType);
  const tone = hasPolarity
    ? resolveLedgerTone(voucherAccountType, voucher.debit, voucher.credit)
    : (Number(voucher.credit) > 0 ? 'success' : 'danger');

  if (voucher.transaction_type === 'INVOICE_CREATED' || voucher.transaction_type === 'INVOICE_GENERATED' || voucher.related_object_type === 'invoice') {
    voucherTypeLabel = 'فاتورة مطالبة';
    badgeColorClass = 'bg-status-danger-bg text-status-danger-text border border-status-danger-border';
  } else if (voucher.transaction_type?.startsWith('CREDIT_')) {
    voucherTypeLabel = 'تسوية رصيد';
    badgeColorClass = 'bg-status-info-bg text-status-info-text border border-status-info-border';
  } else if (tone === 'success') {
    voucherTypeLabel = isClientTx ? 'سند قبض (دفعة)' : 'سند قبض';
    badgeColorClass = 'bg-status-success-bg text-status-success-text border border-status-success-border';
  } else if (tone === 'danger') {
    voucherTypeLabel = 'سند صرف';
    badgeColorClass = 'bg-status-danger-bg text-status-danger-text border border-status-danger-border';
  } else {
    voucherTypeLabel = 'حركة مالية';
    badgeColorClass = 'bg-status-neutral-bg text-text-primary border border-border-default';
  }

  const amount = (Number(voucher.debit) || 0) > 0 ? Number(voucher.debit) : Number(voucher.credit || 0);

  return (
    <BaseModal isOpen={true} onClose={closeModal} title="تفاصيل الحركة المالية" className="voucher-details-modal max-w-xl">
      <div className="space-y-6 p-5 text-right" dir="rtl">
        {/* Info Grid */}
        <div className="bg-bg-surface-muted rounded-xl p-6 border border-border-strong space-y-5">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <span className="text-muted-foreground text-sm block mb-1.5 font-medium">نوع الحركة</span>
              <span className={`inline-block font-semibold px-3 py-1 rounded-full text-sm ${badgeColorClass}`}>
                {voucherTypeLabel}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground text-sm block mb-1.5 font-medium">رقم الحركة</span>
              <span className="text-lg font-bold text-text-primary block">#{voucher.id}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 border-t border-border-strong pt-4">
            <div>
              <span className="text-muted-foreground text-sm block mb-1.5 font-medium">منشئ الحركة</span>
              <span className="text-base font-semibold text-text-primary block">
                {voucher.creator_name || '—'} 
                {voucher.creator_role_label && (
                  <span className="text-xs text-muted-foreground mr-1.5 bg-bg-surface px-2 py-0.5 rounded border border-border-strong">
                    {voucher.creator_role_label}
                  </span>
                )}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground text-sm block mb-1.5 font-medium">التاريخ والوقت</span>
              <span className="text-base font-semibold text-text-primary block" dir="ltr">
                {voucher.date ? formatDateTime(voucher.date) : '—'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 border-t border-border-strong pt-4">
            <div>
              <span className="text-muted-foreground text-sm block mb-1.5 font-medium">الحساب المدين</span>
              <span className="text-base font-bold text-status-success-text block">{voucher.debit_account_name || '—'}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-sm block mb-1.5 font-medium">الحساب الدائن</span>
              <span className="text-base font-bold text-status-danger-text block">{voucher.credit_account_name || '—'}</span>
            </div>
          </div>

          {Number(voucher.related_transaction_id) > 0 && (
            <div className="grid grid-cols-2 gap-6 border-t border-border-strong pt-4">
              <div>
                <span className="text-muted-foreground text-sm block mb-1.5 font-medium">الحركة المقابلة</span>
                {pairedHref ? (
                  <Link
                    to={pairedHref}
                    onClick={closeModal}
                    title={`الانتقال إلى كشف حساب ${pairedAccountName || 'الحساب المقابل'} — الحركة #${pairedTransactionId}`}
                    className="text-base font-semibold text-text-brand underline underline-offset-4 hover:opacity-80 transition-opacity"
                    dir="ltr"
                  >
                    #{voucher.related_transaction_id}
                  </Link>
                ) : (
                  <span className="text-base font-semibold text-text-primary block" dir="ltr">
                    #{voucher.related_transaction_id}
                  </span>
                )}
              </div>
              <div>
                <span className="text-muted-foreground text-sm block mb-1.5 font-medium">حساب الحركة المقابلة</span>
                <span className="text-base font-semibold text-text-primary block">
                  {pairedAccountName || '—'}
                </span>
              </div>
            </div>
          )}

          <div className="border-t border-border-strong pt-4">
            <span className="text-muted-foreground text-sm block mb-1.5 font-medium">الوصف (البيان)</span>
            <span className="text-base text-text-primary block whitespace-pre-wrap leading-relaxed bg-bg-surface p-3 rounded-lg border border-border-strong">
              {voucher.description || '—'}
            </span>
          </div>

          <div className="border-t border-border-strong pt-4">
            <div className="flex justify-between items-center bg-bg-surface p-4 rounded-xl border border-border-strong">
              <span className="text-text-secondary text-base font-medium">المبلغ الإجمالي</span>
              <span className="text-3xl font-black text-text-brand">
                {formatCurrency(amount || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={closeModal} className="px-8 py-2.5 text-base font-medium">
            إغلاق
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};

export default VoucherDetailsModal;
