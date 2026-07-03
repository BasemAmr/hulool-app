import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetCashBoxes, getCashBoxesExport } from '../api/cashBoxQueries';
import HuloolDataGrid from '@/shared/grid/HuloolDataGrid';
import type { HuloolGridColumn } from '@/shared/grid/HuloolDataGrid';
import type { CellProps } from 'react-datasheet-grid';
import Button from '@/shared/ui/primitives/Button';
import { Plus, FileSpreadsheet } from 'lucide-react';
import type { CashBox } from '@/api/types';
import { useModalStore } from '@/shared/stores/modalStore';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useToast } from '@/shared/hooks/useToast';
import { TOAST_MESSAGES } from '@/shared/constants/toastMessages';

// Custom Cell for Actions
const ActionsCell = React.memo(({ rowData }: CellProps<CashBox, any>) => {
  const navigate = useNavigate();
  return (
    <Button 
      variant="outline-primary" 
      size="sm" 
      onClick={() => navigate(`/financial-center/cash-boxes/${rowData.id}`)}
    >
      عرض السندات
    </Button>
  );
});
ActionsCell.displayName = 'ActionsCell';

import { exportService } from '@/services/export/ExportService';

export const CashBoxesListPage = () => {
  const { data: boxes, isLoading } = useGetCashBoxes();
  const openModal = useModalStore((state) => state.openModal);
  const { isAdmin } = useAuthStore();
  const toast = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleExportAll = async () => {
    try {
      setIsExporting(true);
      const data = await getCashBoxesExport();
      await exportService.exportCashBox({
        title: 'تقرير كشف حركة جميع صناديق العهدة',
        items: data || [],
      });
      toast.success(TOAST_MESSAGES.EXPORT_SUCCESS || 'تم التصدير بنجاح');
    } catch (err: any) {
      toast.error(TOAST_MESSAGES.EXPORT_FAILED || 'فشل التصدير', err.message || '');
    } finally {
      setIsExporting(false);
    }
  };

  const columns: HuloolGridColumn<CashBox>[] = [
    {
      id: 'name',
      title: 'اسم الصندوق',
      key: 'name',
      type: 'clientName',
      grow: 2,
    },
    {
      id: 'employee_name',
      title: 'الموظف المسؤول',
      key: 'employee_name',
      type: 'text',
    },
    {
      id: 'balance',
      title: 'الرصيد الحالي',
      key: 'balance',
      type: 'currency',
    },
    {
      id: 'status',
      title: 'الحالة',
      key: 'status',
      type: 'badge',
      badgeColors: {
        active: 'var(--token-status-success-bg)',
        closed: 'var(--token-status-neutral-bg)'
      }
    },
    {
      id: 'actions',
      title: 'إجراءات',
      key: 'id',
      type: 'custom',
      component: ActionsCell as React.ComponentType<CellProps<CashBox, any>>,
      width: 150,
      grow: 0
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">صناديق العهدة</h1>
        <div className="flex gap-2">
          {isAdmin() && (
            <Button
              variant="outline-primary"
              onClick={handleExportAll}
              isLoading={isExporting}
            >
              <FileSpreadsheet className="h-4 w-4 ml-2" />
              تصدير الكل لـ Excel
            </Button>
          )}
          <Button onClick={() => openModal('cashBoxForm', {})}>
            <Plus className="h-4 w-4 ml-2" />
            إنشاء صندوق جديد
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <HuloolDataGrid
          data={boxes || []}
          columns={columns}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};
