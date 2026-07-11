import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useGetCashBox, useGetCashBoxVouchers, useCloseCashBox, useVoidVoucher, getSingleCashBoxExport } from '../api/cashBoxQueries';
import HuloolDataGrid from '@/shared/grid/HuloolDataGrid';
import type { HuloolGridColumn } from '@/shared/grid/HuloolDataGrid';
import type { CellProps } from 'react-datasheet-grid';
import Button from '@/shared/ui/primitives/Button';
import { useModalStore } from '@/shared/stores/modalStore';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useToast } from '@/shared/hooks/useToast';
import type { CashBoxVoucher } from '@/api/types';
import { exportService } from '@/services/export/ExportService';
import { TOAST_MESSAGES } from '@/shared/constants/toastMessages';
import { ExportChoiceModal } from '../modals/ExportChoiceModal';
import AccountDetailHeader from '../components/AccountDetailHeader';
import TransactionFilters from '../components/TransactionFilters';
import type { FilterState } from '../components/TransactionFilters';
import TransactionActionButtons from '../components/TransactionActionButtons';
import { Landmark } from 'lucide-react';

const ActionsCell = React.memo(({ rowData }: CellProps<CashBoxVoucher, any>) => {
  const openModal = useModalStore((state) => state.openModal);
  const toast = useToast();
  const voidMutation = useVoidVoucher();
  const { isAdmin } = useAuthStore();
  const { data: box } = useGetCashBox(rowData.account_id);
  const isClosed = box?.status === 'closed';

  const handleView = () => openModal('voucherDetails', { voucher: rowData });
  const handleEdit = () => openModal('voucherEdit', { boxId: rowData.account_id, voucher: rowData });
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

  return (
    <div className="flex gap-1.5">
      <Button variant="outline-primary" size="sm" onClick={handleView}>عرض</Button>
      {!isClosed && isAdmin() && (
        <>
          <Button variant="outline-primary" size="sm" onClick={handleEdit}>تعديل</Button>
          <Button variant="outline-danger" size="sm" onClick={handleVoid} isLoading={voidMutation.isPending}>إلغاء</Button>
        </>
      )}
    </div>
  );
});
ActionsCell.displayName = 'ActionsCell';

export const CashBoxDetailsPage = () => {
  const { id } = useParams();
  const boxId = Number(id);

  const { data: box, isLoading: isLoadingBox, error: boxError } = useGetCashBox(boxId);
  const { data: vouchers, isLoading: isLoadingVouchers, error: vouchersError } = useGetCashBoxVouchers(boxId);

  const openModal = useModalStore((state) => state.openModal);
  const { isAdmin } = useAuthStore();
  const toast = useToast();
  const closeMutation = useCloseCashBox();
  const [isExporting, setIsExporting] = useState(false);
  const [showExportChoice, setShowExportChoice] = useState(false);
  const [visibleCount, setVisibleCount] = useState(50);
  const [filters, setFilters] = useState<FilterState>({
    start_date: '',
    end_date: '',
    type: '',
    search: '',
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredVouchers = (vouchers || []).filter(v => {
    if (filters.start_date && v.date) {
      const vDate = v.date.split(' ')[0];
      if (vDate < filters.start_date) return false;
    }
    if (filters.end_date && v.date) {
      const vDate = v.date.split(' ')[0];
      if (vDate > filters.end_date) return false;
    }
    if (filters.type && v.type !== filters.type) return false;
    if (filters.search && v.description) {
      if (!v.description.toLowerCase().includes(filters.search.toLowerCase())) return false;
    }
    return true;
  });
  const totalFiltered = filteredVouchers.length;
  const hasMore = visibleCount < totalFiltered;

  const loadMore = useCallback(() => setVisibleCount(prev => prev + 50), []);

  useEffect(() => {
    const sentinel = scrollRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && hasMore) loadMore(); },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  if (isLoadingBox || isLoadingVouchers) {
    return <div className="p-6 text-center text-text-secondary">جاري التحميل...</div>;
  }

  if (boxError || !box) {
    return <div className="p-6 text-center text-status-danger-text">حدث خطأ أثناء تحميل الصندوق. تأكد من اتصالك بالخادم.</div>;
  }

  if (vouchersError) {
    return <div className="p-6 text-center text-status-danger-text">حدث خطأ أثناء تحميل سندات الصندوق.</div>;
  }

  const isClosed = box.status === 'closed';
  const visibleVouchers = filteredVouchers.slice(0, visibleCount);

  const handleExportFiltered = async () => {
    try {
      setIsExporting(true);
      const exportItems = (visibleVouchers || []).map(v => ({
        id: v.id,
        date: v.date,
        type: v.type,
        type_label: v.type === 'CASHBOX_RECEIPT' ? 'قبض' : 'صرف',
        description: v.description,
        category: v.category,
        debit: v.debit,
        credit: v.credit,
        balance: v.balance,
        cashbox_name: box.name,
        employee_name: box.employee_name || '',
      }));
      await exportService.exportCashBox({ title: `كشف حركة صندوق العهدة - ${box.name}`, items: exportItems });
      toast.success(TOAST_MESSAGES.EXPORT_SUCCESS || 'تم التصدير بنجاح');
    } catch (err: any) {
      toast.error(TOAST_MESSAGES.EXPORT_FAILED || 'فشل التصدير', err.message || '');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportFull = async () => {
    try {
      setIsExporting(true);
      const allData = await getSingleCashBoxExport(boxId);
      await exportService.exportCashBox({ title: `كشف حركة صندوق العهدة كامل - ${box.name}`, items: allData || [] });
      toast.success(TOAST_MESSAGES.EXPORT_SUCCESS || 'تم التصدير بنجاح');
    } catch (err: any) {
      toast.error(TOAST_MESSAGES.EXPORT_FAILED || 'فشل التصدير', err.message || '');
    } finally {
      setIsExporting(false);
    }
  };

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
    { id: 'date', title: 'التاريخ', key: 'date', type: 'date', grow: 1 },
    {
      id: 'type', title: 'النوع', key: 'type',
      cellClassName: ({ rowData }) => {
        if ((rowData.type ?? '') === 'CASHBOX_RECEIPT') return 'cashbox-debit-cell text-center';
        return 'cashbox-credit-cell text-center';
      },
      formatter: (val: string) => val === 'CASHBOX_RECEIPT' ? 'قبض' : 'صرف',
      grow: 0.8
    },
    { id: 'description', title: 'البيان', key: 'description', type: 'text', grow: 2.5 },
    {
      id: 'debit', title: 'مدين (قبض)', key: 'debit', type: 'currency',
      cellClassName: ({ rowData }) => (rowData.debit ?? 0) > 0 ? 'cashbox-debit-cell' : '',
      grow: 1,
    },
    {
      id: 'credit', title: 'دائن (صرف)', key: 'credit', type: 'currency',
      cellClassName: ({ rowData }) => (rowData.credit ?? 0) > 0 ? 'cashbox-credit-cell' : '',
      grow: 1,
    },
    { id: 'balance', title: 'الرصيد', key: 'balance', type: 'currency', grow: 1 },
    { id: 'actions', title: 'إجراءات', key: 'id', type: 'custom' as const, component: ActionsCell as any, width: 220, grow: 0 },
  ];

  const subtitle = `الموظف المسؤول: ${box.employee_name || '—'}`;

  return (
    <>
      <div className="p-6 space-y-4 text-right" dir="rtl">
        <AccountDetailHeader
          name={box.name}
          balance={box.balance || 0}
          icon={<Landmark size={24} />}
          subtitle={subtitle}
          status={isClosed ? { label: 'مغلق', variant: 'neutral' } : undefined}
        />

        <TransactionActionButtons
          accountId={boxId}
          cardType="company_cashbox"
          isClosed={isClosed}
          onExport={() => setShowExportChoice(true)}
          isExporting={isExporting}
          onClose={handleCloseBox}
          closePending={closeMutation.isPending}
        />

        <div className="border-b border-border-default pb-1">
          <TransactionFilters
            filters={filters}
            onChange={f => { setVisibleCount(50); setFilters(f); }}
            onReset={() => { setFilters({ start_date: '', end_date: '', type: '', search: '' }); setVisibleCount(50); }}
          />
        </div>

        <div className="bg-bg-surface rounded-lg border border-border-default overflow-hidden">
          <HuloolDataGrid
            columns={columns}
            data={visibleVouchers}
            emptyMessage="لا توجد سندات مسجلة بعد"
            isLoading={isLoadingVouchers}
          />

          {hasMore && (
            <div ref={scrollRef} className="flex justify-center items-center py-3 border-t border-border-default">
              <div className="text-sm text-text-secondary">جاري تحميل المزيد...</div>
            </div>
          )}

          {totalFiltered > 0 && (
            <div className="flex justify-center items-center py-2 border-t border-border-default bg-bg-surface-muted/30">
              <div className="text-xs text-text-secondary">
                عرض {visibleVouchers.length} من {totalFiltered} سند
              </div>
            </div>
          )}
        </div>
      </div>

      <ExportChoiceModal
        isOpen={showExportChoice}
        onClose={() => setShowExportChoice(false)}
        onExportFiltered={handleExportFiltered}
        onExportFull={handleExportFull}
        title="تصدير كشف الصندوق"
      />
    </>
  );
};
