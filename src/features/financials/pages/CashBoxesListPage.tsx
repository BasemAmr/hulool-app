import { useNavigate } from 'react-router-dom';
import { useGetCashBoxes } from '../api/cashBoxQueries';
import HuloolDataGrid from '@/shared/grid/HuloolDataGrid';
import type { HuloolGridColumn } from '@/shared/grid/HuloolDataGrid';
import type { CellProps } from 'react-datasheet-grid';
import Button from '@/shared/ui/primitives/Button';
import { Plus } from 'lucide-react';
import type { CashBox } from '@/api/types';
import React from 'react'; // Ensure React is imported for React.memo
import { useModalStore } from '@/shared/stores/modalStore';

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

export const CashBoxesListPage = () => {
  const { data: boxes, isLoading } = useGetCashBoxes();
  const openModal = useModalStore((state) => state.openModal);

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
        <Button onClick={() => openModal('cashBoxForm', {})}>
          <Plus className="h-4 w-4 ml-2" />
          إنشاء صندوق جديد
        </Button>
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
