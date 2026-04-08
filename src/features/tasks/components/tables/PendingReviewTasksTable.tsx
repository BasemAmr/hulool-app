/**
 * PendingReviewTasksTable - Specialized table for tasks pending review
 */

import React, { useMemo } from 'react';
import type { TaskWithInvoiceData } from '@/api/types';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import HuloolDataGrid from '@/shared/grid/HuloolDataGrid';
import type { HuloolGridColumn } from '@/shared/grid/HuloolDataGrid';
import {
    GridActionBar,
    createEditAction,
    createGoogleDriveAction,
} from '@/shared/grid';
import type { GridAction } from '@/shared/grid';
import { useRejectTask } from '@/features/tasks/api/taskQueries';
import { useToast } from '@/shared/hooks/useToast';
import { useModalStore } from '@/shared/stores/modalStore';
import { useDrawerStore } from '@/shared/stores/drawerStore';
import type { CellProps } from 'react-datasheet-grid';
import { ClipboardCheck, X } from 'lucide-react';

interface PendingReviewTasksTableProps {
    tasks: TaskWithInvoiceData[];
    isLoading: boolean;
    onEdit: (task: TaskWithInvoiceData) => void;
    onDelete: (task: TaskWithInvoiceData) => void;
}

// ================================
// CUSTOM CELL COMPONENTS
// ================================

const EmployeeNameCell = React.memo(({ rowData }: CellProps<TaskWithInvoiceData>) => (
    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--token-text-primary)' }}>
        {rowData.assigned_employee_name || '—'}
    </div>
));
EmployeeNameCell.displayName = 'EmployeeNameCell';

const ClientLinkCell = React.memo(({ rowData }: CellProps<TaskWithInvoiceData>) => {
    if (!rowData.client) {
        return <span className="hulool-cell-content" style={{ color: 'var(--token-text-muted)' }}>لا يوجد عميل</span>;
    }
    return (
        <span className="hulool-cell-content" style={{ fontWeight: 600 }}>
            <Link
                to={`/clients/${rowData.client.id}?mode=tasks`}
                className="no-underline font-semibold hover:text-primary transition-colors"
                style={{ color: 'var(--token-text-primary)' }}
                onClick={(e) => e.stopPropagation()}
            >
                {rowData.client.name}
            </Link>
        </span>
    );
});
ClientLinkCell.displayName = 'ClientLinkCell';

const PhoneWhatsAppCell = React.memo(({ rowData }: CellProps<TaskWithInvoiceData>) => {
    if (!rowData.client?.phone) {
        return <span className="hulool-cell-content" style={{ color: 'var(--token-text-muted)' }}>—</span>;
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
        window.open(`https://wa.me/${formatPhoneForWhatsApp(phone)}`, '_blank');
    };

    return (
        <div className="hulool-cell-content" style={{ justifyContent: 'center', gap: '4px' }}>
            <span style={{ color: 'var(--token-text-primary)', fontSize: '0.875rem' }}>{phone}</span>
            <button onClick={handleWhatsAppClick} title="فتح واتساب" className="hulool-whatsapp-btn">
                {/* WhatsApp brand color — confirmed exception */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--color-whatsapp)">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
            </button>
        </div>
    );
});
PhoneWhatsAppCell.displayName = 'PhoneWhatsAppCell';

const ServiceWithNotesCell = React.memo(({ rowData, columnData }: CellProps<TaskWithInvoiceData, { t: (key: string) => string }>) => {
    const t = columnData?.t || ((key: string) => key);
    const displayName = rowData.task_name || t(`type.${rowData.type}`);
    const notes = rowData.notes;

    return (
        <div style={{ color: 'var(--token-text-primary)', display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontWeight: 600 }}>{displayName}</span>
            {notes && (
                <span style={{ color: 'var(--token-text-secondary)', fontSize: '0.875rem', fontStyle: 'italic' }}>
                    ({notes})
                </span>
            )}
        </div>
    );
});
ServiceWithNotesCell.displayName = 'ServiceWithNotesCell';

const AmountCell = React.memo(({ rowData }: CellProps<TaskWithInvoiceData>) => (
    <div style={{ textAlign: 'right', fontWeight: 600, color: 'var(--token-text-primary)' }}>
        {rowData.amount.toFixed(2)}
    </div>
));
AmountCell.displayName = 'AmountCell';

// Paid amount — green only when > 0 (a positive signal worth highlighting)
const PaidAmountCell = React.memo(({ rowData }: CellProps<TaskWithInvoiceData>) => {
    const paidAmount = rowData.invoice_totals.paid_amount;
    return (
        <div style={{
            textAlign: 'right',
            fontWeight: 600,
            color: paidAmount > 0
                ? 'var(--token-status-success-text)'
                : 'var(--token-text-muted)',
        }}>
            {paidAmount.toFixed(2)}
        </div>
    );
});
PaidAmountCell.displayName = 'PaidAmountCell';

// Remaining amount — red only when > 0 (outstanding balance due)
const RemainingAmountCell = React.memo(({ rowData }: CellProps<TaskWithInvoiceData>) => {
    const remainingAmount = rowData.invoice_totals.remaining_amount;
    return (
        <div style={{
            textAlign: 'right',
            fontWeight: 600,
            color: remainingAmount > 0
                ? 'var(--token-status-danger-text)'
                : 'var(--token-text-muted)',
        }}>
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
    const { onEdit, handleApproveTask, handleRejectTask, openDrawer } = columnData || {};

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
    });

    // Review/Approve — neutral ghost, semantic green icon signals positive action
    actions.push({
        type: 'review',
        onClick: () => handleApproveTask?.(task),
        title: 'قبول المهمة',
        icon: <ClipboardCheck size={14} style={{ color: 'var(--token-status-success-text)' }} />,
    });

    // Reject — destructive (muted red ghost, reveals on hover)
    actions.push({
        type: 'reject',
        onClick: () => handleRejectTask?.(task),
        title: 'إعادة المهمة إلى الموظف',
        style: 'destructive',
        icon: <X size={14} />,
    });

    // Edit
    actions.push(createEditAction<TaskWithInvoiceData>(onEdit));

    return (
        <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', height: '100%' }}>
            <GridActionBar item={task} index={rowIndex} actions={actions} compact />
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

    const sortedTasks = useMemo(() => {
        return [...tasks].sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }, [tasks]);

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
            width: 200,
            grow: 0,
        },
    ], [t]);

    const columnsWithData = useMemo(() => {
        return columns.map(col => {
            if (col.id === 'service') return { ...col, columnData: { t } };
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
            showId={false}
            height="auto"
            minHeight={400}
        />
    );
};

export default PendingReviewTasksTable;
