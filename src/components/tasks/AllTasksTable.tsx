/**
 * AllTasksTable - Excel-like grid for displaying tasks
 * 
 * Uses HuloolDataGrid for consistent styling with:
 * - Type-based row coloring (Government, RealEstate, Accounting, Other)
 * - Alternating colors for consecutive same-type rows
 * - Uneditable cells
 * - Arabic Cairo font
 * - Separated actions
 */

import React, { useMemo } from 'react';
import type { Task } from '../../api/types';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import HuloolDataGrid, { DEFAULT_TYPE_COLORS } from '../grid/HuloolDataGrid';
import type { HuloolGridColumn } from '../grid/HuloolDataGrid';
import {
  GridActionBar,
  createEditAction,
  createGoogleDriveAction,
  createAssignAction,
  createViewAmountAction,
  createRequirementsAction,
} from '../grid';
import type { GridAction } from '../grid';
import { useDeferTask, useResumeTask, useRestoreTask, useRejectTask } from '../../queries/taskQueries';
import { useGetEmployeesForSelection } from '../../queries/employeeQueries';
import { useToast } from '../../hooks/useToast';
import { useModalStore } from '../../stores/modalStore';
import { useCurrentUserCapabilities } from '../../queries/userQueries';
import { useDrawerStore } from '../../stores/drawerStore';
import type { CellProps } from 'react-datasheet-grid';
import { X, DollarSign, CreditCard, RotateCcw } from 'lucide-react';
import { translateTaskType } from '../../constants/taskTypes';
// Button removed - using GridActionBar for all actions

interface AllTasksTableProps {
  tasks: Task[];
  isLoading: boolean;
  onEdit: (task: Task) => void;
  onComplete: (task: Task) => void;
  onViewAmountDetails?: (task: Task) => void;
  onDelete: (task: Task) => void;

  onAssign?: (task: Task) => void;
}

// ================================
// CUSTOM CELL COMPONENTS
// ================================

// Client Name Cell with Link
const ClientLinkCell = React.memo(({ rowData }: CellProps<Task>) => {
  if (!rowData.client) {
    return <span className="hulool-cell-content" style={{ color: '#9ca3af' }}>لا يوجد عميل</span>;
  }

  return (
    <span className="hulool-cell-content" style={{ fontWeight: 600 }}>
      <Link
        to={`/clients/${rowData.client.id}?mode=tasks`}
        className="no-underline text-black font-bold hover:text-primary transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {rowData.client.name}
      </Link>
    </span>
  );
});
ClientLinkCell.displayName = 'ClientLinkCell';

// Phone Cell with WhatsApp
const PhoneWhatsAppCell = React.memo(({ rowData }: CellProps<Task>) => {
  if (!rowData.client?.phone) {
    return <span className="hulool-cell-content" style={{ color: '#9ca3af' }}>—</span>;
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
      <span style={{ color: '#000000', fontSize: '0.875rem' }}>{phone}</span>
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

// Service/Task Name Cell
const ServiceCell = React.memo(({ rowData, columnData }: CellProps<Task, { t: (key: string) => string }>) => {
  const t = columnData?.t || ((key: string) => key);
  const displayName = rowData.task_name || t(`type.${rowData.type}`);

  return (
    <div style={{ fontWeight: 500, color: '#000000' }}>
      {displayName}
    </div>
  );
});
ServiceCell.displayName = 'ServiceCell';

// Type Badge Cell
const TypeBadgeCell = React.memo(({ rowData, columnData }: CellProps<Task, { t: (key: string) => string }>) => {
  const t = columnData?.t || ((key: string) => key);

  const typeColors: Record<string, string> = {
    Government: '#3b82f6',
    RealEstate: '#22c55e',
    Accounting: '#eab308',
    Other: '#6b7280',
  };

  // Get translated type name
  const displayType = translateTaskType(rowData.type);

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <span style={{
        backgroundColor: typeColors[rowData.type] || '#6b7280',
        color: rowData.type === 'Accounting' ? '#000000' : '#ffffff',
        padding: '4px 12px',
        borderRadius: '9999px',
        fontSize: '0.875rem',
        fontWeight: 500,
        whiteSpace: 'nowrap',
      }}>
        {displayType}
      </span>
    </div>
  );
});
TypeBadgeCell.displayName = 'TypeBadgeCell';

// Notes Cell
const NotesCell = React.memo(({ rowData }: CellProps<Task>) => {
  const notes = rowData.notes;

  return (
    <div style={{
      color: '#000000',
      fontSize: '0.875rem',
      maxWidth: '200px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    }}>
      {notes || '—'}
    </div>
  );
});
NotesCell.displayName = 'NotesCell';

// Assigned Employee Cell
const AssignedCell = React.memo(({ rowData, columnData }: CellProps<Task, { getEmployeeName: (id: number | null) => string }>) => {
  const getEmployeeName = columnData?.getEmployeeName || (() => '—');

  return (
    <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#4b5563' }}>
      {getEmployeeName(rowData.assigned_to_id)}
    </div>
  );
});
AssignedCell.displayName = 'AssignedCell';

// Status Badge Cell
const StatusBadgeCell = React.memo(({ rowData, columnData }: CellProps<Task, { t: (key: string) => string }>) => {
  const t = columnData?.t || ((key: string) => key);

  const statusStyles: Record<string, { bg: string; text: string; border: string }> = {
    New: { bg: 'rgba(234, 179, 8, 0.2)', text: '#a16207', border: 'rgba(234, 179, 8, 0.3)' },
    Deferred: { bg: 'rgba(239, 68, 68, 0.2)', text: '#dc2626', border: 'rgba(239, 68, 68, 0.3)' },
    Completed: { bg: 'rgba(34, 197, 94, 0.2)', text: '#16a34a', border: 'rgba(34, 197, 94, 0.3)' },
    'Pending Review': { bg: 'rgba(249, 115, 22, 0.2)', text: '#ea580c', border: 'rgba(249, 115, 22, 0.3)' },
    Cancelled: { bg: 'rgba(107, 114, 128, 0.2)', text: '#4b5563', border: 'rgba(107, 114, 128, 0.3)' },
  };

  const style = statusStyles[rowData.status] || statusStyles.Cancelled;

  // Get translated status name
  const translatedStatus = t(`status.${rowData.status}`);
  // Fallback if translation returns the key
  const displayStatus = translatedStatus.startsWith('status.') ? rowData.status : translatedStatus;

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <span style={{
        backgroundColor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        padding: '4px 12px',
        borderRadius: '9999px',
        fontSize: '0.875rem',
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}>
        {displayStatus}
      </span>
    </div>
  );
});
StatusBadgeCell.displayName = 'StatusBadgeCell';

// Actions Cell
interface TaskActionsCellData {
  onEdit: (task: Task) => void;
  onComplete: (task: Task) => void;
  onViewAmountDetails?: (task: Task) => void;
  onDelete: (task: Task) => void;
  onAssign?: (task: Task) => void;
  handleDefer: (task: Task) => void;
  handleResume: (task: Task) => void;
  handleRestore: (task: Task) => void;
  handleApproveTask: (task: Task) => void;
  handleRejectTask: (task: Task) => void;
  openDrawer: (drawer: string, data: any) => void;
  openModal: (modal: string, data: any) => void;
  isUserEmployee: (id: number | null) => boolean;
  shouldShowCompleteButton: (task: Task) => boolean;
  canDeleteTasks: boolean;
}

const ActionsCell = React.memo(({ rowData, rowIndex, columnData }: CellProps<Task, TaskActionsCellData>) => {
  const task = rowData;
  const {
    onEdit,
    onComplete,
    onViewAmountDetails,
    onDelete,
    onAssign,
    handleDefer,
    handleResume,
    handleRestore,
    handleApproveTask,
    handleRejectTask,
    openDrawer,
    openModal,
    shouldShowCompleteButton,
    canDeleteTasks,
  } = columnData || {};

  if (!columnData) return null;

  const actions: GridAction<Task>[] = [];

  // Google Drive
  if (task.client?.google_drive_link) {
    actions.push(createGoogleDriveAction<Task>((t) => t.client?.google_drive_link));
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

  // Assign (for New or Deferred)
  if (onAssign && (task.status === 'New' || task.status === 'Deferred')) {
    actions.push(createAssignAction<Task>(onAssign));
  }

  // Amount Details
  if (task.amount_details && task.amount_details.length > 0 && onViewAmountDetails) {
    actions.push(createViewAmountAction<Task>(onViewAmountDetails));
  }

  // Edit Amount & Prepaid (Admin Actions) - Combined Modal
  actions.push({
    type: 'custom',
    onClick: () => openModal?.('taskAmountEdit', { task }),
    title: 'تعديل المبالغ',
    icon: <DollarSign size={16} />,
    variant: 'outline-primary',
  });

  // Status-based actions
  if (task.status === 'New') {
    actions.push({
      type: 'defer',
      onClick: () => handleDefer?.(task),
      title: 'تأجيل',
      className: 'bg-yellow-400 hover:bg-yellow-500 border-yellow-400 text-black',
    });
  }

  if (task.status === 'Deferred') {
    actions.push({
      type: 'resume',
      onClick: () => handleResume?.(task),
      title: 'استئناف',
      className: 'bg-cyan-500 hover:bg-cyan-600 border-cyan-500 text-white',
    });
  }

  if (task.status !== 'Completed' && task.status !== 'Pending Review' && shouldShowCompleteButton?.(task)) {
    actions.push({
      type: 'complete',
      onClick: () => onComplete?.(task),
      title: 'إكمال',
      className: 'bg-green-600 hover:bg-green-700 border-green-600 text-white',
    });
  }

  // Review for Pending Review
  if (task.assigned_to_id &&
    task.status !== 'Completed' &&
    task.status !== 'Cancelled' &&
    task.status !== 'New' &&
    task.status !== 'Deferred') {
    actions.push({
      type: 'review',
      onClick: () => handleApproveTask?.(task),
      title: 'مراجعة',
      className: 'bg-orange-500 hover:bg-orange-600 border-orange-500 text-white',
    });
  }

  // Reject for Pending Review
  if (task.status === 'Pending Review') {
    actions.push({
      type: 'reject',
      onClick: () => handleRejectTask?.(task),
      title: 'إعادة المهمة إلى الموظف',
      className: 'bg-red-500 hover:bg-red-600 border-red-500 text-white',
    });
  }

  // Restore completed or cancelled
  if (task.status === 'Completed' || task.status === 'Cancelled') {
    actions.push({
      type: 'restore',
      onClick: () => handleRestore?.(task),
      title: 'استعادة',
      className: 'bg-green-700 hover:bg-green-800 border-green-700 text-white',
      icon: <RotateCcw size={16} />,
    });
  }

  // Edit
  actions.push(createEditAction<Task>(onEdit));

  // Delete
  if (canDeleteTasks) {
    actions.push({
      type: 'cancel',
      onClick: () => onDelete?.(task),
      title: 'إلغاء',
      variant: 'danger',
      icon: <X size={16} />,
    });
  }

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

const AllTasksTable: React.FC<AllTasksTableProps> = ({
  tasks,
  isLoading,
  onEdit,
  onComplete,
  onViewAmountDetails,
  onDelete,
  onAssign
}) => {
  const { t } = useTranslation();
  const deferTaskMutation = useDeferTask();
  const resumeTaskMutation = useResumeTask();
  const rejectTaskMutation = useRejectTask();
  const { data: currentCapabilities } = useCurrentUserCapabilities();
  const { success, error } = useToast();
  const { openDrawer } = useDrawerStore();
  const { openModal } = useModalStore();

  // Get employees for assignment
  const { data: employees = [] } = useGetEmployeesForSelection();

  // Helper functions
  const getEmployeeName = (assignedToId: number | null) => {
    if (!assignedToId) return '—';
    const employee = employees.find(emp => emp.user_id === assignedToId);
    return employee ? employee.display_name : 'Unknown Employee';
  };

  const isUserEmployee = (userId: number | null) => {
    if (!userId) return false;
    return employees.some(emp => emp.user_id === userId);
  };

  const shouldShowCompleteButton = (task: Task) => {
    if (task.assigned_to_id && isUserEmployee(task.assigned_to_id)) {
      return false;
    }
    return task.assigned_to_id == null;
  };

  const handleApproveTask = (task: Task) => {
    openModal('approval', { task });
  };

  const handleRejectTask = (task: Task) => {
    rejectTaskMutation.mutate({ id: task.id }, {
      onSuccess: () => {
        success('تم رفض المهمة', 'تم إعادة المهمة إلى الحالة "جديدة"');
      },
      onError: (err: any) => {
        error(t('common.error'), err.message || 'فشل رفض المهمة');
      }
    });
  };

  const handleDefer = (task: Task) => {
    deferTaskMutation.mutate({ id: task.id }, {
      onSuccess: () => {
        success(t('tasks.deferSuccess'), t('tasks.deferSuccessMessage', {
          taskName: task.task_name || t(`type.${task.type}`)
        }));
      },
      onError: (err: any) => {
        error(t('common.error'), err.message || t('tasks.deferError'));
      }
    });
  };

  const handleResume = (task: Task) => {
    resumeTaskMutation.mutate({ id: task.id }, {
      onSuccess: () => {
        success(t('tasks.resumeSuccess'), t('tasks.resumeSuccessMessage', {
          taskName: task.task_name || t(`type.${task.type}`)
        }));
      },
      onError: (err: any) => {
        error(t('common.error'), err.message || t('tasks.resumeError'));
      }
    });
  };

  const handleRestore = (task: Task) => {
    openModal('taskRestore', { task });
  };

  const canDeleteTasks = currentCapabilities?.tm_delete_any_task || false;

  // Sort tasks: Urgent first, then by status, then by date
  const sortedTasks = useMemo(() => {
    let sorted = [...tasks].sort((a, b) => {
      const aIsUrgent = a.tags?.some(tag => tag.name === 'قصوى') || false;
      const bIsUrgent = b.tags?.some(tag => tag.name === 'قصوى') || false;
      const aDate = new Date(a.created_at || a.start_date).getTime();
      const bDate = new Date(b.created_at || b.start_date).getTime();

      if (aIsUrgent && bIsUrgent) return bDate - aDate;
      if (!aIsUrgent && !bIsUrgent) return bDate - aDate;
      return aIsUrgent ? -1 : 1;
    });

    sorted = sorted.sort((a, b) => {
      const statusOrder = ['New', 'Pending Review', 'Deferred', 'Completed', 'Cancelled'];
      return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
    });

    return sorted;
  }, [tasks]);

  // Define columns
  const columns = useMemo((): HuloolGridColumn<Task>[] => [
    {
      id: 'client',
      key: 'client.name',
      title: t('tasks.tableHeaderClient'),
      type: 'custom',
      component: ClientLinkCell,
      grow: 1,
    },
    {
      id: 'phone',
      key: 'client.phone',
      title: t('tasks.tableHeaderClientPhone'),
      type: 'custom',
      component: PhoneWhatsAppCell,
      grow: 1,
    },
    {
      id: 'service',
      key: 'task_name',
      title: t('tasks.tableHeaderService'),
      type: 'custom',
      component: ServiceCell,
      grow: 1,
    },
    {
      id: 'type',
      key: 'type',
      title: t('tasks.tableHeaderType'),
      type: 'custom',
      component: TypeBadgeCell,
      width: 100,
      grow: 0,
    },
    {
      id: 'notes',
      key: 'notes',
      title: t('tasks.tableHeaderNotes'),
      type: 'custom',
      component: NotesCell,
      grow: 2,
    },
    {
      id: 'assigned',
      key: 'assigned_to_id',
      title: 'المكلف',
      type: 'custom',
      component: AssignedCell,
      width: 120,
      grow: 0,
    },
    {
      id: 'status',
      key: 'status',
      title: t('tasks.tableHeaderStatus'),
      type: 'custom',
      component: StatusBadgeCell,
      width: 120,
      grow: 0,
    },
    {
      id: 'actions',
      key: 'id',
      title: t('tasks.tableHeaderActions'),
      type: 'custom',
      component: ActionsCell as React.ComponentType<CellProps<Task>>,
      width: 300,
      grow: 0,
    },
  ], [t]);

  // Add columnData to columns
  const columnsWithData = useMemo(() => {
    return columns.map(col => {
      if (col.id === 'service' || col.id === 'type' || col.id === 'status') {
        return { ...col, columnData: { t } };
      }
      if (col.id === 'assigned') {
        return { ...col, columnData: { getEmployeeName } };
      }
      if (col.id === 'actions') {
        return {
          ...col,
          columnData: {
            onEdit,
            onComplete,
            onViewAmountDetails,
            onDelete,
            onAssign,
            handleDefer,
            handleResume,
            handleRestore,
            handleApproveTask,
            handleRejectTask,
            openDrawer,
            openModal,
            isUserEmployee,
            shouldShowCompleteButton,
            canDeleteTasks,
          },
        };
      }
      return col;
    });
  }, [columns, t, getEmployeeName, onEdit, onComplete, onViewAmountDetails, onDelete, onAssign, canDeleteTasks, openModal]);

  return (
    <HuloolDataGrid
      data={sortedTasks}
      columns={columnsWithData as HuloolGridColumn<Task>[]}
      isLoading={isLoading}
      emptyMessage={t('common.noResults')}
      typeField="type"
      typeColors={DEFAULT_TYPE_COLORS}
      showId={false}
      height="auto"
      minHeight={400}
    />
  );
};

export default AllTasksTable;
