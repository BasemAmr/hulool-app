import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetTreasuryAccounts } from '../api/treasuryQueries';
import { useCategoryLabels } from '@/features/financials/constants/categoryConfig';
import HuloolDataGrid from '@/shared/grid/HuloolDataGrid';
import type { HuloolGridColumn } from '@/shared/grid/HuloolDataGrid';
import type { CellProps } from 'react-datasheet-grid';
import Button from '@/shared/ui/primitives/Button';
import { Landmark, ArrowRight, Folder } from 'lucide-react';
import type { TreasuryAccount } from '../api/treasuryQueries';

// Actions Cell to View Statement
const ActionsCell = React.memo(({ rowData }: CellProps<TreasuryAccount, any>) => {
  const navigate = useNavigate();
  // We can route to the existing cash-boxes details page as it queries account_type = 'treasury' internally
  return (
    <Button
      variant="outline-primary"
      size="sm"
      onClick={() => {
        if (rowData.sub_type === 'cashbox') {
          navigate(`/financial-center/cash-boxes/${rowData.id}`);
        } else {
          navigate(`/financial-center/treasury-accounts/${rowData.id}`);
        }
      }}
    >
      عرض كشف الحساب
    </Button>
  );
});
ActionsCell.displayName = 'ActionsCell';

export const TreasuryCategoryListPage = () => {
  const { subType = 'bank' } = useParams<{ subType: string }>();
  const navigate = useNavigate();
  const { data: accounts = [], isLoading } = useGetTreasuryAccounts();
  const categoryLabels = useCategoryLabels();

  // Filter accounts belonging to this specific subType
  const filteredAccounts = accounts.filter(acc => acc.sub_type === subType);

  const columns: HuloolGridColumn<TreasuryAccount>[] = [
    {
      id: 'name',
      title: 'اسم الحساب المالي',
      key: 'name',
      type: 'clientName',
      grow: 2,
    },
    {
      id: 'normal_balance',
      title: 'طبيعة الحساب',
      key: 'normal_balance',
      type: 'text',
      formatter: (val: string) => val === 'debit' ? 'مدين (Debit)' : 'دائن (Credit)',
    },
    {
      id: 'balance',
      title: 'الرصيد المالي الحالي',
      key: 'balance',
      type: 'currency',
    },
    {
      id: 'status',
      title: 'الحالة',
      key: 'is_active',
      type: 'badge',
      badgeColors: {
        '1': 'var(--token-status-success-bg)',
        '0': 'var(--token-status-neutral-bg)'
      },
      formatter: (val: any) => Number(val) === 1 ? 'نشط' : 'ملغي'
    },
    {
      id: 'actions',
      title: 'إجراءات',
      key: 'id',
      type: 'custom',
      component: ActionsCell as React.ComponentType<CellProps<TreasuryAccount, any>>,
      width: 160,
      grow: 0
    }
  ];

  return (
    <div className="p-6 space-y-6 text-right" dir="rtl">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/financial-center/accounts')}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowRight size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Landmark className="text-primary" />
              {categoryLabels[subType] || subType}
            </h1>
            <p className="text-text-secondary text-sm">عرض وتفاصيل الحسابات المالية تحت تصنيف {subType}</p>
          </div>
        </div>
      </div>

      <div className="bg-bg-surface rounded-lg shadow border border-border-default">
        <HuloolDataGrid
          data={filteredAccounts}
          columns={columns}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};
