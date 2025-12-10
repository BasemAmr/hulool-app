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
import type { Client } from '../../api/types';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import HuloolDataGrid from '../grid/HuloolDataGrid';
import type { HuloolGridColumn } from '../grid/HuloolDataGrid';
import { 
  GridActionBar,
  createEditAction,
  createAddTaskAction,
  createAddInvoiceAction,
  createGoogleDriveAction,
} from '../grid';
import type { GridAction } from '../grid';
import type { CellProps } from 'react-datasheet-grid';

interface ClientsTableProps {
  clients: Client[];
  isLoading: boolean;
  onEdit: (client: Client) => void;
  onAddTask: (client: Client) => void;
  onAddInvoice: (client: Client) => void;
  linkBasePath?: string;
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
        className="no-underline text-black font-bold hover:text-primary transition-colors"
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
      <span style={{ color: '#000000' }}>{rowData.phone}</span>
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
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dcfce7'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
        </svg>
      </button>
    </div>
  );
});
PhoneWithWhatsAppCell.displayName = 'PhoneWithWhatsAppCell';

// Region Badge Cell
const RegionBadgeCell = React.memo(({ rowData }: CellProps<Client>) => {
  const getRegionColor = (regionName: string | null | undefined): string => {
    if (!regionName) return '#6b7280';
    const colors = ['#3b82f6', '#22c55e', '#0ea5e9', '#eab308', '#ef4444', '#8b5cf6'];
    const hash = regionName.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  };

  if (!rowData.region_name) {
    return <span style={{ color: '#000000' }}>—</span>;
  }

  return (
    <span style={{
      backgroundColor: getRegionColor(rowData.region_name),
      color: '#ffffff',
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
    <span style={{ color: '#000000' }}>
      {displayNotes}
    </span>
  );
});
NotesCell.displayName = 'NotesCell';

// Due Amount Cell
const DueAmountCell = React.memo(({ rowData }: CellProps<Client>) => {
  const amount = Number(rowData.total_outstanding || 0);
  const formatted = amount.toFixed(2);
  const color = amount > 0 ? '#dc2626' : '#000000';
  
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
  };
}

const ActionsCell = React.memo(({ rowData, rowIndex, columnData }: ActionsCellProps) => {
  const actions: GridAction<Client>[] = useMemo(() => [
    createAddInvoiceAction<Client>(columnData.onAddInvoice),
    createAddTaskAction<Client>(columnData.onAddTask),
    createEditAction<Client>(columnData.onEdit),
    createGoogleDriveAction<Client>((client) => client.google_drive_link),
  ], [columnData.onEdit, columnData.onAddTask, columnData.onAddInvoice]);

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', height: '100%' }}>
      <GridActionBar
        item={rowData}
        index={rowIndex}
        actions={actions}
        compact
      />
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
  linkBasePath = '/clients'
}) => {
  const { t } = useTranslation();

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
      grow: 2,
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
      width: 180,
      grow: 0,
    },
  ], [t, linkBasePath, onEdit, onAddTask, onAddInvoice]);

  // Add columnData to actions column
  const columnsWithData = useMemo(() => {
    return columns.map(col => {
      if (col.id === 'name') {
        return { ...col, columnData: { linkBasePath } };
      }
      if (col.id === 'actions') {
        return { 
          ...col, 
          columnData: { onEdit, onAddTask, onAddInvoice } 
        };
      }
      return col;
    });
  }, [columns, linkBasePath, onEdit, onAddTask, onAddInvoice]);

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
