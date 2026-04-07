/**
 * EmployeeClientsStatementsTable - Rewritten with HuloolDataGrid
 * 
 * Displays employee's client receivables with payments and allocations
 * Using HuloolDataGrid for consistent RTL-friendly display
 */

import React, { useMemo } from 'react';
import type { CreditAllocation } from '@/api/types';
import type { EmployeeReceivableDashboardItem } from '@/features/employees/api/employeeFinancialQueries';
import { FileText, Edit3, Trash2, MessageSquare } from 'lucide-react';
import { formatDate } from '@/shared/utils/dateUtils';
import { useModalStore } from '@/shared/stores/modalStore';
import { sendPaymentReminder } from '@/shared/utils/whatsappUtils';
import HuloolDataGrid from '@/shared/grid/HuloolDataGrid';
import type { HuloolGridColumn } from '@/shared/grid/HuloolDataGrid';
import type { CellProps } from 'react-datasheet-grid';

interface EmployeeClientsStatementsTableProps {
    receivables: EmployeeReceivableDashboardItem[];
    isLoading: boolean;
    filter?: 'all' | 'unpaid' | 'paid';
    hideAmounts?: boolean;
}

// ================================
// HELPER FUNCTIONS
// ================================

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'SAR', minimumFractionDigits: 2
}).format(amount);

const getTypeColor = (type: string): { bgVar: string; textVar: string; label: string } => {
    const types: Record<string, { bgVar: string; textVar: string; label: string }> = {
        'Accounting': { bgVar: 'var(--token-status-warning-bg)', textVar: 'var(--token-status-warning-text)', label: 'محاسبة' },
        'RealEstate': { bgVar: 'var(--token-status-success-bg)', textVar: 'var(--token-status-success-text)', label: 'عقاري' },
        'Government': { bgVar: 'var(--token-status-info-bg)', textVar: 'var(--token-status-info-text)', label: 'حكومي' },
        'Other': { bgVar: 'var(--token-status-neutral-bg)', textVar: 'var(--token-status-neutral-text)', label: 'أخرى' }
    };
    return types[type] || types.Other;
};

// ================================
// CUSTOM CELL COMPONENTS
// ================================

// Client Name and Phone Cell
const ClientNameCell = React.memo(({ rowData }: CellProps<EmployeeReceivableDashboardItem>) => {
  return (
    <div>
      <div style={{ fontWeight: 600, color: 'var(--token-text-primary)' }}>
        {rowData.client_name}
      </div>
      <div style={{ fontSize: '0.875rem', color: '#666666' }}>
        {rowData.client_phone}
      </div>
    </div>
  );
});
ClientNameCell.displayName = 'ClientNameCell';

// Description Cell
const DescriptionCell = React.memo(({ rowData }: CellProps<EmployeeReceivableDashboardItem>) => {
  return (
    <div>
      <div style={{ fontWeight: 500, color: 'var(--token-text-primary)' }}>
        {rowData.description || rowData.task_name || '—'}
      </div>
      {rowData.task_name && (
        <div style={{ fontSize: '0.875rem', color: '#666666' }}>
          مهمة: {rowData.task_name}
        </div>
      )}
    </div>
  );
});
DescriptionCell.displayName = 'DescriptionCell';

// Debit (Amount) Cell
const DebitCell = React.memo(({ rowData, columnData }: CellProps<EmployeeReceivableDashboardItem, { hideAmounts: boolean }>) => {
  return (
    <div style={{ textAlign: 'center', fontWeight: 600, color: 'var(--token-text-primary)' }}>
      {columnData?.hideAmounts ? '***' : formatCurrency(Number(rowData.amount))}
    </div>
  );
});
DebitCell.displayName = 'DebitCell';

// Credit (Paid + Allocated) Cell
const CreditCell = React.memo(({ rowData, columnData }: CellProps<EmployeeReceivableDashboardItem, { hideAmounts: boolean }>) => {
  const paid = rowData.total_paid + rowData.total_allocated;
  return (
    <div style={{ textAlign: 'center', fontWeight: 600, color: 'var(--token-text-success)' }}>
      {columnData?.hideAmounts ? '***' : formatCurrency(paid)}
    </div>
  );
});
CreditCell.displayName = 'CreditCell';

// Due Amount Cell
const DueCell = React.memo(({ rowData, columnData }: CellProps<EmployeeReceivableDashboardItem, { hideAmounts: boolean }>) => {
  const color = rowData.remaining_amount > 0 ? 'var(--token-text-danger)' : 'var(--token-text-success)';
  return (
    <div style={{ textAlign: 'center', fontWeight: 700, color }}>
      {columnData?.hideAmounts ? '***' : formatCurrency(rowData.remaining_amount)}
    </div>
  );
});
DueCell.displayName = 'DueCell';

// Due Date Cell
const DateCell = React.memo(({ rowData }: CellProps<EmployeeReceivableDashboardItem>) => {
  return (
    <div style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--token-text-primary)' }}>
      {formatDate(rowData.due_date)}
    </div>
  );
});
DateCell.displayName = 'DateCell';

// Type Badge Cell
const TypeBadgeCell = React.memo(({ rowData }: CellProps<EmployeeReceivableDashboardItem>) => {
  const typeColor = getTypeColor(rowData.type);
  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <span style={{
        backgroundColor: typeColor.bgVar,
        color: typeColor.textVar,
        padding: '4px 10px',
        borderRadius: '9999px',
        fontSize: '0.875rem',
        fontWeight: 600,
      }}>
        {typeColor.label}
      </span>
    </div>
  );
});
TypeBadgeCell.displayName = 'TypeBadgeCell';

// Actions Cell
interface ActionsColumnData {
  openModal: (modal: string, data: any) => void;
  handleWhatsAppReminder: (phone: string, name: string, amount: number) => void;
}

const ActionsCell = React.memo(({ rowData, columnData }: CellProps<EmployeeReceivableDashboardItem, ActionsColumnData>) => {
  const { openModal, handleWhatsAppReminder } = columnData || {};

  if (!columnData) return null;

  const isManualReceivable = !rowData.task_id;
  const isPaid = rowData.remaining_amount <= 0 && Number(rowData.amount) > 0;
  const isUnpaid = rowData.remaining_amount > 0;

  const buildReceivableObject = () => ({
    id: rowData.receivables_details?.[0]?.id || rowData.id,
    client_id: Number(rowData.client_id),
    task_id: rowData.task_id ? Number(rowData.task_id) : null,
    reference_receivable_id: null,
    prepaid_receivable_id: null,
    created_by: Number(rowData.client_id),
    type: rowData.type,
    description: rowData.description,
    amount: Number(rowData.amount),
    original_amount: null,
    amount_details: [],
    adjustment_reason: null,
    notes: rowData.notes || '',
    due_date: rowData.due_date,
    created_at: rowData.created_at,
    updated_at: rowData.updated_at,
    client_name: rowData.client_name,
    client_phone: rowData.client_phone,
    task_name: rowData.task_name,
    task_type: rowData.task_type,
    total_paid: rowData.total_paid,
    remaining_amount: rowData.remaining_amount,
    payments: rowData.payments || [],
    allocations: [] as CreditAllocation[],
    client: {
      id: Number(rowData.client_id),
      name: rowData.client_name,
      phone: rowData.client_phone
    }
  });

  return (
    <div 
      style={{ 
        display: 'flex', 
        gap: '4px',
        justifyContent: 'flex-start', 
        alignItems: 'center', 
        height: '100%',
        pointerEvents: 'auto',
        flexWrap: 'wrap',
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {isManualReceivable && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              openModal?.('editReceivable', { receivable: buildReceivableObject() });
            }}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              padding: '4px 8px',
              backgroundColor: 'var(--token-status-info-bg)',
              color: 'var(--token-status-info-text)',
              border: '1px solid var(--token-status-info-border)',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.75rem',
              pointerEvents: 'auto',
            }}
            title="تعديل"
          >
            <Edit3 size={12} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              openModal?.('deleteReceivable', { receivable: buildReceivableObject() });
            }}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              padding: '4px 8px',
              backgroundColor: 'var(--token-status-danger-bg)',
              color: 'var(--token-status-danger-text)',
              border: '1px solid var(--token-status-danger-border)',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.75rem',
              pointerEvents: 'auto',
            }}
            title="حذف"
          >
            <Trash2 size={12} />
          </button>
        </>
      )}

      {isUnpaid && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            handleWhatsAppReminder?.(rowData.client_phone, rowData.client_name, rowData.remaining_amount);
          }}
          onMouseDown={(e) => e.stopPropagation()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              padding: '4px 8px',
              backgroundColor: '#25D366',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.75rem',
              pointerEvents: 'auto',
            }}
            title="تذكير واتساب" /* WhatsApp brand color — deliberate exception */
        >
          <MessageSquare size={12} /> تذكير
        </button>
      )}

      {isPaid && (
        <span style={{
          padding: '4px 8px',
          backgroundColor: 'var(--token-status-success-bg)',
          color: 'var(--token-status-success-text)',
          border: '1px solid var(--token-status-success-border)',
          borderRadius: '4px',
          fontSize: '0.75rem',
          fontWeight: 600,
        }}>
          مسدد
        </span>
      )}
    </div>
  );
});
ActionsCell.displayName = 'ActionsCell';

// ================================
// MAIN COMPONENT
// ================================

const EmployeeClientsStatementsTable: React.FC<EmployeeClientsStatementsTableProps> = ({
    receivables,
    isLoading,
    filter = 'all',
    hideAmounts = false,
}) => {
    const openModal = useModalStore(state => state.openModal);

    // Filter items based on the filter prop
    const filteredItems = useMemo(() => {
      return receivables.filter(item => {
          switch (filter) {
              case 'unpaid':
                  return item.remaining_amount > 0;
              case 'paid':
                  return item.remaining_amount <= 0 && Number(item.amount) > 0;
              default:
                  return true; // 'all'
          }
      });
    }, [receivables, filter]);

    // Sort by date DESCENDING for newest-first display
    const sortedItems = useMemo(() => {
      return [...filteredItems].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }, [filteredItems]);

    // Calculate totals
    const totals = useMemo(() => {
      const totalDebit = filteredItems.reduce((sum, item) => sum + Number(item.amount), 0);
      const totalCredit = filteredItems.reduce((sum, item) => sum + item.total_paid + item.total_allocated, 0);
      const totalDue = filteredItems.reduce((sum, item) => sum + item.remaining_amount, 0);
      return { totalDebit, totalCredit, totalDue };
    }, [filteredItems]);

    const handleWhatsAppReminder = (phone: string, name: string, amount: number) => {
      const formattedAmount = formatCurrency(amount);
      sendPaymentReminder(phone, name, formattedAmount);
    };

    // Define columns
    const columns = useMemo((): HuloolGridColumn<EmployeeReceivableDashboardItem>[] => [
      {
        id: 'client',
        key: 'client_name',
        title: 'العميل',
        type: 'custom',
        component: ClientNameCell,
        grow: 1,
      },
      {
        id: 'description',
        key: 'description',
        title: 'الوصف',
        type: 'custom',
        component: DescriptionCell,
        grow: 2,
      },
      {
        id: 'debit',
        key: 'amount',
        title: 'المدين',
        type: 'custom',
        component: DebitCell,
        columnData: { hideAmounts },
        grow: 1,
      },
      {
        id: 'credit',
        key: 'total_paid',
        title: 'الدائن',
        type: 'custom',
        component: CreditCell,
        columnData: { hideAmounts },
        grow: 1,
      },
      {
        id: 'due',
        key: 'remaining_amount',
        title: 'المستحق',
        type: 'custom',
        component: DueCell,
        columnData: { hideAmounts },
        grow: 1,
      },
      {
        id: 'dueDate',
        key: 'due_date',
        title: 'تاريخ الاستحقاق',
        type: 'custom',
        component: DateCell,
        grow: 1,
      },
      {
        id: 'type',
        key: 'type',
        title: 'النوع',
        type: 'custom',
        component: TypeBadgeCell,
        grow: 1,
      },
      {
        id: 'actions',
        key: 'id',
        title: 'الإجراءات',
        type: 'custom',
        component: ActionsCell as React.ComponentType<CellProps<EmployeeReceivableDashboardItem>>,
        columnData: { openModal, handleWhatsAppReminder },
        width: 160,
        grow: 0,
      },
    ], [hideAmounts, openModal]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center p-5">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    if (!receivables.length) {
        return (
            <div className="text-center p-5 text-text-primary">
                <FileText size={48} className="mb-3 text-text-secondary" />
                <p className="mb-0">لا توجد مستحقات</p>
            </div>
        );
    }

    return (
        <div className="employee-receivables-table-wrapper">
            {/* Transactions Grid */}
            <HuloolDataGrid
                data={sortedItems}
                columns={columns}
                isLoading={isLoading}
                emptyMessage="لا توجد مستحقات"
                showId={false}
            />

            {/* Summary Totals Row */}
            <div className="rounded-lg border border-border bg-card shadow-sm mt-2">
                <div className="p-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-center">
                        <div className="flex justify-between items-center p-2 bg-background rounded">
                            <span className="text-text-secondary text-sm">إجمالي المدين:</span>
                            <span className="font-bold text-status-danger-text">
                                {hideAmounts ? '***' : formatCurrency(totals.totalDebit)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-background rounded">
                            <span className="text-text-secondary text-sm">إجمالي الدائن:</span>
                            <span className="font-bold text-status-success-text">
                                {hideAmounts ? '***' : formatCurrency(totals.totalCredit)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-primary text-white rounded">
                            <span className="text-sm">إجمالي المستحق:</span>
                            <span className="font-bold">
                                {hideAmounts ? '***' : formatCurrency(totals.totalDue)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployeeClientsStatementsTable;
