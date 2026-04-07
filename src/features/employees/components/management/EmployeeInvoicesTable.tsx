import React, { useMemo } from 'react';
import { useGetAdminEmployeeInvoices } from '@/features/invoices/api/invoiceQueries';
import HuloolDataGrid, { type HuloolGridColumn } from '@/shared/grid/HuloolDataGrid';
import type { Invoice } from '@/api/types';
import type { CellProps } from 'react-datasheet-grid';
import { useModalStore } from '@/shared/stores/modalStore';
import { formatCurrency } from '@/shared/utils/formatUtils';
import { DollarSign, FileText, MessageCircle } from 'lucide-react';
import { sendPaymentReminder } from '@/shared/utils/whatsappUtils';
import { Spinner } from '@/shared/ui/shadcn/spinner';

interface EmployeeInvoicesTableProps {
    employeeId: number;
    page: number;
    perPage: number;
    onPageChange?: (page: number) => void;
}

// ================================
// CUSTOM CELL COMPONENTS
// ================================

/** Client Cell - Name + Phone */
const ClientCell = React.memo(({ rowData }: CellProps<Invoice>) => {
    const clientName = rowData.client?.name || `عميل #${rowData.client_id}`;
    const phone = rowData.client?.phone || '';

    return (
        <div className="flex flex-col py-1">
            <span className="font-bold text-text-primary text-sm">{clientName}</span>
            {phone && (
                <span className="text-xs font-mono text-text-secondary">{phone}</span>
            )}
        </div>
    );
});
ClientCell.displayName = 'ClientCell';

/** Task Cell - Task Name + Notes */
const TaskCell = React.memo(({ rowData }: CellProps<Invoice>) => {
    const taskName = rowData.task?.task_name || rowData.description || '—';
    const notes = rowData.notes;

    return (
        <div className="flex flex-col py-1">
            <span className="font-bold text-text-primary text-sm truncate max-w-[200px]" title={taskName}>
                {taskName}
            </span>
            {notes && (
                <span className="text-xs text-text-muted truncate max-w-[200px]" title={notes}>
                    {notes}
                </span>
            )}
        </div>
    );
});
TaskCell.displayName = 'TaskCell';

/** Amount Cell */
const AmountCell = React.memo(({ rowData }: CellProps<Invoice>) => (
    <span className="font-bold text-text-primary">
        {formatCurrency(Number(rowData.amount))}
    </span>
));
AmountCell.displayName = 'AmountCell';

/** Paid Amount Cell */
const PaidCell = React.memo(({ rowData }: CellProps<Invoice>) => {
    const paid = Number(rowData.paid_amount);
    return (
        <span className={`font-bold ${paid > 0 ? 'text-status-success-text' : 'text-text-muted'}`}>
            {formatCurrency(paid)}
        </span>
    );
});
PaidCell.displayName = 'PaidCell';

/** Remaining Amount Cell */
const RemainingCell = React.memo(({ rowData }: CellProps<Invoice>) => {
    const remaining = Number(rowData.remaining_amount);
    return (
        <span className={`font-bold ${remaining > 0 ? 'text-status-danger-text' : 'text-text-muted'}`}>
            {formatCurrency(remaining)}
        </span>
    );
});
RemainingCell.displayName = 'RemainingCell';

/** Due Date Cell */
const DueDateCell = React.memo(({ rowData }: CellProps<Invoice>) => {
    const dateStr = rowData.due_date
        ? new Date(rowData.due_date).toLocaleDateString('en-CA')
        : '—';
    return (
        <span className="font-bold text-text-primary text-xs font-mono">
            {dateStr}
        </span>
    );
});
DueDateCell.displayName = 'DueDateCell';

/** Status Cell - Arabic Badges */
const StatusCell = React.memo(({ rowData }: CellProps<Invoice>) => {
    const status = rowData.status;
    const isPaid = Number(rowData.paid_amount) >= Number(rowData.amount);
    const isPartial = Number(rowData.paid_amount) > 0 && Number(rowData.paid_amount) < Number(rowData.amount);

    let label = 'معلقة';
    let bgColor = 'bg-orange-100';
    let textColor = 'text-orange-700';

    if (status === 'cancelled') {
        label = 'ملغاة';
        bgColor = 'bg-background';
        textColor = 'text-text-secondary';
    } else if (isPaid) {
        label = 'مدفوعة';
        bgColor = 'bg-status-success-bg';
        textColor = 'text-status-success-text';
    } else if (isPartial) {
        label = 'جزئية';
        bgColor = 'bg-status-warning-bg';
        textColor = 'text-status-warning-text';
    } else if (status === 'overdue') {
        label = 'متأخرة';
        bgColor = 'bg-status-danger-bg';
        textColor = 'text-status-danger-text';
    }

    return (
        <span className={`px-2 py-1 rounded-full text-xs font-bold ${bgColor} ${textColor}`}>
            {label}
        </span>
    );
});
StatusCell.displayName = 'StatusCell';

/** Actions Cell */
const ActionsCell = React.memo(({ rowData, columnData }: CellProps<Invoice, { openModal: (name: string, data: any) => void }>) => {
    const { openModal } = columnData || {};
    const remaining = Number(rowData.remaining_amount);
    const phone = rowData.client?.phone;
    const clientName = rowData.client?.name || `عميل #${rowData.client_id}`;

    const handleRecordPayment = (e: React.MouseEvent) => {
        e.stopPropagation();
        openModal?.('recordPayment', {
            invoiceId: rowData.id,
            invoice: rowData,
            amountDue: remaining,
            clientId: rowData.client_id,
            clientName
        });
    };

    const handleWhatsApp = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (phone) {
            sendPaymentReminder(phone, clientName, formatCurrency(remaining));
        }
    };

    const handleViewDetails = (e: React.MouseEvent) => {
        e.stopPropagation();
        openModal?.('invoiceDetails', { invoiceId: rowData.id, isEmployeeView: true });
    };

    return (
        <div className="flex items-center gap-1 justify-center">
            {remaining > 0 && (
                <button
                    onClick={handleRecordPayment}
                    title="تسجيل دفعة"
                    className="p-1.5 rounded border border-status-success-border text-status-success-text hover:bg-status-success-bg transition-colors"
                >
                    <DollarSign size={14} />
                </button>
            )}
            {phone && (
                <button
                    onClick={handleWhatsApp}
                    title="تذكير واتساب"
                    className="p-1.5 rounded border border-status-success-border text-status-success-text hover:bg-status-success-bg transition-colors"
                >
                    <MessageCircle size={14} />
                </button>
            )}
            <button
                onClick={handleViewDetails}
                title="عرض التفاصيل"
                className="p-1.5 rounded border border-blue-600 text-status-info-text hover:bg-status-info-bg transition-colors"
            >
                <FileText size={14} />
            </button>
        </div>
    );
});
ActionsCell.displayName = 'ActionsCell';

// ================================
// MAIN COMPONENT
// ================================

const EmployeeInvoicesTable: React.FC<EmployeeInvoicesTableProps> = ({
    employeeId,
    page,
    perPage,
    onPageChange
}) => {
    const { openModal } = useModalStore();

    // Fetch invoices
    const { data, isLoading } = useGetAdminEmployeeInvoices(employeeId, {
        page,
        per_page: perPage,
    });

    const invoices = data?.invoices || [];
    const pagination = data?.pagination;

    // Columns Configuration - following same pattern as EmployeeTransactionsTable
    const columns = useMemo((): HuloolGridColumn<Invoice>[] => [
        {
            id: 'client',
            key: 'client.name',
            title: 'العميل',
            component: ClientCell,
            grow: 1,
        },
        {
            id: 'task',
            key: 'task.task_name',
            title: 'المهمة / الوصف',
            component: TaskCell,
            grow: 1,
        },
        {
            id: 'amount',
            key: 'amount',
            title: 'المبلغ',
            component: AmountCell,
            width: 100,
            grow: 0,
        },
        {
            id: 'paid',
            key: 'paid_amount',
            title: 'المدفوع',
            component: PaidCell,
            width: 100,
            grow: 0,
        },
        {
            id: 'remaining',
            key: 'remaining_amount',
            title: 'المتبقي',
            component: RemainingCell,
            width: 100,
            grow: 0,
        },
        {
            id: 'due_date',
            key: 'due_date',
            title: 'الاستحقاق',
            component: DueDateCell,
            width: 100,
            grow: 0,
        },
        {
            id: 'status',
            key: 'status',
            title: 'الحالة',
            component: StatusCell,
            width: 100,
            grow: 0,
        },
        {
            id: 'actions',
            key: 'id',
            title: 'إجراءات',
            component: ActionsCell,
            width: 120,
            grow: 0,
            columnData: { openModal }
        }
    ], [openModal]);

    if (isLoading) {
        return <div className="p-12 flex justify-center"><Spinner size="lg" /></div>;
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-border-default bg-card shadow-sm overflow-hidden">
                <HuloolDataGrid
                    data={invoices}
                    columns={columns}
                    height="auto"
                    minHeight={300}
                    emptyMessage="لا توجد فواتير لهذه الفترة"
                />
            </div>

            {/* Pagination */}
            {pagination && pagination.total > perPage && (
                <div className="flex items-center justify-between rounded-lg border border-border-default bg-background px-4 py-3">
                    <div className="text-sm text-text-secondary font-bold">
                        عرض {((page - 1) * perPage) + 1} إلى {Math.min(page * perPage, pagination.total)} من أصل {pagination.total} فاتورة
                    </div>
                    <div className="flex gap-2">
                        <button
                            className="rounded-md border border-border-strong bg-card px-4 py-2 text-sm font-bold text-text-primary hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={page <= 1}
                            onClick={() => onPageChange?.(page - 1)}
                        >
                            السابق
                        </button>
                        <button
                            className="rounded-md border border-border-strong bg-card px-4 py-2 text-sm font-bold text-text-primary hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={page >= Math.ceil(pagination.total / perPage)}
                            onClick={() => onPageChange?.(page + 1)}
                        >
                            التالي
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeInvoicesTable;
