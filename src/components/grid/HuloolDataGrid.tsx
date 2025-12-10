/**
 * HuloolDataGrid - Excel-like data grid component
 * 
 * A styled wrapper around react-datasheet-grid providing:
 * - RTL support with automatic column reversal
 * - Auto-sizing cells to fit content (column width = largest cell)
 * - Automatic active cell styling (bold text)
 * - Semantic color coding (debit: black, credit: green, due: red)
 * - Alternating row colors with type-based coloring
 * - WhatsApp integration for phone cells
 * - Simplified props interface
 * 
 * USAGE:
 * Columns are defined in reading order (right-to-left for Arabic).
 * The component automatically reverses column order internally for RTL display.
 * First column in your definition = rightmost column in the grid.
 */

import React, { useMemo, useCallback } from 'react';
import { DataSheetGrid } from 'react-datasheet-grid';
import type { Column, CellProps, ContextMenuItem } from 'react-datasheet-grid';
import 'react-datasheet-grid/dist/style.css';

// ================================
// TYPE DEFINITIONS
// ================================

export interface HuloolGridColumn<T = any> {
  /** Unique identifier for the column */
  id: string;
  /** Header title (displayed in header row) */
  title: string;
  /** Column type - determines cell rendering */
  type?: 'text' | 'number' | 'currency' | 'debit' | 'credit' | 'due' | 'phone' | 'clientName' | 'date' | 'badge' | 'custom';
  /** Key in row data to get value from (supports dot notation for nested) */
  key: keyof T | string;
  /** Fixed width in pixels (optional - uses fit-content if not specified) */
  width?: number;
  /** Flex grow factor (default: 1, use 0 for fixed-width columns) */
  grow?: number;
  /** Custom cell component (for type='custom') */
  component?: React.ComponentType<CellProps<T, any>>;
  /** Badge color map (for type='badge') */
  badgeColors?: Record<string, string>;
  /** Value formatter function - can return string or ReactNode */
  formatter?: ((value: any, row: T) => any);
  /** Hide this column */
  hidden?: boolean;
  /** Additional data passed to cell component */
  columnData?: any;
}

export interface HuloolGridProps<T extends Record<string, any>> {
  /** Array of row data */
  data: T[];
  /** Column definitions (in RTL reading order - first = rightmost) */
  columns: HuloolGridColumn<T>[];
  /** Show loading spinner */
  isLoading?: boolean;
  /** Message when data is empty */
  emptyMessage?: string;
  /** Grid height: number (px), 'auto' (fit content), or 'fill' (fill container) */
  height?: number | 'auto' | 'fill';
  /** Row height in pixels */
  rowHeight?: number;
  /** Field used for type-based row coloring */
  typeField?: keyof T;
  /** Custom type colors */
  typeColors?: Record<string, { base: string; alternate: string }>;
  /** Show auto-generated ID column */
  showId?: boolean;
  /** Field to use for ID column */
  idField?: keyof T;
  /** Additional CSS class */
  className?: string;
  /** Make header sticky */
  stickyHeader?: boolean;
  /** Minimum height when using 'auto' */
  minHeight?: number;
}

// ================================
// TYPE-BASED ROW COLORS
// ================================

export const DEFAULT_TYPE_COLORS: Record<string, { base: string; alternate: string }> = {
  Government: { base: 'rgba(74, 162, 255, 0.08)', alternate: 'rgba(74, 162, 255, 0.15)' },
  RealEstate: { base: 'rgba(90, 175, 110, 0.08)', alternate: 'rgba(90, 175, 110, 0.15)' },
  Accounting: { base: 'rgba(248, 220, 61, 0.08)', alternate: 'rgba(248, 220, 61, 0.15)' },
  Other: { base: 'rgba(206, 208, 209, 0.08)', alternate: 'rgba(206, 208, 209, 0.15)' },
};

const DEFAULT_ALTERNATE_COLORS = {
  even: 'rgba(255, 255, 255, 1)',
  odd: 'rgba(248, 250, 252, 1)',
};

// ================================
// HELPER FUNCTIONS
// ================================

/** Get nested value from object using dot notation */
function getNestedValue(obj: any, path: string): any {
  if (!path) return undefined;
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/** Format currency in SAR */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 2,
  }).format(value);
}

/** Format date */
function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return '—';
  }
}

// ================================
// CELL COMPONENTS
// Each cell uses the `active` prop to apply bold styling
// ================================

/** Text Cell */
const TextCell = React.memo(({ rowData, columnData, active }: CellProps<any, { key: string; formatter?: (val: any, row: any) => any }>) => {
  const value = columnData?.key ? getNestedValue(rowData, columnData.key) : '';
  const displayValue = columnData?.formatter ? columnData.formatter(value, rowData) : value;
  return (
    <span className="hulool-cell-content hulool-text" style={{ fontWeight: active ? 700 : 400 }}>
      {displayValue ?? '—'}
    </span>
  );
});
TextCell.displayName = 'TextCell';

/** Client Name Cell */
const ClientNameCell = React.memo(({ rowData, columnData, active }: CellProps<any, { key: string }>) => {
  const value = columnData?.key ? getNestedValue(rowData, columnData.key) : '';
  return (
    <span className="hulool-cell-content hulool-client-name" style={{ fontWeight: active ? 800 : 600 }}>
      {value ?? '—'}
    </span>
  );
});
ClientNameCell.displayName = 'ClientNameCell';

/** Currency Cell */
const CurrencyCell = React.memo(({ rowData, columnData, active }: CellProps<any, { key: string; color?: string }>) => {
  const value = columnData?.key ? getNestedValue(rowData, columnData.key) : 0;
  const numValue = Number(value) || 0;
  return (
    <span className="hulool-cell-content hulool-currency" style={{ color: columnData?.color || '#000000', fontWeight: active ? 700 : 500 }}>
      {numValue !== 0 ? formatCurrency(numValue) : '—'}
    </span>
  );
});
CurrencyCell.displayName = 'CurrencyCell';

/** Debit Cell */
const DebitCell = React.memo(({ rowData, columnData, active }: CellProps<any, { key: string }>) => {
  const value = columnData?.key ? getNestedValue(rowData, columnData.key) : 0;
  const numValue = Number(value) || 0;
  return (
    <span className="hulool-cell-content hulool-debit" style={{ fontWeight: active ? 700 : 500 }}>
      {numValue > 0 ? formatCurrency(numValue) : '—'}
    </span>
  );
});
DebitCell.displayName = 'DebitCell';

/** Credit Cell */
const CreditCell = React.memo(({ rowData, columnData, active }: CellProps<any, { key: string }>) => {
  const value = columnData?.key ? getNestedValue(rowData, columnData.key) : 0;
  const numValue = Number(value) || 0;
  return (
    <span className="hulool-cell-content hulool-credit" style={{ fontWeight: active ? 700 : 500 }}>
      {numValue > 0 ? formatCurrency(numValue) : '—'}
    </span>
  );
});
CreditCell.displayName = 'CreditCell';

/** Due Cell */
const DueCell = React.memo(({ rowData, columnData, active }: CellProps<any, { key: string }>) => {
  const value = columnData?.key ? getNestedValue(rowData, columnData.key) : 0;
  const numValue = Number(value) || 0;
  return (
    <span className="hulool-cell-content hulool-due" style={{ color: numValue > 0 ? '#dc2626' : '#000000', fontWeight: active ? 800 : 600 }}>
      {formatCurrency(numValue)}
    </span>
  );
});
DueCell.displayName = 'DueCell';

/** Date Cell */
const DateCell = React.memo(({ rowData, columnData, active }: CellProps<any, { key: string }>) => {
  const value = columnData?.key ? getNestedValue(rowData, columnData.key) : '';
  return (
    <span className="hulool-cell-content hulool-date" style={{ fontWeight: active ? 700 : 400 }}>
      {formatDate(value)}
    </span>
  );
});
DateCell.displayName = 'DateCell';

/** Phone Cell with WhatsApp */
const PhoneCell = React.memo(({ rowData, columnData, active }: CellProps<any, { key: string }>) => {
  const phone = columnData?.key ? getNestedValue(rowData, columnData.key) : '';
  
  const formatPhoneForWhatsApp = (phone: string) => {
    if (!phone) return '';
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('966')) return cleanPhone;
    if (cleanPhone.startsWith('0')) return `966${cleanPhone.substring(1)}`;
    return `966${cleanPhone}`;
  };

  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const whatsappPhone = formatPhoneForWhatsApp(phone);
    if (whatsappPhone) window.open(`https://wa.me/${whatsappPhone}`, '_blank');
  };

  if (!phone) return <span className="hulool-cell-content hulool-phone" style={{ fontWeight: active ? 700 : 400 }}>—</span>;

  return (
    <div className="hulool-cell-content hulool-phone-container" style={{ fontWeight: active ? 700 : 400 }}>
      <span className="hulool-phone-number">{phone}</span>
      <button onClick={handleWhatsAppClick} title="فتح واتساب" className="hulool-whatsapp-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
        </svg>
      </button>
    </div>
  );
});
PhoneCell.displayName = 'PhoneCell';

/** Badge Cell */
const BadgeCell = React.memo(({ rowData, columnData, active }: CellProps<any, { key: string; badgeColors?: Record<string, string>; formatter?: (val: any, row: any) => string }>) => {
  const value = columnData?.key ? getNestedValue(rowData, columnData.key) : '';
  const displayValue = columnData?.formatter ? columnData.formatter(value, rowData) : value;
  
  const defaultColors: Record<string, string> = {
    Government: '#3b82f6', RealEstate: '#22c55e', Accounting: '#eab308', Other: '#6b7280',
    New: '#eab308', Deferred: '#ef4444', Completed: '#22c55e', 'Pending Review': '#f97316', Cancelled: '#6b7280',
  };
  
  const bgColor = { ...defaultColors, ...columnData?.badgeColors }[value] || '#6b7280';
  
  return (
    <span className="hulool-cell-content hulool-badge" style={{ backgroundColor: bgColor, fontWeight: active ? 700 : 600 }}>
      {displayValue ?? value ?? '—'}
    </span>
  );
});
BadgeCell.displayName = 'BadgeCell';

// ================================
// ACTIVE CELL WRAPPER
// Wraps ANY component to auto-apply bold styling when active and truncate overflow text
// ================================

function withActiveWrapper<T>(Component: React.ComponentType<CellProps<T, any>>): React.ComponentType<CellProps<T, any>> {
  const WrappedComponent = React.memo((props: CellProps<T, any>) => {
    const { active } = props;
    return (
      <div 
        className={`hulool-active-wrapper hulool-cell-truncate ${active ? 'hulool-cell-active' : ''}`}
        style={{ 
          width: '100%', 
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
        }}
      >
        <Component {...props} />
      </div>
    );
  });
  WrappedComponent.displayName = `ActiveWrapper(${Component.displayName || 'Component'})`;
  return WrappedComponent;
}

// ================================
// CELL COMPONENT FACTORY
// ================================

function createCellComponent<T>(col: HuloolGridColumn<T>): React.ComponentType<CellProps<T, any>> {
  // For custom components, wrap with active wrapper to auto-apply bold
  if (col.component) {
    return withActiveWrapper(col.component);
  }
  
  // Built-in components already handle active prop internally
  switch (col.type) {
    case 'clientName': return ClientNameCell;
    case 'phone': return PhoneCell;
    case 'debit': return DebitCell;
    case 'credit': return CreditCell;
    case 'due': return DueCell;
    case 'currency': return CurrencyCell;
    case 'date': return DateCell;
    case 'badge': return BadgeCell;
    default: return TextCell;
  }
}

// ================================
// CUSTOM CONTEXT MENU - COPY ONLY
// ================================

interface ContextMenuComponentProps {
  clientX: number;
  clientY: number;
  items: ContextMenuItem[];
  close: () => void;
}

function CopyOnlyContextMenu({ clientX, clientY, items, close }: ContextMenuComponentProps): React.ReactElement | null {
  // Filter to only show COPY item
  const copyItem = items.find(item => item.type === 'COPY');
  
  if (!copyItem) {
    return null;
  }
  
  const handleCopy = () => {
    copyItem.action();
    close();
  };
  
  return (
    <div
      className="hulool-context-menu"
      style={{
        position: 'fixed',
        left: clientX,
        top: clientY,
        zIndex: 10000,
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        padding: '4px 0',
        minWidth: '120px',
        fontFamily: 'Cairo, sans-serif',
      }}
    >
      <button
        onClick={handleCopy}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: '100%',
          padding: '8px 16px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          fontSize: '14px',
          color: '#333',
          textAlign: 'right',
          direction: 'rtl',
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        نسخ
      </button>
    </div>
  );
}

// ================================
// MAIN COMPONENT
// ================================

function HuloolDataGrid<T extends Record<string, any>>({
  data,
  columns,
  isLoading = false,
  emptyMessage = 'لا توجد بيانات',
  height = 'auto',
  rowHeight = 44,
  typeField,
  typeColors = DEFAULT_TYPE_COLORS,
  showId = true,
  idField = 'id' as keyof T,
  className = '',
  stickyHeader = true,
  minHeight = 400,
}: HuloolGridProps<T>) {
  
  // Calculate actual height
  const calculatedHeight = useMemo(() => {
    if (height === 'auto' || height === 'fill') {
      const contentHeight = (data.length * rowHeight) + 48;
      return Math.max(contentHeight, minHeight);
    }
    return height;
  }, [height, data.length, rowHeight, minHeight]);
  
  // Filter hidden columns and add ID column if needed
  const processedColumns = useMemo(() => {
    let cols = columns.filter(c => !c.hidden);
    
    // Auto-add ID column if data has id and showId is true
    const hasId = data.length > 0 && data[0]?.[idField] !== undefined;
    if (showId && hasId && !cols.find(c => c.key === idField)) {
      cols = [
        { id: 'id', title: '#', type: 'text', key: idField as string, width: 60, grow: 0 },
        ...cols,
      ];
    }
    
    return cols;
  }, [columns, data, showId, idField]);
  
  // REVERSE columns for RTL - first column in definition = rightmost in display
  const reversedColumns = useMemo(() => {
    return [...processedColumns].reverse();
  }, [processedColumns]);
  
  // Convert to DSG columns with copyValue for Ctrl+C support
  const dsgColumns = useMemo(() => {
    return reversedColumns.map(col => {
      const CellComponent = createCellComponent(col);
      
      // Create copyValue function based on column type
      const getCopyValue = ({ rowData }: { rowData: T; rowIndex: number }): string | number | null => {
        const value = col.key ? getNestedValue(rowData, col.key as string) : null;
        
        if (value === null || value === undefined) return null;
        
        // Format based on column type
        switch (col.type) {
          case 'currency':
          case 'debit':
          case 'credit':
          case 'due':
            const numValue = Number(value) || 0;
            return numValue !== 0 ? formatCurrency(numValue) : '';
          case 'date':
            return formatDate(value);
          default:
            return String(value);
        }
      };
      
      return {
        id: col.id,
        title: col.title,
        component: CellComponent as any,
        columnData: {
          key: col.key,
          formatter: col.formatter,
          badgeColors: col.badgeColors,
          ...(col.columnData || {}),
        },
        // Use fixed width if specified, otherwise use minWidth of 100
        basis: col.width || 0,
        minWidth: col.width || 100,
        maxWidth: col.width || undefined,
        grow: col.grow ?? 1,
        shrink: 0,
        disabled: true,
        // Enable copy with Ctrl+C
        copyValue: getCopyValue,
      } as Column<T>;
    });
  }, [reversedColumns]);
  
  // Calculate row class for alternating colors
  const getRowClassName = useCallback(({ rowIndex, rowData }: { rowIndex: number; rowData: T }) => {
    if (!typeField) {
      return rowIndex % 2 === 0 ? 'hulool-row-even' : 'hulool-row-odd';
    }
    
    const currentType = rowData[typeField] as string;
    let sameTypeCount = 0;
    
    for (let i = rowIndex - 1; i >= 0; i--) {
      if (data[i]?.[typeField] === currentType) {
        sameTypeCount++;
      } else {
        break;
      }
    }
    
    const isAlternate = sameTypeCount % 2 === 1;
    const typeClass = `hulool-type-${currentType?.toLowerCase() || 'other'}`;
    const alternateClass = isAlternate ? 'hulool-type-alternate' : 'hulool-type-base';
    
    return `${typeClass} ${alternateClass}`;
  }, [typeField, data]);
  
  // Loading state
  if (isLoading) {
    return (
      <div className="hulool-grid-loading">
        <div className="hulool-spinner" />
        <span>جاري التحميل...</span>
      </div>
    );
  }
  
  // Empty state
  if (!data.length) {
    return <div className="hulool-grid-empty">{emptyMessage}</div>;
  }
  
  return (
    <div className={`hulool-data-grid ${className}`}>
      <DataSheetGrid<T>
        value={data}
        columns={dsgColumns}
        height={calculatedHeight}
        rowHeight={rowHeight}
        headerRowHeight={48}
        rowClassName={getRowClassName}
        lockRows
        disableExpandSelection
        gutterColumn={false}
        contextMenuComponent={CopyOnlyContextMenu}
      />
      
      <style>{`
        /* ================================
           HULOOL DATA GRID - BASE STYLES
           ================================ */
        
        .hulool-data-grid {
          font-family: 'Cairo', sans-serif;
          direction: rtl;
        }
        
        .hulool-grid-loading {
          padding: 48px;
          text-align: center;
          font-family: 'Cairo', sans-serif;
        }
        
        .hulool-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid var(--color-primary, #3b82f6);
          border-top-color: transparent;
          border-radius: 50%;
          animation: hulool-spin 1s linear infinite;
          margin: 0 auto 16px;
        }
        
        @keyframes hulool-spin {
          to { transform: rotate(360deg); }
        }
        
        .hulool-grid-empty {
          padding: 48px;
          text-align: center;
          font-family: 'Cairo', sans-serif;
          color: #666;
        }
        
        /* ================================
           DSG CONTAINER OVERRIDES
           ================================ */
        
        .hulool-data-grid .dsg-container {
          --dsg-border-color: rgba(0, 0, 0, 0.08);
          --dsg-selection-border-color: var(--color-primary, #3b82f6);
          --dsg-selection-background-color: rgba(59, 130, 246, 0.1);
          direction: ltr; /* Keep LTR internally, we handle RTL via column reversal */
        }
        
        /* ================================
           HEADER STYLES
           ================================ */
        
        .hulool-data-grid .dsg-header-row {
          background-color: var(--color-primary, #3b82f6) !important;
          position: ${stickyHeader ? 'sticky' : 'relative'};
          top: 0;
          z-index: 10;
        }
        
        .hulool-data-grid .dsg-header-row .dsg-cell {
          color: #ffffff !important;
          font-weight: 700 !important;
          font-family: 'Cairo', sans-serif !important;
          justify-content: center;
          text-align: center;
          border-left: 1px solid rgba(255, 255, 255, 0.2);
          border-right: none;
          white-space: nowrap;
          direction: rtl;
        }
        
        /* ================================
           CELL STYLES
           ================================ */
        
        .hulool-data-grid .dsg-cell {
          font-family: 'Cairo', sans-serif !important;
          color: #000000;
          border-left: 1px solid rgba(0, 0, 0, 0.05);
          border-right: none;
          padding: 0 12px;
          direction: rtl;
          white-space: nowrap;
        }
        
        /* ================================
           ACTIVE CELL OUTLINE
           ================================ */
        
        .hulool-data-grid .dsg-active-cell {
          box-shadow: inset 0 0 0 2px var(--color-primary, #3b82f6) !important;
        }
        
        /* ================================
           ACTIVE CELL BOLD - AUTO-APPLIES TO ANY CONTENT
           ================================ */
        
        .hulool-cell-active,
        .hulool-cell-active * {
          font-weight: 700 !important;
        }
        
        .hulool-cell-active a,
        .hulool-cell-active span,
        .hulool-cell-active div {
          font-weight: 700 !important;
        }
        
        /* ================================
           TEXT TRUNCATION - Auto ellipsis for overflow
           ================================ */
        
        .hulool-cell-truncate {
          overflow: hidden;
        }
        
        .hulool-cell-truncate > *,
        .hulool-cell-truncate span,
        .hulool-cell-truncate div,
        .hulool-cell-truncate a {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 100%;
        }
        
        /* ================================
           CELL CONTENT TYPES
           ================================ */
        
        .hulool-cell-content {
          display: flex;
          align-items: center;
          height: 100%;
          width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        /* Text cells - right aligned for RTL */
        .hulool-text,
        .hulool-client-name {
          justify-content: flex-start;
          text-align: right;
        }
        
        /* Currency cells - centered */
        .hulool-currency,
        .hulool-debit,
        .hulool-credit,
        .hulool-due,
        .hulool-date {
          justify-content: center;
          text-align: center;
          font-variant-numeric: tabular-nums;
        }
        
        .hulool-debit { color: #000000; }
        .hulool-credit { color: #16a34a; }
        
        /* Badge */
        .hulool-badge {
          padding: 4px 12px;
          border-radius: 9999px;
          font-size: 0.875rem;
          color: #ffffff;
          justify-content: center;
        }
        
        /* Phone cell */
        .hulool-phone-container {
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: center;
        }
        
        .hulool-whatsapp-btn {
          padding: 4px;
          border-radius: 4px;
          border: none;
          background: transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: auto !important;
        }
        
        .hulool-whatsapp-btn:hover {
          background-color: #dcfce7;
        }
        
        /* ================================
           ROW COLORS - SIMPLE ALTERNATING
           ================================ */
        
        .hulool-data-grid .dsg-row.hulool-row-even .dsg-cell {
          background-color: ${DEFAULT_ALTERNATE_COLORS.even};
        }
        
        .hulool-data-grid .dsg-row.hulool-row-odd .dsg-cell {
          background-color: ${DEFAULT_ALTERNATE_COLORS.odd};
        }
        
        /* ================================
           ROW COLORS - TYPE-BASED
           ================================ */
        
        .hulool-data-grid .dsg-row.hulool-type-government.hulool-type-base .dsg-cell {
          background-color: ${typeColors.Government?.base || DEFAULT_TYPE_COLORS.Government.base};
        }
        .hulool-data-grid .dsg-row.hulool-type-government.hulool-type-alternate .dsg-cell {
          background-color: ${typeColors.Government?.alternate || DEFAULT_TYPE_COLORS.Government.alternate};
        }
        
        .hulool-data-grid .dsg-row.hulool-type-realestate.hulool-type-base .dsg-cell {
          background-color: ${typeColors.RealEstate?.base || DEFAULT_TYPE_COLORS.RealEstate.base};
        }
        .hulool-data-grid .dsg-row.hulool-type-realestate.hulool-type-alternate .dsg-cell {
          background-color: ${typeColors.RealEstate?.alternate || DEFAULT_TYPE_COLORS.RealEstate.alternate};
        }
        
        .hulool-data-grid .dsg-row.hulool-type-accounting.hulool-type-base .dsg-cell {
          background-color: ${typeColors.Accounting?.base || DEFAULT_TYPE_COLORS.Accounting.base};
        }
        .hulool-data-grid .dsg-row.hulool-type-accounting.hulool-type-alternate .dsg-cell {
          background-color: ${typeColors.Accounting?.alternate || DEFAULT_TYPE_COLORS.Accounting.alternate};
        }
        
        .hulool-data-grid .dsg-row.hulool-type-other.hulool-type-base .dsg-cell {
          background-color: ${typeColors.Other?.base || DEFAULT_TYPE_COLORS.Other.base};
        }
        .hulool-data-grid .dsg-row.hulool-type-other.hulool-type-alternate .dsg-cell {
          background-color: ${typeColors.Other?.alternate || DEFAULT_TYPE_COLORS.Other.alternate};
        }
        
        /* ================================
           HOVER & INTERACTIONS
           ================================ */
        
        .hulool-data-grid .dsg-row:hover .dsg-cell {
          filter: brightness(0.97);
        }
        
        /* Enable pointer events for buttons in cells */
        .hulool-data-grid .dsg-cell button {
          pointer-events: auto !important;
          cursor: pointer;
        }
        
        .hulool-data-grid .dsg-cell button:disabled {
          cursor: not-allowed;
        }
        
        .hulool-data-grid .dsg-cell > div {
          pointer-events: auto;
        }
        
        /* Action bar special handling */
        .grid-action-bar {
          pointer-events: auto !important;
        }
        
        .grid-action-bar button {
          pointer-events: auto !important;
        }
        
        /* Remove edit cursor since read-only */
        .hulool-data-grid .dsg-cell input {
          cursor: default !important;
          pointer-events: none;
        }
        
        .hulool-data-grid .dsg-input {
          background: transparent !important;
          border: none !important;
          outline: none !important;
        }
      `}</style>
    </div>
  );
}

export default HuloolDataGrid;
export { TextCell, ClientNameCell, PhoneCell, DebitCell, CreditCell, DueCell, DateCell, BadgeCell, CurrencyCell };

