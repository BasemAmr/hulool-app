/**
 * ClientCreditsHistoryTable - Excel-like grid for displaying client credit history
 * 
 * Uses HuloolDataGrid for consistent styling with:
 * - Credit amounts in green
 * - Allocated in blue
 * - Remaining in primary color
 * - Uneditable cells
 * - Arabic Cairo font
 */

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useModalStore } from '../../stores/modalStore';
import type { ClientCredit } from '../../api/types';
import SaudiRiyalIcon from '../ui/SaudiRiyalIcon';
import { formatDate } from '../../utils/dateUtils';
import { Edit3, Trash2 } from 'lucide-react';
import HuloolDataGrid from '../grid/HuloolDataGrid';
import type { HuloolGridColumn } from '../grid/HuloolDataGrid';
import type { CellProps } from 'react-datasheet-grid';

interface ClientCreditsHistoryTableProps {
  credits: ClientCredit[];
  isLoading: boolean;
  clientId: number;
}

// ================================
// HELPER FUNCTIONS
// ================================

const formatCurrency = (amount: number) => {
  return Number(amount).toLocaleString('ar-SA', { 
    style: 'currency', 
    currency: 'SAR' 
  });
};

// ================================
// CUSTOM CELL COMPONENTS
// ================================

// Date Cell
const DateCell = React.memo(({ rowData }: CellProps<ClientCredit>) => {
  return (
    <div style={{ color: '#000000' }}>
      {formatDate(rowData.received_at)}
    </div>
  );
});
DateCell.displayName = 'DateCell';

// Description Cell
const DescriptionCell = React.memo(({ rowData }: CellProps<ClientCredit>) => {
  return (
    <div style={{ color: '#000000' }}>
      {rowData.description}
    </div>
  );
});
DescriptionCell.displayName = 'DescriptionCell';

// Amount Cell (Green)
const AmountCell = React.memo(({ rowData }: CellProps<ClientCredit>) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <SaudiRiyalIcon size={16} className="me-1 text-green-600" />
      <span style={{ color: '#16a34a', fontWeight: 700 }}>
        {formatCurrency(Number(rowData.amount))}
      </span>
    </div>
  );
});
AmountCell.displayName = 'AmountCell';

// Allocated Cell (Blue)
const AllocatedCell = React.memo(({ rowData }: CellProps<ClientCredit>) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <SaudiRiyalIcon size={16} className="me-1 text-blue-500" />
      <span style={{ color: '#3b82f6' }}>
        {formatCurrency(Number(rowData.allocated_amount))}
      </span>
    </div>
  );
});
AllocatedCell.displayName = 'AllocatedCell';

// Remaining Cell (Primary)
const RemainingCell = React.memo(({ rowData }: CellProps<ClientCredit>) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <SaudiRiyalIcon size={16} className="me-1" style={{ color: 'var(--color-primary)' }} />
      <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
        {formatCurrency(Number(rowData.remaining_amount))}
      </span>
    </div>
  );
});
RemainingCell.displayName = 'RemainingCell';

// Actions Cell
interface ActionsCellData {
  onEdit: (credit: ClientCredit) => void;
  onDelete: (credit: ClientCredit) => void;
}

const ActionsCell = React.memo(({ rowData, columnData }: CellProps<ClientCredit, ActionsCellData>) => {
  const { onEdit, onDelete } = columnData || {};
  const { t } = useTranslation();

  if (!columnData) return null;

  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      <button
        className="p-1.5 border border-red-600 text-red-600 rounded-md hover:bg-red-50 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          onDelete?.(rowData);
        }}
        title={t('common.delete')}
      >
        <Trash2 size={16} />
      </button>
      <button
        className="p-1.5 border border-primary text-primary rounded-md hover:bg-primary/10 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          onEdit?.(rowData);
        }}
        title={t('common.edit')}
      >
        <Edit3 size={16} />
      </button>
    </div>
  );
});
ActionsCell.displayName = 'ActionsCell';

// ================================
// MAIN COMPONENT
// ================================

const ClientCreditsHistoryTable: React.FC<ClientCreditsHistoryTableProps> = ({ 
  credits, 
  isLoading, 
  clientId 
}) => {
  const { t } = useTranslation();
  const openModal = useModalStore((state) => state.openModal);

  const handleEditCredit = (credit: ClientCredit) => {
    openModal('creditEdit', { credit, clientId });
  };

  const handleDeleteCredit = (credit: ClientCredit) => {
    openModal('creditDelete', { credit, clientId });
  };

  // Define columns
  const columns = useMemo((): HuloolGridColumn<ClientCredit>[] => [
    {
      id: 'date',
      key: 'received_at',
      title: t('common.date'),
      type: 'custom',
      component: DateCell,
      grow: 1,
    },
    {
      id: 'description',
      key: 'description',
      title: t('common.description'),
      type: 'custom',
      component: DescriptionCell,
      grow: 2,
    },
    {
      id: 'amount',
      key: 'amount',
      title: t('common.amount'),
      type: 'custom',
      component: AmountCell,
      grow: 1,
    },
    {
      id: 'allocated',
      key: 'allocated_amount',
      title: t('clients.allocatedAmount'),
      type: 'custom',
      component: AllocatedCell,
      grow: 1,
    },
    {
      id: 'remaining',
      key: 'remaining_amount',
      title: t('clients.remainingAmount'),
      type: 'custom',
      component: RemainingCell,
      grow: 1,
    },
    {
      id: 'actions',
      key: 'id',
      title: t('common.actions'),
      type: 'custom',
      component: ActionsCell as React.ComponentType<CellProps<ClientCredit>>,
      width: 100,
      grow: 0,
    },
  ], [t]);

  // Add columnData
  const columnsWithData = useMemo(() => {
    return columns.map(col => {
      if (col.id === 'actions') {
        return {
          ...col,
          columnData: {
            onEdit: handleEditCredit,
            onDelete: handleDeleteCredit,
          },
        };
      }
      return col;
    });
  }, [columns]);

  if (!credits || credits.length === 0) {
    return (
      <div className="text-center py-4 text-black">
        {t('clients.noCreditsFound')}
      </div>
    );
  }

  return (
    <HuloolDataGrid
      data={credits}
      columns={columnsWithData as HuloolGridColumn<ClientCredit>[]}
      isLoading={isLoading}
      emptyMessage={t('clients.noCreditsFound')}
      showId={false}
    />
  );
};

export default ClientCreditsHistoryTable;
