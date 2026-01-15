import React, { useMemo } from 'react';
import { useGetAdminEmployeeInvoices } from '../../queries/invoiceQueries';
import HuloolDataGrid, { type HuloolGridColumn } from '../grid/HuloolDataGrid';
import type { Invoice } from '../../api/types';
import type { CellProps } from 'react-datasheet-grid';
import { useModalStore } from '../../stores/modalStore';
import { formatCurrency } from '../../utils/formatUtils';
import { DollarSign, FileText, MessageCircle } from 'lucide-react';
import { sendPaymentReminder } from '../../utils/whatsappUtils';
import { Spinner } from '../ui/spinner';

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
            <span className="font-bold text-black text-sm">{clientName}</span>
            {phone && (
                <span className="text-xs font-mono text-gray-600">{phone}</span>
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
            <span className="font-bold text-black text-sm truncate max-w-[200px]" title={taskName}>
                {taskName}
            </span>
            {notes && (
                <span className="text-xs text-gray-500 truncate max-w-[200px]" title={notes}>
                    {notes}
                </span>
            )}
        </div>
    );
});
TaskCell.displayName = 'TaskCell';

/** Amount Cell */
const AmountCell = React.memo(({ rowData }: CellProps<Invoice>) => (
    <span className="font-bold text-black">
        {formatCurrency(Number(rowData.amount))}
    </span>
));
AmountCell.displayName = 'AmountCell';

/** Paid Amount Cell */
const PaidCell = React.memo(({ rowData }: CellProps<Invoice>) => {
    const paid = Number(rowData.paid_amount);
    return (
        <span className={`font-bold ${paid > 0 ? 'text-green-600' : 'text-gray-400'}`}>
            {formatCurrency(paid)}
        </span>
    );
});
PaidCell.displayName = 'PaidCell';

/** Remaining Amount Cell */
const RemainingCell = React.memo(({ rowData }: CellProps<Invoice>) => {
    const remaining = Number(rowData.remaining_amount);
    return (
        <span className={`font-bold ${remaining > 0 ? 'text-red-600' : 'text-gray-400'}`}>
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
        <span className="font-bold text-black text-xs font-mono">
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
        bgColor = 'bg-gray-100';
        textColor = 'text-gray-600';
    } else if (isPaid) {
        label = 'مدفوعة';
        bgColor = 'bg-green-100';
        textColor = 'text-green-700';
    } else if (isPartial) {
        label = 'جزئية';
        bgColor = 'bg-yellow-100';
        textColor = 'text-yellow-700';
    } else if (status === 'overdue') {
        label = 'متأخرة';
        bgColor = 'bg-red-100';
        textColor = 'text-red-700';
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
                    className="p-1.5 rounded border border-green-600 text-green-600 hover:bg-green-50 transition-colors"
                >
                    <DollarSign size={14} />
                </button>
            )}
            {phone && (
                <button
                    onClick={handleWhatsApp}
                    title="تذكير واتساب"
                    className="p-1.5 rounded border border-green-500 text-green-500 hover:bg-green-50 transition-colors"
                >
                    <MessageCircle size={14} />
                </button>
            )}
            <button
                onClick={handleViewDetails}
                title="عرض التفاصيل"
                className="p-1.5 rounded border border-blue-600 text-blue-600 hover:bg-blue-50 transition-colors"
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
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
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
                <div className="flex justify-between items-center px-4 py-3 bg-white rounded-lg border border-gray-200">
                    <div className="text-sm text-gray-600 font-bold">
                        عرض {((page - 1) * perPage) + 1} إلى {Math.min(page * perPage, pagination.total)} من أصل {pagination.total} فاتورة
                    </div>
                    <div className="flex gap-2">
                        <button
                            className="px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={page <= 1}
                            onClick={() => onPageChange?.(page - 1)}
                        >
                            السابق
                        </button>
                        <button
                            className="px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
