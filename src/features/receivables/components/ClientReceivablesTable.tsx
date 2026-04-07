/**
 * ClientReceivablesTable - Excel-like grid for displaying client receivables/statement
 * 
 * Uses HuloolDataGrid for consistent styling with:
 * - Debit (black), Credit (green), Due (red) coloring
 * - Type-based row coloring
 * - Uneditable cells
 * - Arabic Cairo font
 * - Expandable payment details
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Receivable, Payment, StatementItem, Client, CreditAllocation } from '@/api/types';
import Button from '@/shared/ui/primitives/Button';
import { ChevronRight, ChevronDown, FileText, CreditCard, Edit3, Trash2 } from 'lucide-react';
import { formatDate } from '@/shared/utils/dateUtils';
import { formatCurrency } from '@/shared/utils/formatUtils';
import { useModalStore } from '@/shared/stores/modalStore';
import HuloolDataGrid from '@/shared/grid/HuloolDataGrid';
import type { HuloolGridColumn } from '@/shared/grid/HuloolDataGrid';
import type { CellProps } from 'react-datasheet-grid';

const neutralActionButtonClass = 'inline-flex items-center justify-center rounded p-1.5 text-text-secondary hover:text-text-primary cursor-pointer transition-colors duration-150';
const destructiveActionButtonClass = 'inline-flex items-center justify-center rounded p-1.5 text-text-secondary hover:text-text-danger cursor-pointer transition-colors duration-150';

interface ClientReceivablesTableProps {
  receivables: StatementItem[];
  isLoading: boolean;
  client: Client;
  filter?: 'all' | 'unpaid' | 'paid';
  hideAmounts?: boolean;
}

// ================================
// HELPER FUNCTIONS
// ================================
const getTypeBadgeStyle = (type: string) => {
  const styles: Record<string, { bg: string; color: string }> = {
    Accounting: {
      bg: 'var(--token-status-warning-bg)',
      color: 'var(--token-status-warning-text)',
    },
    RealEstate: {
      bg: 'var(--token-status-success-bg)',
      color: 'var(--token-status-success-text)',
    },
    Government: {
      bg: 'var(--token-status-info-bg)',
      color: 'var(--token-status-info-text)',
    },
    Other: {
      bg: 'var(--token-status-neutral-bg)',
      color: 'var(--token-status-neutral-text)',
    },
  };

  return styles[type] || styles.Other;
};

// ================================
// CUSTOM CELL COMPONENTS
// ================================

const ExpandCell = React.memo(({ rowData, columnData }: CellProps<StatementItem, { expandedRows: Set<string>; toggleRow: (id: string) => void }>) => {
  const { expandedRows, toggleRow } = columnData || {};
  const hasDetails = Boolean(
    (rowData.details?.payments?.length ?? 0) > 0 ||
    (rowData.details?.allocations?.length ?? 0) > 0
  );

  if (!hasDetails) return null;

  const isExpanded = expandedRows?.has(rowData.id);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        toggleRow?.(rowData.id);
      }}
      className={neutralActionButtonClass}
      title={isExpanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
    >
      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
    </button>
  );
});
ExpandCell.displayName = 'ExpandCell';

const DescriptionCell = React.memo(({ rowData, active }: CellProps<StatementItem>) => {
  return (
    <span className="hulool-cell-content hulool-text" style={{ fontWeight: active ? 700 : 500, color: 'var(--token-text-primary)' }}>
      {rowData.description}
    </span>
  );
});
DescriptionCell.displayName = 'DescriptionCell';

const DebitCell = React.memo(({ rowData, columnData, active }: CellProps<StatementItem, { hideAmounts?: boolean }>) => {
  const amount = Number(rowData.debit) || 0;

  return (
    <span className="hulool-cell-content" style={{ justifyContent: 'center', fontWeight: active ? 700 : 500, color: 'var(--token-text-primary)' }}>
      {columnData?.hideAmounts ? '***' : (amount > 0 ? formatCurrency(amount) : '—')}
    </span>
  );
});
DebitCell.displayName = 'DebitCell';

const CreditCell = React.memo(({ rowData, columnData, active }: CellProps<StatementItem, { hideAmounts?: boolean }>) => {
  const amount = Number(rowData.credit) || 0;

  return (
    <span className="hulool-cell-content" style={{ justifyContent: 'center', fontWeight: active ? 700 : 500, color: 'var(--token-text-primary)' }}>
      {columnData?.hideAmounts ? '***' : (amount > 0 ? formatCurrency(amount) : '—')}
    </span>
  );
});
CreditCell.displayName = 'CreditCell';

const BalanceCell = React.memo(({ rowData, columnData, active }: CellProps<StatementItem, { hideAmounts?: boolean }>) => {
  const balance = Number(rowData.balance) || 0;

  return (
    <span className="hulool-cell-content" style={{ justifyContent: 'center', fontWeight: active ? 800 : 700, color: balance < 0 ? 'var(--token-text-danger)' : 'var(--token-text-primary)' }}>
      {columnData?.hideAmounts ? '***' : formatCurrency(balance)}
    </span>
  );
});
BalanceCell.displayName = 'BalanceCell';

const DateCell = React.memo(({ rowData, active }: CellProps<StatementItem>) => {
  return (
    <span className="hulool-cell-content" style={{ justifyContent: 'center', fontSize: '0.875rem', color: 'var(--token-text-primary)', fontWeight: active ? 700 : 400 }}>
      {formatDate(rowData.date)}
    </span>
  );
});
DateCell.displayName = 'DateCell';

// Type Badge Cell
const TypeBadgeCell = React.memo(({ rowData }: CellProps<StatementItem>) => {
  const style = getTypeBadgeStyle(rowData.type);
  const typeLabels: Record<string, string> = {
    'Accounting': 'محاسبة',
    'RealEstate': 'عقارات',
    'Government': 'حكومية',
    'Other': 'أخرى',
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <span style={{
        backgroundColor: style.bg,
        color: style.color,
        padding: '4px 10px',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}>
        {typeLabels[rowData.type] || typeLabels.Other}
      </span>
    </div>
  );
});
TypeBadgeCell.displayName = 'TypeBadgeCell';

// Actions Cell
interface ActionsCellData {
  client: Client;
  openModal: (modal: string, data: any) => void;
}

const ActionsCell = React.memo(({ rowData, columnData }: CellProps<StatementItem, ActionsCellData>) => {
  const { client, openModal } = columnData || {};
  const item = rowData;

  if (!client || !openModal) return null;

  const canEdit = item.details?.receivables &&
    item.details.receivables.length > 0 &&
    !item.details.receivables[0].task_id;

  const canPay = (item.remaining_amount ?? 0) > 0;
  const isPaid = (item.remaining_amount ?? 0) <= 0 && item.debit > 0;

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.details?.receivables?.length) return;

    const receivable = item.details.receivables.find(r => r.id === item.receivable_id) || {
      id: item.details.receivables[0].id,
      client_id: Number(client.id),
      task_id: item.task_id ? Number(item.task_id) : null,
      type: String(item.type) as any,
      description: item.description,
      amount: Number(item.debit || item.balance + item.credit),
      due_date: item.date,
      notes: '',
      created_at: item.date,
      updated_at: item.date,
      paid_amount: Number(item.credit) || 0,
      remaining_amount: Number(item.balance) || 0,
      status: (item.balance <= 0) ? 'paid' : ((item.credit > 0) ? 'partially_paid' : 'pending'),
      client_name: client.name,
      client_phone: client.phone
    };

    openModal('invoiceEdit', { invoice: receivable as any });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.details?.receivables?.length) return;

    const receivable = item.details.receivables.find(r => r.id === item.receivable_id) || {
      id: item.details.receivables[0].id,
      client_id: Number(client.id),
      task_id: item.task_id ? Number(item.task_id) : null,
      type: String(item.type) as any,
      description: item.description,
      amount: Number(item.debit || item.balance + item.credit),
      due_date: item.date,
      notes: '',
      created_at: item.date,
      updated_at: item.date
    };
    openModal('deleteReceivable', { receivable });
  };

  const handlePayment = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.details?.receivables?.length) return;

    const receivableId = item.details.receivables[0]?.id === item.details.receivables[0]?.prepaid_receivable_id
      ? item.details.receivables[1]?.id
      : item.details.receivables[0]?.id;

    if (!receivableId) return;

    const pseudoReceivable: Receivable = {
      id: receivableId,
      client_id: Number(client.id),
      task_id: item.task_id ? Number(item.task_id) : null,
      reference_receivable_id: null,
      prepaid_receivable_id: item.details.receivables[0]?.prepaid_receivable_id,
      created_by: Number(client.id),
      type: String(item.type) as any,
      description: item.description,
      amount: Number(item.debit || item.balance + item.credit),
      original_amount: null,
      amount_details: [],
      adjustment_reason: null,
      notes: null,
      due_date: item.date,
      created_at: item.date,
      updated_at: item.date,
      client_name: client.name,
      client_phone: client.phone,
      task_name: item.description,
      task_type: String(item.type),
      total_paid: Number(item.credit),
      remaining_amount: Number(item.remaining_amount ?? (item.debit - item.credit)),
      payments: item.details?.payments || [],
      allocations: [] as CreditAllocation[],
      client: {
        id: Number(client.id),
        name: client.name,
        phone: client.phone
      }
    };

    openModal('recordPayment', {
      invoiceId: pseudoReceivable.id,
      amountDue: pseudoReceivable.remaining_amount,
      clientId: pseudoReceivable.client_id,
      clientName: pseudoReceivable.client_name
    });
  };

  return (
    <div className="hulool-cell-actions" style={{ display: 'flex', flexDirection: 'row', gap: '4px', justifyContent: 'flex-start', alignItems: 'center', flexWrap: 'nowrap' }}>
      {canEdit && (
        <>
          <button
            type="button"
            onClick={handleEdit}
            className={neutralActionButtonClass}
            title="تعديل"
          >
            <Edit3 size={12} />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className={destructiveActionButtonClass}
            title="حذف"
          >
            <Trash2 size={12} />
          </button>
        </>
      )}

      {canPay && (
        <button
          type="button"
          onClick={handlePayment}
          className="inline-flex items-center gap-1 rounded px-3 py-1.5 text-text-secondary hover:text-text-primary cursor-pointer transition-colors duration-150 whitespace-nowrap"
          title="سداد"
        >
          <CreditCard size={14} />
          سداد
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

const ClientReceivablesTable: React.FC<ClientReceivablesTableProps> = ({
  receivables: statementItems,
  isLoading,
  client,
  filter = 'all',
  hideAmounts = false,
}) => {
  const { t } = useTranslation();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const openModal = useModalStore(state => state.openModal);

  const toggleRow = (itemId: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (expandedRows.has(itemId)) {
      newExpandedRows.delete(itemId);
    } else {
      newExpandedRows.add(itemId);
    }
    setExpandedRows(newExpandedRows);
  };

  // Filter and sort items
  const processedItems = useMemo(() => {
    let filtered = statementItems.filter(item => {
      switch (filter) {
        case 'unpaid':
          return (item.remaining_amount ?? 0) > 0;
        case 'paid':
          return (item.remaining_amount ?? 0) <= 0 && item.debit > 0;
        default:
          return true;
      }
    });

    // Sort by date ascending for running balance calculation
    const sorted = [...filtered].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    const withBalance = sorted.map(item => {
      runningBalance += item.debit - item.credit;
      return { ...item, running_balance: runningBalance };
    }).reverse();

    return withBalance;
  }, [statementItems, filter]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalCredit = processedItems.reduce((sum, item) => sum + item.credit, 0);
    const totalDebit = processedItems.reduce((sum, item) => sum + item.debit, 0);
    const totalNet = processedItems.reduce((sum, item) => sum + item.balance, 0);
    return { totalDebit, totalCredit, totalNet };
  }, [processedItems]);

  // Define columns - order is right-to-left for RTL
  const columns = useMemo((): HuloolGridColumn<StatementItem>[] => [
    {
      id: 'expand',
      key: 'id',
      title: '',
      type: 'custom',
      component: ExpandCell,
      width: 40,
      grow: 0,
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
      key: 'debit',
      title: 'المدين',
      type: 'custom',
      component: DebitCell,
      grow: 1,
    },
    {
      id: 'credit',
      key: 'credit',
      title: 'الدائن',
      type: 'custom',
      component: CreditCell,
      grow: 1,
    },
    {
      id: 'balance',
      key: 'balance',
      title: 'المستحق',
      type: 'custom',
      component: BalanceCell,
      grow: 1,
    },
    {
      id: 'date',
      key: 'date',
      title: 'تاريخ الحركة',
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
      component: ActionsCell as React.ComponentType<CellProps<StatementItem>>,
      width: 160,
      grow: 0,
    },
  ], []);

  // Add columnData
  const columnsWithData = useMemo(() => {
    return columns.map(col => {
      if (col.id === 'expand') {
        return { ...col, columnData: { expandedRows, toggleRow } };
      }
      if (col.id === 'debit' || col.id === 'credit' || col.id === 'balance') {
        return { ...col, columnData: { hideAmounts } };
      }
      if (col.id === 'actions') {
        return { ...col, columnData: { client, openModal } };
      }
      return col;
    });
  }, [columns, expandedRows, hideAmounts, client, openModal]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!processedItems.length) {
    return (
      <div className="text-center p-12 text-text-primary">
        <FileText size={48} className="mb-3 opacity-50 mx-auto" />
        <p className="mb-0">{t('receivables.noReceivables')}</p>
      </div>
    );
  }

  return (
    <div className="client-receivables-wrapper">
      <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
        <HuloolDataGrid
          data={processedItems}
          columns={columnsWithData as HuloolGridColumn<StatementItem>[]}
          isLoading={false}
          typeField="type"
          showId={false}
          height="auto"
          minHeight={300}
        />
      </div>

      {/* Summary Totals */}
      <div className="rounded-lg border border-border bg-card shadow-sm mt-2">
        <div className="p-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-center">
            <div className="flex justify-between items-center p-2 bg-bg-surface-muted rounded">
              <span className="text-text-secondary text-sm">إجمالي المدين:</span>
              <span className="font-bold text-text-primary">{formatCurrency(totals.totalDebit)}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-bg-surface-muted rounded">
              <span className="text-text-secondary text-sm">إجمالي الدائن:</span>
              <span className="font-bold text-text-primary">{formatCurrency(totals.totalCredit)}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-bg-surface-muted rounded">
              <span className="text-sm">الرصيد النهائي:</span>
              <span className={`font-bold ${totals.totalNet < 0 ? 'text-status-danger-text' : 'text-text-primary'}`}>{formatCurrency(totals.totalNet)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Payment Details - Rendered separately */}
      {Array.from(expandedRows).map(itemId => {
        const item = processedItems.find(i => i.id === itemId);
        if (!item || (!item.details?.payments?.length && !item.details?.allocations?.length)) return null;

        return (
          <div key={`details-${itemId}`} className="bg-bg-surface-muted p-4 mt-1 rounded-lg border border-border">
            {item.details.payments && item.details.payments.length > 0 && (
              <div className="mb-3">
                <div className="text-sm text-text-secondary mb-2 font-medium">
                  💳 تفاصيل المدفوعات ({item.details.payments.length}):
                </div>
                <div className="rounded-lg border border-border bg-card overflow-hidden">
                  <div className="grid grid-cols-4 gap-2 p-2 bg-bg-surface-muted font-bold text-text-primary text-center text-sm">
                    <div>المبلغ</div>
                    <div>التاريخ</div>
                    <div>طريقة الدفع</div>
                    <div>الإجراءات</div>
                  </div>
                  <div className="divide-y divide-border">
                    {item.details.payments.map((p: Payment) => {
                      let methodName = 'غير محدد';
                      if (p.payment_method) {
                        if (typeof p.payment_method === 'object') {
                          methodName = p.payment_method.name_ar || p.payment_method.name_en || 'غير محدد';
                        } else if (typeof p.payment_method === 'string') {
                          methodName = p.payment_method;
                        }
                      }
                      return (
                        <div key={p.id} className="grid grid-cols-4 gap-2 p-2 text-center items-center">
                          <div className="text-text-primary font-bold">{formatCurrency(p.amount)}</div>
                          <div className="text-text-primary">{formatDate(p.paid_at)}</div>
                          <div className="text-text-primary font-medium">{methodName}</div>
                          <div className="flex gap-1 justify-center">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="p-1.5"
                              onClick={() => openModal('paymentEdit', { payment: p, receivable: { client_id: client.id } })}
                            >
                              <Edit3 size={14} />
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              className="p-1.5"
                              onClick={() => openModal('paymentDelete', { payment: p })}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {item.details?.allocations && item.details.allocations.length > 0 && (
              <div>
                <div className="text-sm text-text-secondary mb-2 font-medium">
                  🔄 تفاصيل التخصيصات ({item.details.allocations.length}):
                </div>
                <div className="rounded-lg border border-border bg-card overflow-hidden">
                  <div className="grid grid-cols-5 gap-2 p-2 bg-bg-surface-muted font-bold text-text-primary text-center text-sm">
                    <div>المبلغ</div>
                    <div>التاريخ</div>
                    <div>الوصف</div>
                    <div>المصدر</div>
                    <div>الإجراءات</div>
                  </div>
                  <div className="divide-y divide-border">
                    {item.details.allocations.map((allocation: CreditAllocation) => (
                      <div key={allocation.id} className="grid grid-cols-5 gap-2 p-2 text-center items-center">
                        <div className="text-text-primary font-bold">{formatCurrency(allocation.amount)}</div>
                        <div className="text-text-primary">{formatDate(allocation.allocated_at)}</div>
                        <div className="text-text-primary">{allocation.description ?? 'تخصيص من رصيد العميل'}</div>
                        <div className="text-text-primary">تخصيص</div>
                        <div className="flex gap-1 justify-center">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="p-1.5"
                            onClick={() => openModal('allocationEdit', { allocation, clientId: client.id })}
                          >
                            <Edit3 size={14} />
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            className="p-1.5"
                            onClick={() => openModal('allocationDelete', { allocation, clientId: client.id })}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ClientReceivablesTable;

