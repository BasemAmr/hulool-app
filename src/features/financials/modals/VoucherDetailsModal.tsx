import React from 'react';
import { useModalStore } from '@/shared/stores/modalStore';
import BaseModal from '@/shared/ui/layout/BaseModal';
import Button from '@/shared/ui/primitives/Button';
import type { CashBoxVoucher } from '@/api/types';
import { formatCurrency } from '@/shared/utils';

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
    <BaseModal isOpen={true} onClose={closeModal} title="تفاصيل السند" className="voucher-details-modal">
      <div className="space-y-4 p-4 text-right" dir="rtl">
        {/* Info Grid */}
        <div className="bg-bg-surface-muted rounded-lg p-4 border border-border-strong space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-muted-foreground text-xs block mb-1">نوع السند</span>
              <span className={`font-semibold px-2 py-0.5 rounded text-sm ${isReceipt ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {voucherTypeLabel}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground text-xs block mb-1">رقم السند</span>
              <span className="font-semibold text-text-primary">#{voucher.id}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-border-strong pt-3">
            <div>
              <span className="text-muted-foreground text-xs block mb-1">منشئ السند</span>
              <span className="font-semibold text-text-primary">
                {voucher.creator_name || '—'} 
                {voucher.creator_role_label && (
                  <span className="text-xs text-muted-foreground mr-1">({voucher.creator_role_label})</span>
                )}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground text-xs block mb-1">التاريخ</span>
              <span className="font-semibold text-text-primary">{voucher.date || '—'}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-border-strong pt-3">
            <div>
              <span className="text-muted-foreground text-xs block mb-1">الحساب المدين</span>
              <span className="font-semibold text-green-600">{voucher.debit_account_name || '—'}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-xs block mb-1">الحساب الدائن</span>
              <span className="font-semibold text-red-600">{voucher.credit_account_name || '—'}</span>
            </div>
          </div>

          <div className="border-t border-border-strong pt-3">
            <span className="text-muted-foreground text-xs block mb-1">الوصف (البيان)</span>
            <span className="font-semibold text-text-primary block whitespace-pre-wrap">{voucher.description || '—'}</span>
          </div>

          <div className="border-t border-border-strong pt-3 flex justify-between items-center">
            <span className="text-muted-foreground text-sm">المبلغ الإجمالي</span>
            <span className="text-2xl font-extrabold text-text-brand">
              {formatCurrency(amount || 0)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={closeModal} className="px-6">
            إغلاق
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};

export default VoucherDetailsModal;
