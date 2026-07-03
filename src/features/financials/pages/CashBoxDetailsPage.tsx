import React from 'react';
import { useParams } from 'react-router-dom';
import { useGetCashBox, useGetCashBoxVouchers, useCloseCashBox, useVoidVoucher } from '../api/cashBoxQueries';
import HuloolDataGrid from '@/shared/grid/HuloolDataGrid';
import type { HuloolGridColumn } from '@/shared/grid/HuloolDataGrid';
import type { CellProps } from 'react-datasheet-grid';
import Button from '@/shared/ui/primitives/Button';
import { useModalStore } from '@/shared/stores/modalStore';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useToast } from '@/shared/hooks/useToast';
import type { CashBoxVoucher } from '@/api/types';

// Custom Cell for Row Actions (Edit/Void)
const ActionsCell = React.memo(({ rowData }: CellProps<CashBoxVoucher, any>) => {
  const openModal = useModalStore((state) => state.openModal);
  const toast = useToast();
  const voidMutation = useVoidVoucher();
  const { isAdmin } = useAuthStore(); // Add this line

  const handleEdit = () => {
    openModal('voucherEdit', { boxId: rowData.account_id, voucher: rowData });
  };

  const handleVoid = () => {
    openModal('confirmDelete', {
      title: 'إلغاء السند',
      message: 'هل أنت متأكد من إلغاء (حذف) هذا السند؟ لا يمكن التراجع عن هذا الإجراء.',
      onConfirm: () => {
        voidMutation.mutate(rowData.id, {
          onSuccess: () => toast.success('تم إلغاء السند بنجاح'),
          onError: (err: any) => toast.error('خطأ في الإلغاء', err.response?.data?.message || '')
        });
      }
    });
  };

  // Only show actions for admin users
  if (!isAdmin()) {
    return null; // Return nothing for non-admin users
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline-primary" size="sm" onClick={handleEdit}>
        تعديل
      </Button>
      <Button variant="outline-danger" size="sm" onClick={handleVoid} isLoading={voidMutation.isPending}>
        إلغاء
      </Button>
    </div>
  );
});
ActionsCell.displayName = 'ActionsCell';

export const CashBoxDetailsPage = () => {
  const { id } = useParams();
  const boxId = Number(id);

  const { data: box, isLoading: isLoadingBox } = useGetCashBox(boxId);
  const { data: vouchers, isLoading: isLoadingVouchers } = useGetCashBoxVouchers(boxId);

  const openModal = useModalStore((state) => state.openModal);
  const { isAdmin } = useAuthStore();
  const toast = useToast();
  const closeMutation = useCloseCashBox();

  if (isLoadingBox || isLoadingVouchers) {
    return <div className="p-6 text-center">جاري التحميل...</div>;
  }

  if (!box) {
    return <div className="p-6 text-center text-red-500">الصندوق غير موجود أو لا تملك صلاحية الوصول إليه.</div>;
  }

  const isClosed = box.status === 'closed';

  const handleCloseBox = () => {
    openModal('confirmDelete', {
      title: 'إغلاق الصندوق',
      message: 'هل أنت متأكد من إغلاق هذا الصندوق؟ سيتم تحويل الرصيد المتبقي إلى حساب الشركة الرئيسي وإغلاق الصندوق نهائياً.',
      onConfirm: () => {
        closeMutation.mutate(boxId, {
          onSuccess: () => toast.success('تم إغلاق الصندوق بنجاح'),
          onError: (err: any) => toast.error('فشل إغلاق الصندوق', err.response?.data?.message || '')
        });
      }
    });
  };

  const columns: HuloolGridColumn<CashBoxVoucher>[] = [
    {
      id: 'date',
      title: 'التاريخ',
      key: 'date',
      type: 'date',
      grow: 1
    },
    {
      id: 'type',
      title: 'النوع',
      key: 'type',
      type: 'badge',
      badgeColors: {
        CASHBOX_RECEIPT: 'var(--token-status-success-bg)',
        CASHBOX_PAYMENT: 'var(--token-status-danger-bg)'
      },
      formatter: (val: string) => val === 'CASHBOX_RECEIPT' ? 'قبض' : 'صرف',
      grow: 0.8
    },
    {
      id: 'category',
      title: 'التصنيف',
      key: 'category',
      type: 'text',
      grow: 1
    },
    {
      id: 'description',
      title: 'البيان',
      key: 'description',
      type: 'text',
      formatter: (val: string) => {
        const match = val?.match(/^\[.*?\]\s*(.*)$/);
        return match ? match[1] : val;
      },
      grow: 2
    },
    {
      id: 'debit',
      title: 'مدين (قبض)',
      key: 'debit',
      type: 'currency',
      grow: 1
    },
    {
      id: 'credit',
      title: 'دائن (صرف)',
      key: 'credit',
      type: 'currency',
      grow: 1
    },
    {
      id: 'balance',
      title: 'الرصيد',
      key: 'balance',
      type: 'currency',
      grow: 1
    },
    ...(!isClosed ? [{
      id: 'actions',
      title: 'إجراءات',
      key: 'id',
      type: 'custom' as const,
      component: ActionsCell as any,
      width: 150,
      grow: 0
    }] : [])
  ];

  return (
    <div className="p-6 space-y-6 text-right" dir="rtl">
      {/* Header Info Card */}
      {/* Header Info Card */}
      <div className="flex justify-between items-center bg-bg-surface p-6 rounded-lg shadow border border-border-default">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-text-primary">
            {box.name}
            {isClosed && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-status-neutral-bg text-status-neutral-text border border-status-neutral-border">
                مغلق
              </span>
            )}
          </h2>
          <p className="text-text-secondary mt-1">الموظف المسؤول: {box.employee_name || '—'}</p>
        </div>
        <div className="text-left">
          <p className="text-text-secondary text-sm">الرصيد الحالي</p>
          <p className="text-3xl font-extrabold text-text-brand mt-1">
            {Number(box.balance || 0).toLocaleString()} ريال
          </p>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button
            disabled={isClosed}
            onClick={() => openModal('recordVoucher', { boxId, defaultType: 'receipt' })}
          >
            تسجيل سند قبض
          </Button>
          <Button
            variant="outline-danger"
            disabled={isClosed}
            onClick={() => openModal('recordVoucher', { boxId, defaultType: 'payment' })}
          >
            تسجيل سند صرف
          </Button>
        </div>

        {isAdmin() && !isClosed && (
          <Button
            variant="outline-primary"
            onClick={handleCloseBox}
            isLoading={closeMutation.isPending}
          >
            إغلاق الصندوق
          </Button>
        )}
      </div>

      {/* Ledger statement list */}
      <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
        <HuloolDataGrid
          columns={columns}
          data={vouchers || []}
          emptyMessage="لا توجد سندات مسجلة بعد"
          isLoading={isLoadingVouchers}
        />
      </div>
    </div>
  );
};
