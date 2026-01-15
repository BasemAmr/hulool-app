/**
 * PendingReviewTasksTable - Specialized table for tasks pending review
 * 
 * Shows custom columns optimized for reviewing submitted tasks:
 * - Employee name (who submitted)
 * - Client info with WhatsApp
 * - Service name and notes inline
 * - Task amount
 * - Invoice payment totals (paid/remaining)
 */

import React, { useMemo } from 'react';
import type { TaskWithInvoiceData } from '../../api/types';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import HuloolDataGrid, { DEFAULT_TYPE_COLORS } from '../grid/HuloolDataGrid';
import type { HuloolGridColumn } from '../grid/HuloolDataGrid';
import {
    GridActionBar,
    createEditAction,
    createGoogleDriveAction,
} from '../grid';
import type { GridAction } from '../grid';
import { useRejectTask } from '../../queries/taskQueries';
import { useGetEmployeesForSelection } from '../../queries/employeeQueries';
import { useToast } from '../../hooks/useToast';
import { useModalStore } from '../../stores/modalStore';
import { useDrawerStore } from '../../stores/drawerStore';
import type { CellProps } from 'react-datasheet-grid';

interface PendingReviewTasksTableProps {
    tasks: TaskWithInvoiceData[];
    isLoading: boolean;
    onEdit: (task: TaskWithInvoiceData) => void;
    onDelete: (task: TaskWithInvoiceData) => void;
}

// ================================
// CUSTOM CELL COMPONENTS
// ================================

// Employee Name Cell
const EmployeeNameCell = React.memo(({ rowData }: CellProps<TaskWithInvoiceData>) => {
    const employeeName = rowData.assigned_employee_name || '—';

    return (
        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#000000' }}>
            {employeeName}
        </div>
    );
});
EmployeeNameCell.displayName = 'EmployeeNameCell';

// Client Name Cell with Link
const ClientLinkCell = React.memo(({ rowData }: CellProps<TaskWithInvoiceData>) => {
    if (!rowData.client) {
        return <span className="hulool-cell-content" style={{ color: '#000000', fontWeight: 700 }}>لا يوجد عميل</span>;
    }

    return (
        <span className="hulool-cell-content" style={{ fontWeight: 700 }}>
            <Link
                to={`/clients/${rowData.client.id}?mode=tasks`}
                className="no-underline font-bold hover:text-primary transition-colors"
                style={{ color: '#000000', fontWeight: 700 }}
                onClick={(e) => e.stopPropagation()}
            >
                {rowData.client.name}
            </Link>
        </span>
    );
});
ClientLinkCell.displayName = 'ClientLinkCell';

// Phone Cell with WhatsApp
const PhoneWhatsAppCell = React.memo(({ rowData }: CellProps<TaskWithInvoiceData>) => {
    if (!rowData.client?.phone) {
        return <span className="hulool-cell-content" style={{ color: '#000000', fontWeight: 700 }}>—</span>;
    }

    const phone = rowData.client.phone;

    const formatPhoneForWhatsApp = (phone: string) => {
        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.startsWith('966')) return cleanPhone;
        if (cleanPhone.startsWith('0')) return `966${cleanPhone.substring(1)}`;
        return `966${cleanPhone}`;
    };

    const handleWhatsAppClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        const whatsappPhone = formatPhoneForWhatsApp(phone);
        window.open(`https://wa.me/${whatsappPhone}`, '_blank');
    };

    return (
        <div className="hulool-cell-content" style={{ justifyContent: 'center', gap: '4px' }}>
            <span style={{ color: '#000000', fontSize: '0.875rem', fontWeight: 700 }}>{phone}</span>
            <button
                onClick={handleWhatsAppClick}
                title="فتح واتساب"
                className="hulool-whatsapp-btn"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
            </button>
        </div>
    );
});
PhoneWhatsAppCell.displayName = 'PhoneWhatsAppCell';

// Service with Notes Cell (task_name + notes inline)
const ServiceWithNotesCell = React.memo(({ rowData, columnData }: CellProps<TaskWithInvoiceData, { t: (key: string) => string }>) => {
    const t = columnData?.t || ((key: string) => key);
    const displayName = rowData.task_name || t(`type.${rowData.type}`);
    const notes = rowData.notes;

    return (
        <div style={{ fontWeight: 700, color: '#000000', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span>{displayName}</span>
            {notes && (
                <span style={{ color: '#000000', fontSize: '0.875rem', fontStyle: 'italic', fontWeight: 700 }}>
                    ({notes})
                </span>
            )}
        </div>
    );
});
ServiceWithNotesCell.displayName = 'ServiceWithNotesCell';

// Amount Cell (formatted currency)
const AmountCell = React.memo(({ rowData }: CellProps<TaskWithInvoiceData>) => {
    return (
        <div style={{ textAlign: 'right', fontWeight: 700, color: '#000000' }}>
            {rowData.amount.toFixed(2)}
        </div>
    );
});
AmountCell.displayName = 'AmountCell';

// Paid Amount Cell
const PaidAmountCell = React.memo(({ rowData }: CellProps<TaskWithInvoiceData>) => {
    const paidAmount = rowData.invoice_totals.paid_amount;

    return (
        <div style={{ textAlign: 'right', fontWeight: 700, color: paidAmount > 0 ? '#16a34a' : '#6b7280' }}>
            {paidAmount.toFixed(2)}
        </div>
    );
});
PaidAmountCell.displayName = 'PaidAmountCell';

// Remaining Amount Cell
const RemainingAmountCell = React.memo(({ rowData }: CellProps<TaskWithInvoiceData>) => {
    const remainingAmount = rowData.invoice_totals.remaining_amount;

    return (
        <div style={{ textAlign: 'right', fontWeight: 700, color: remainingAmount > 0 ? '#dc2626' : '#6b7280' }}>
            {remainingAmount.toFixed(2)}
        </div>
    );
});
RemainingAmountCell.displayName = 'RemainingAmountCell';

// Actions Cell
interface TaskActionsCellData {
    onEdit: (task: TaskWithInvoiceData) => void;
    onDelete: (task: TaskWithInvoiceData) => void;
    handleApproveTask: (task: TaskWithInvoiceData) => void;
    handleRejectTask: (task: TaskWithInvoiceData) => void;
    openDrawer: (drawer: string, data: any) => void;
    openModal: (modal: string, data: any) => void;
}

const ActionsCell = React.memo(({ rowData, rowIndex, columnData }: CellProps<TaskWithInvoiceData, TaskActionsCellData>) => {
    const task = rowData;
    const {
        onEdit,
        onDelete,
        handleApproveTask,
        handleRejectTask,
        openDrawer,
        openModal,
    } = columnData || {};

    if (!columnData) return null;

    const actions: GridAction<TaskWithInvoiceData>[] = [];

    // Google Drive
    if (task.client?.google_drive_link) {
        actions.push(createGoogleDriveAction<TaskWithInvoiceData>((t) => t.client?.google_drive_link));
    }

    // Follow-up Messages
    actions.push({
        type: 'message',
        onClick: () => openDrawer?.('taskFollowUp', {
            taskId: task.id,
            taskName: task.task_name || undefined,
            clientName: task.client?.name || 'عميل غير محدد',
        }),
        title: 'المراسلات',
        variant: 'outline-secondary',
    });

    // Review/Approve
    actions.push({
        type: 'review',
        onClick: () => handleApproveTask?.(task),
        title: 'مراجعة',
        className: 'bg-orange-500 hover:bg-orange-600 border-orange-500 text-white',
    });

    // Reject
    actions.push({
        type: 'reject',
        onClick: () => handleRejectTask?.(task),
        title: 'إعادة المهمة إلى الموظف',
        className: 'bg-red-500 hover:bg-red-600 border-red-500 text-white',
    });

    // Edit
    actions.push(createEditAction<TaskWithInvoiceData>(onEdit));

    return (
        <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', height: '100%' }}>
            <GridActionBar
                item={task}
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

const PendingReviewTasksTable: React.FC<PendingReviewTasksTableProps> = ({
    tasks,
    isLoading,
    onEdit,
    onDelete
}) => {
    const { t } = useTranslation();
    const rejectTaskMutation = useRejectTask();
    const { success, error } = useToast();
    const { openDrawer } = useDrawerStore();
    const { openModal } = useModalStore();

    const handleApproveTask = (task: TaskWithInvoiceData) => {
        openModal('approval', { task });
    };

    const handleRejectTask = (task: TaskWithInvoiceData) => {
        rejectTaskMutation.mutate({ id: task.id }, {
            onSuccess: () => {
                success('تم رفض المهمة', 'تم إعادة المهمة إلى الحالة "جديدة"');
            },
            onError: (err: any) => {
                error(t('common.error'), err.message || 'فشل رفض المهمة');
            }
        });
    };

    // Sort tasks by created_at descending (newest first)
    const sortedTasks = useMemo(() => {
        return [...tasks].sort((a, b) => {
            const aDate = new Date(a.created_at).getTime();
            const bDate = new Date(b.created_at).getTime();
            return bDate - aDate; // Descending order
        });
    }, [tasks]);

    // Define columns
    const columns = useMemo((): HuloolGridColumn<TaskWithInvoiceData>[] => [
        {
            id: 'employee',
            key: 'assigned_employee_name',
            title: 'جهة التصدير',
            type: 'custom',
            component: EmployeeNameCell,
            width: 120,
            grow: 0,
        },
        {
            id: 'client',
            key: 'client.name',
            title: 'اسم العميل',
            type: 'custom',
            component: ClientLinkCell,
            grow: 1,
        },
        {
            id: 'phone',
            key: 'client.phone',
            title: 'رقم الجوال',
            type: 'custom',
            component: PhoneWhatsAppCell,
            grow: 1,
        },
        {
            id: 'service',
            key: 'task_name',
            title: 'الخدمة المقدمة',
            type: 'custom',
            component: ServiceWithNotesCell,
            grow: 2,
        },
        {
            id: 'amount',
            key: 'amount',
            title: 'مبلغ المهمة',
            type: 'custom',
            component: AmountCell,
            width: 100,
            grow: 0,
        },
        {
            id: 'paid',
            key: 'invoice_totals.paid_amount',
            title: 'مبلغ مدفوع',
            type: 'custom',
            component: PaidAmountCell,
            width: 100,
            grow: 0,
        },
        {
            id: 'remaining',
            key: 'invoice_totals.remaining_amount',
            title: 'مبلغ متبقي',
            type: 'custom',
            component: RemainingAmountCell,
            width: 100,
            grow: 0,
        },
        {
            id: 'actions',
            key: 'id',
            title: t('tasks.tableHeaderActions'),
            type: 'custom',
            component: ActionsCell as React.ComponentType<CellProps<TaskWithInvoiceData>>,
            width: 250,
            grow: 0,
        },
    ], [t]);

    // Add columnData to columns
    const columnsWithData = useMemo(() => {
        return columns.map(col => {
            if (col.id === 'service') {
                return { ...col, columnData: { t } };
            }
            if (col.id === 'actions') {
                return {
                    ...col,
                    columnData: {
                        onEdit,
                        onDelete,
                        handleApproveTask,
                        handleRejectTask,
                        openDrawer,
                        openModal,
                    },
                };
            }
            return col;
        });
    }, [columns, t, onEdit, onDelete, openModal, openDrawer]);

    return (
        <HuloolDataGrid
            data={sortedTasks}
            columns={columnsWithData as HuloolGridColumn<TaskWithInvoiceData>[]}
            isLoading={isLoading}
            emptyMessage="لا توجد مهام قيد المراجعة"
            typeField="type"
            typeColors={DEFAULT_TYPE_COLORS}
            showId={false}
            height="auto"
            minHeight={400}
        />
    );
};

export default PendingReviewTasksTable;
