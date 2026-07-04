import React from 'react';
import { useModalStore } from '@/shared/stores/modalStore';
import BaseModal from '@/shared/ui/layout/BaseModal';
import Button from '@/shared/ui/primitives/Button';
import type { CashBoxVoucher } from '@/api/types';
import { formatCurrency } from '@/shared/utils';
import { formatDateTime } from '@/shared/utils/dateUtils';

interface VoucherDetailsModalProps {
  voucher: CashBoxVoucher;
}

const VoucherDetailsModal = () => {
  const closeModal = useModalStore((state) => state.closeModal);
  const props = useModalStore((state) => state.props as VoucherDetailsModalProps);
  const { voucher } = props;

  if (!voucher) return null;

  const isReceipt = voucher.type === 'CASHBOX_RECEIPT' || (voucher.debit ?? 0) > 0;
  const voucherTypeLabel = isReceipt ? 'سند قبض (إيداع)' : 'سند صرف (دفعة)';
  const amount = isReceipt ? voucher.debit : voucher.credit;

  return (
    <BaseModal isOpen={true} onClose={closeModal} title="تفاصيل السند" className="voucher-details-modal max-w-xl">
      <div className="space-y-6 p-5 text-right" dir="rtl">
        {/* Info Grid */}
        <div className="bg-bg-surface-muted rounded-xl p-6 border border-border-strong space-y-5">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <span className="text-muted-foreground text-sm block mb-1.5 font-medium">نوع السند</span>
              <span className={`inline-block font-semibold px-3 py-1 rounded-full text-sm ${
                isReceipt 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {voucherTypeLabel}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground text-sm block mb-1.5 font-medium">رقم السند</span>
              <span className="text-lg font-bold text-text-primary block">#{voucher.id}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 border-t border-border-strong pt-4">
            <div>
              <span className="text-muted-foreground text-sm block mb-1.5 font-medium">منشئ السند</span>
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
              <span className="text-base font-bold text-green-600 block">{voucher.debit_account_name || '—'}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-sm block mb-1.5 font-medium">الحساب الدائن</span>
              <span className="text-base font-bold text-red-600 block">{voucher.credit_account_name || '—'}</span>
            </div>
          </div>

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
