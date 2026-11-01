/**
 * ClientsTable - Excel-like grid for displaying clients
 * 
 * Uses HuloolDataGrid for consistent styling with:
 * - Uneditable cells
 * - Arabic Cairo font
 * - Semantic color coding
 * - WhatsApp integration
 * - Separated actions
 */

import React, { useMemo } from 'react';
import type { Client } from '@/api/types';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import HuloolDataGrid from '@/shared/grid/HuloolDataGrid';
import type { HuloolGridColumn } from '@/shared/grid/HuloolDataGrid';
import type { CellProps } from 'react-datasheet-grid';
import { useModalStore } from '@/shared/stores/modalStore';
import { FilePlus, ListPlus, Edit3, TrendingUp, TrendingDown, ChevronDown } from 'lucide-react';
import GoogleDriveIcon from '@/shared/ui/icons/GoogleDriveIcon';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/shared/ui/shadcn/dropdown-menu';
import {
  buildSettlementQabdPreset,
  buildSettlementSarfPreset,
} from '@/features/financials/utils/settlementPresets';

const neutralActionButtonClass = 'inline-flex items-center justify-center rounded p-1 text-text-secondary hover:text-text-primary hover:bg-muted/40 cursor-pointer transition-colors duration-150';

interface ClientsTableProps {
  clients: Client[];
  isLoading: boolean;
  onEdit: (client: Client) => void;
  onAddTask: (client: Client) => void;
  onAddInvoice: (client: Client) => void;
  onQabd?: (clientId: number) => void;
  onSarf?: (clientId: number) => void;
  onTaswiyaQabd?: (clientId: number) => void;
  onTaswiyaSarf?: (clientId: number) => void;
  linkBasePath?: string;
  showSettlement?: boolean;
}

// ================================
// CUSTOM CELL COMPONENTS
// ================================

// Client Name Cell with Link
const ClientNameLinkCell = React.memo(({ 
  rowData, 
  columnData, 
  focus 
}: CellProps<Client, { linkBasePath: string }>) => {
  const linkBasePath = columnData?.linkBasePath || '/clients';
  
  return (
    <div style={{ 
      fontWeight: 700, 
      fontSize: focus ? '1.05em' : '1em',
    }}>
      <Link 
        to={`${linkBasePath}/${rowData.id}`} 
        className="no-underline text-text-primary font-bold hover:text-primary transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {rowData.name}
      </Link>
    </div>
  );
});
ClientNameLinkCell.displayName = 'ClientNameLinkCell';

// Phone Cell with WhatsApp
const PhoneWithWhatsAppCell = React.memo(({ rowData }: CellProps<Client>) => {
  const formatPhoneForWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('966')) return cleanPhone;
    if (cleanPhone.startsWith('0')) return `966${cleanPhone.substring(1)}`;
    return `966${cleanPhone}`;
  };

  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const whatsappPhone = formatPhoneForWhatsApp(rowData.phone);
    window.open(`https://wa.me/${whatsappPhone}`, '_blank');
  };

  return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ color: 'var(--token-text-primary)' }}>{rowData.phone}</span>
      <button
        onClick={handleWhatsAppClick}
        title="فتح واتساب"
        style={{
          padding: '4px',
          borderRadius: '4px',
          border: 'none',
          backgroundColor: 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--token-status-success-bg)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--color-whatsapp)">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
        </svg>
      </button>
    </div>
  );
});
PhoneWithWhatsAppCell.displayName = 'PhoneWithWhatsAppCell';

// Region Badge Cell — neutral badge, no random hash colors
const RegionBadgeCell = React.memo(({ rowData }: CellProps<Client>) => {
  if (!rowData.region_name) {
    return <span style={{ color: 'var(--token-text-muted)' }}>—</span>;
  }

  return (
    <span style={{
      backgroundColor: 'var(--token-status-neutral-bg)',
      color: 'var(--token-status-neutral-text)',
      border: '1px solid var(--token-status-neutral-border)',
      padding: '4px 10px',
      borderRadius: '9999px',
      fontSize: '0.875rem',
      fontWeight: 500,
    }}>
      {rowData.region_name}
    </span>
  );
});
RegionBadgeCell.displayName = 'RegionBadgeCell';

// Notes Cell
const NotesCell = React.memo(({ rowData }: CellProps<Client>) => {
  const notes = rowData.notes;
  const displayNotes = notes 
    ? (notes.length > 50 ? `${notes.substring(0, 50)}...` : notes)
    : '—';
  
  return (
    <span style={{ color: 'var(--token-text-primary)' }}>
      {displayNotes}
    </span>
  );
});
NotesCell.displayName = 'NotesCell';

// Due Amount Cell
const DueAmountCell = React.memo(({ rowData }: CellProps<Client>) => {
  const amount = Number(rowData.total_outstanding || 0);
  const formatted = amount.toFixed(2);
  const color = amount > 0 ? 'var(--token-text-danger)' : 'var(--token-text-primary)';

  return (
    <div style={{ textAlign: 'center' }}>
      <span style={{ fontWeight: 600, color }}>
        {formatted}
      </span>
    </div>
  );
});
DueAmountCell.displayName = 'DueAmountCell';

// Actions Cell
interface ActionsCellProps extends CellProps<Client> {
  columnData: {
    onEdit: (client: Client) => void;
    onAddTask: (client: Client) => void;
    onAddInvoice: (client: Client) => void;
    onQabd?: (clientId: number) => void;
    onSarf?: (clientId: number) => void;
    onTaswiyaQabd?: (clientId: number) => void;
    onTaswiyaSarf?: (clientId: number) => void;
    showSettlement?: boolean;
  };
}

const ActionsCell = React.memo(({ rowData, columnData }: ActionsCellProps) => {
  const { onEdit, onAddTask, onAddInvoice, onQabd, onSarf, onTaswiyaQabd, onTaswiyaSarf, showSettlement } = columnData || {};

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: '100%',
        width: '100%',
        padding: '0 6px',
        pointerEvents: 'auto',
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Block 1: Client utility actions (Add invoice, Add task, Edit client, Open Google Drive) */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => onAddInvoice?.(rowData)}
          title="إضافة فاتورة"
          className={neutralActionButtonClass}
        >
          <FilePlus size={14} />
        </button>

        <button
          type="button"
          onClick={() => onAddTask?.(rowData)}
          title="إضافة مهمة"
          className={neutralActionButtonClass}
        >
          <ListPlus size={14} />
        </button>

        <button
          type="button"
          onClick={() => onEdit?.(rowData)}
          title="تعديل العميل"
          className={neutralActionButtonClass}
        >
          <Edit3 size={14} />
        </button>

        <button
          type="button"
          onClick={() => {
            if (rowData.google_drive_link) {
              window.open(rowData.google_drive_link, '_blank');
            }
          }}
          title={rowData.google_drive_link ? 'فتح Google Drive في صفحة جديدة' : 'لا يوجد رابط Google Drive'}
          disabled={!rowData.google_drive_link}
          className={`${neutralActionButtonClass} ${!rowData.google_drive_link ? 'opacity-30 cursor-not-allowed' : ''}`}
        >
          <GoogleDriveIcon size={14} />
        </button>
      </div>

      {/* Block 2: Transaction voucher actions (سند قبض, سند صرف, and settlement for admin) */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onQabd?.(rowData.id)}
          title="سند قبض"
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-bold rounded border border-status-success-border text-status-success-text bg-status-success-bg hover:opacity-85 transition-opacity cursor-pointer shadow-2xs"
        >
          <TrendingUp size={11} />
          قبض
        </button>
        <button
          type="button"
          onClick={() => onSarf?.(rowData.id)}
          title="سند صرف"
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-bold rounded border border-status-danger-border text-status-danger-text bg-status-danger-bg hover:opacity-85 transition-opacity cursor-pointer shadow-2xs"
        >
          <TrendingDown size={11} />
          صرف
        </button>

        {showSettlement && (
          <DropdownMenu dir="rtl">
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-bold rounded border border-border text-text-primary bg-background hover:bg-muted/40 transition-colors cursor-pointer shadow-2xs"
              >
                تسوية
                <ChevronDown size={10} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[9999] min-w-[130px] bg-card border border-border shadow-xl">
              <DropdownMenuItem
                className="flex items-center gap-2 text-xs font-semibold text-status-success-text cursor-pointer hover:bg-status-success-bg/20 py-1.5"
                onClick={() => onTaswiyaQabd?.(rowData.id)}
              >
                <TrendingUp size={12} />
                تسوية قبض
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex items-center gap-2 text-xs font-semibold text-status-danger-text cursor-pointer hover:bg-status-danger-bg/20 py-1.5"
                onClick={() => onTaswiyaSarf?.(rowData.id)}
              >
                <TrendingDown size={12} />
                تسوية صرف
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
});
ActionsCell.displayName = 'ActionsCell';

// ================================
// MAIN COMPONENT
// ================================

const ClientsTable: React.FC<ClientsTableProps> = ({ 
  clients, 
  isLoading, 
  onEdit, 
  onAddTask, 
  onAddInvoice, 
  onQabd,
  onSarf,
  onTaswiyaQabd,
  onTaswiyaSarf,
  linkBasePath = '/clients',
  showSettlement: explicitShowSettlement,
}) => {
  const { t } = useTranslation();
  const openModal = useModalStore((state) => state.openModal);

  // By default, show settlement only for admin views (not employee view)
  const isEmployeeView = linkBasePath.startsWith('/employee');
  const canShowSettlement = explicitShowSettlement !== undefined ? explicitShowSettlement : !isEmployeeView;

  const handleDefaultQabd = (clientId: number) => {
    openModal('unifiedTransaction', {
      defaultFromCardType: 'client',
      defaultFromAccountId: String(clientId),
      defaultToCardType: 'cashbox',
      lockDirection: true,
      title: 'سند قبض',
    });
  };

  const handleDefaultSarf = (clientId: number) => {
    openModal('unifiedTransaction', {
      defaultFromCardType: 'cashbox',
      defaultToCardType: 'client',
      defaultToAccountId: String(clientId),
      lockDirection: true,
      title: 'سند صرف',
    });
  };

  const handleDefaultTaswiyaQabd = (clientId: number) => {
    openModal('unifiedTransaction', buildSettlementQabdPreset({
      kind: 'client',
      id: String(clientId),
    }));
  };

  const handleDefaultTaswiyaSarf = (clientId: number) => {
    openModal('unifiedTransaction', buildSettlementSarfPreset({
      kind: 'client',
      id: String(clientId),
    }));
  };

  const finalOnQabd = onQabd || handleDefaultQabd;
  const finalOnSarf = onSarf || handleDefaultSarf;
  const finalOnTaswiyaQabd = onTaswiyaQabd || handleDefaultTaswiyaQabd;
  const finalOnTaswiyaSarf = onTaswiyaSarf || handleDefaultTaswiyaSarf;

  // Define columns
  const columns = useMemo((): HuloolGridColumn<Client>[] => [
    {
      id: 'name',
      key: 'name',
      title: t('clients.tableHeaderName'),
      type: 'custom',
      component: ClientNameLinkCell,
      grow: 1,
    },
    {
      id: 'phone',
      key: 'phone',
      title: t('clients.tableHeaderPhone'),
      type: 'custom',
      component: PhoneWithWhatsAppCell,
      grow: 1,
    },
    {
      id: 'region',
      key: 'region_name',
      title: t('clients.tableHeaderRegion'),
      type: 'custom',
      component: RegionBadgeCell,
      grow: 1,
    },
    {
      id: 'notes',
      key: 'notes',
      title: t('clients.tableHeaderNotes'),
      type: 'custom',
      component: NotesCell,
      grow: 0.8,
    },
    {
      id: 'outstanding',
      key: 'total_outstanding',
      title: t('clients.tableHeaderDueAmount'),
      type: 'custom',
      component: DueAmountCell,
      grow: 1,
    },
    {
      id: 'actions',
      key: 'id',
      title: t('clients.tableHeaderActions'),
      type: 'custom',
      component: ActionsCell as React.ComponentType<CellProps<Client>>,
      width: canShowSettlement ? 320 : 290,
      grow: 1.8,
    },
  ], [t, linkBasePath, onEdit, onAddTask, onAddInvoice, finalOnQabd, finalOnSarf, finalOnTaswiyaQabd, finalOnTaswiyaSarf, canShowSettlement]);

  // Add columnData to actions column
  const columnsWithData = useMemo(() => {
    return columns.map(col => {
      if (col.id === 'name') {
        return { ...col, columnData: { linkBasePath } };
      }
      if (col.id === 'actions') {
        return { 
          ...col, 
          columnData: { 
            onEdit, 
            onAddTask, 
            onAddInvoice,
            onQabd: finalOnQabd,
            onSarf: finalOnSarf,
            onTaswiyaQabd: finalOnTaswiyaQabd,
            onTaswiyaSarf: finalOnTaswiyaSarf,
            showSettlement: canShowSettlement,
          } 
        };
      }
      return col;
    });
  }, [columns, linkBasePath, onEdit, onAddTask, onAddInvoice, finalOnQabd, finalOnSarf, finalOnTaswiyaQabd, finalOnTaswiyaSarf, canShowSettlement]);

  return (
    <HuloolDataGrid
      data={clients}
      columns={columnsWithData as HuloolGridColumn<Client>[]}
      isLoading={isLoading}
      emptyMessage={t('common.noResults')}
      showId={false}
    />
  );
};

export default ClientsTable;
