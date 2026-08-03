import React, { useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import HuloolDataGrid, { type HuloolGridColumn, type CellProps } from '@/shared/grid/HuloolDataGrid';
import GridActionBar from '@/shared/grid/GridActionBar';
import type { GridAction } from '@/shared/grid/GridActionBar';
import { useSubmitTaskForReview, useGetEmployeeOwnTasks } from '@/features/tasks/api/employeeTasksQueries';
import { useModalStore } from '@/shared/stores/modalStore';
import { useDrawerStore } from '@/shared/stores/drawerStore';
import { useToast } from '@/shared/hooks/useToast';
import { translateTaskType } from '@/shared/constants/taskTypes';
import type { Task } from '@/api/types';
import WhatsAppIcon from '@/shared/ui/icons/WhatsAppIcon';
import { sendWhatsAppMessage } from '@/shared/utils/whatsappUtils';
import {
  Eye,
  Edit2,
  CheckCircle,
  MessageSquare,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface EmployeeOwnTasksTableProps {
  tasks?: Task[];
  isLoading?: boolean;
  pagination?: {
    total: number;
    per_page: number;
    current_page: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
  onPageChange?: (page: number) => void;
  onEdit?: (task: Task) => void;
  clientId?: number;
  searchTerm?: string;
  statusFilter?: string;
}

// ----------------------------------------------------
// Helper Functions for Dynamic CSS Cell Class Matching
// ----------------------------------------------------

const getTaskTypeCellClass = (type: string | undefined | null): string => {
  const t = String(type || '').trim().toLowerCase();

  if (t === 'government' || t === 'حكومية' || t === 'حكومي') {
    return 'task-type-government-cell';
  }
  if (t === 'realestate' || t === 'real_estate' || t === 'عقارية' || t === 'عقاري') {
    return 'task-type-realestate-cell';
  }
  if (t === 'accounting' || t === 'محاسبية' || t === 'محاسبي') {
    return 'task-type-accounting-cell';
  }
  return 'task-type-general-cell';
};

const getTaskStatusCellClass = (status: string | undefined | null): string => {
  const s = String(status || '').trim().toLowerCase();

  if (s === 'new' || s === 'جديد' || s === 'جديدة') {
    return 'task-status-new-cell';
  }
  if (s === 'in progress' || s === 'in_progress' || s === 'قيد العمل' || s === 'قيد التنفيذ') {
    return 'task-status-progress-cell';
  }
  if (s === 'pending review' || s === 'pending_review' || s === 'في المراجعة') {
    return 'task-status-pending-cell';
  }
  if (s === 'completed' || s === 'مكتمل' || s === 'مكتملة') {
    return 'task-status-completed-cell';
  }
  if (s === 'deferred' || s === 'مؤجل' || s === 'مؤجلة') {
    return 'task-status-deferred-cell';
  }
  if (s === 'cancelled' || s === 'ملغي' || s === 'ملغاة') {
    return 'task-status-cancelled-cell';
  }
  return 'task-status-new-cell';
};

// ----------------------------------------------------
// Custom Cell Components for HuloolDataGrid
// ----------------------------------------------------

// 1. Client Link Cell
const ClientLinkCell = React.memo(({ rowData }: CellProps<Task>) => {
  const clientName = rowData.client?.name || 'عميل غير محدد';
  const clientId = rowData.client_id;

  return (
    <div className="flex items-center min-w-0" style={{ fontSize: '0.95rem', fontWeight: 700 }}>
      {clientId ? (
        <Link
          to={`/employee/clients/${clientId}`}
          className="text-primary hover:underline truncate"
          title={clientName}
        >
          {clientName}
        </Link>
      ) : (
        <span className="text-text-primary truncate" title={clientName}>
          {clientName}
        </span>
      )}
    </div>
  );
});
ClientLinkCell.displayName = 'ClientLinkCell';

// 2. Phone WhatsApp Cell — 1.25x bigger bold font size
const PhoneWhatsAppCell = React.memo(({ rowData }: CellProps<Task>) => {
  const phone = rowData.client?.phone;

  if (!phone) {
    return <span className="text-text-secondary text-xs">—</span>;
  }

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    sendWhatsAppMessage(phone, '');
  };

  return (
    <div
      className="flex items-center gap-1.5 cursor-pointer group"
      onClick={handleWhatsApp}
      style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--token-text-primary)' }}
    >
      <WhatsAppIcon size={16} className="text-emerald-600 flex-shrink-0 group-hover:scale-110 transition-transform" />
      <span className="font-mono dir-ltr group-hover:text-primary transition-colors">{phone}</span>
    </div>
  );
});
PhoneWhatsAppCell.displayName = 'PhoneWhatsAppCell';

// 3. Service / Task Name Cell — Bigger font size
const ServiceCell = React.memo(({ rowData }: CellProps<Task>) => {
  const { t } = useTranslation();
  const taskName = rowData.task_name || t(`type.${rowData.type}`);

  return (
    <div className="truncate min-w-0" style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--token-text-primary)' }} title={taskName}>
      {taskName}
    </div>
  );
});
ServiceCell.displayName = 'ServiceCell';

// 4. Notes Cell — Compact width
const NotesCell = React.memo(({ rowData }: CellProps<Task>) => {
  const notes = rowData.notes;

  return (
    <div
      className="text-xs text-text-secondary truncate"
      style={{ maxWidth: '140px' }}
      title={notes || ''}
    >
      {notes || '—'}
    </div>
  );
});
NotesCell.displayName = 'NotesCell';

// 5. Actions Cell
const ActionsCell = React.memo(({ rowData: task, rowIndex }: CellProps<Task>) => {
  const { openModal } = useModalStore();
  const { openDrawer } = useDrawerStore();
  const submitForReviewMutation = useSubmitTaskForReview();
  const { success, error } = useToast();

  const actions: GridAction<Task>[] = [
    // Follow up messages
    {
      type: 'message',
      onClick: () => openDrawer('taskFollowUp', {
        taskId: task.id,
        taskName: task.task_name || undefined,
        clientName: task.client?.name || 'عميل غير محدد',
      }),
      title: 'المراسلات',
      icon: <MessageSquare size={14} />,
      variant: 'outline-secondary',
    },
    // View Subtasks
    {
      type: 'custom',
      onClick: () => openModal('subtasksModal', { task }),
      title: 'المهام الفرعية',
      icon: <Eye size={14} />,
      variant: 'outline-info',
    },
  ];

  // Submit for Review
  if (task.status === 'New' || task.status === 'Deferred') {
    actions.push({
      type: 'custom',
      onClick: () => {
        submitForReviewMutation.mutate(task.id, {
          onSuccess: () => {
            success('تم الإرسال', `تم إرسال المهمة "${task.task_name || 'مهمة'}" للمراجعة بنجاح`);
          },
          onError: (err: any) => {
            error('خطأ', err.message || 'فشل إرسال المهمة للمراجعة');
          }
        });
      },
      title: 'إرسال للمراجعة',
      icon: <CheckCircle size={14} className="text-emerald-600" />,
      variant: 'outline-success',
    });
  }

  // Edit task
  actions.push({
    type: 'edit',
    onClick: () => openModal('taskForm', { taskToEdit: task }),
    title: 'تعديل المهمة',
    icon: <Edit2 size={14} />,
  });

  return (
    <div className="flex items-center justify-start h-full">
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

// ----------------------------------------------------
// MAIN TABLE COMPONENT
// ----------------------------------------------------

export const EmployeeOwnTasksTable: React.FC<EmployeeOwnTasksTableProps> = ({
  tasks: tasksFromProps,
  isLoading: isLoadingFromProps,
  pagination: paginationFromProps,
  onPageChange,
  clientId,
  searchTerm,
  statusFilter,
}) => {
  const { t } = useTranslation();
  const [internalPage, setInternalPage] = React.useState(1);

  // Check if props passed data directly (e.g. from EmployeeTasksPage)
  const isDirectMode = tasksFromProps !== undefined;

  // Fallback query for embedded usage (e.g. in EmployeeClientProfilePage)
  const fallbackQuery = useGetEmployeeOwnTasks({
    client_id: clientId,
    search: searchTerm,
    status: statusFilter,
    page: internalPage,
  });

  const tasks = isDirectMode ? (tasksFromProps || []) : (fallbackQuery.data?.tasks || []);
  const isLoading = isDirectMode ? (isLoadingFromProps || false) : fallbackQuery.isLoading;
  const pagination = isDirectMode ? paginationFromProps : fallbackQuery.data?.pagination;

  const handlePageChange = (newPage: number) => {
    if (isDirectMode && onPageChange) {
      onPageChange(newPage);
    } else {
      setInternalPage(newPage);
    }
  };

  // Column definitions for HuloolDataGrid (NO 'assigned' column!)
  const columns = useMemo((): HuloolGridColumn<Task>[] => [
    {
      id: 'client',
      key: 'client.name',
      title: 'العميل',
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
      title: 'اسم الخدمة / المهمة',
      type: 'custom',
      component: ServiceCell,
      grow: 2,
    },
    {
      id: 'type',
      key: 'type',
      title: 'النوع',
      width: 120,
      grow: 0,
      cellClassName: ({ rowData }) => getTaskTypeCellClass(rowData.type),
      formatter: (_val: string, rowData: Task) => translateTaskType(rowData.type),
    },
    {
      id: 'notes',
      key: 'notes',
      title: 'الملاحظات',
      type: 'custom',
      component: NotesCell,
      width: 140,
      grow: 0,
    },
    {
      id: 'status',
      key: 'status',
      title: 'الحالة',
      width: 130,
      grow: 0,
      cellClassName: ({ rowData }) => getTaskStatusCellClass(rowData.status),
      formatter: (_val: string, rowData: Task) => {
        const s = rowData.status;
        const translated = t(`status.${s}`);
        return translated !== `status.${s}` ? translated : (s || 'جديد');
      },
    },
    {
      id: 'actions',
      key: 'id',
      title: 'الإجراءات',
      type: 'custom',
      component: ActionsCell as React.ComponentType<CellProps<Task>>,
      width: 220,
      grow: 0,
    },
  ], [t]);

  return (
    <div className="space-y-3">
      {/* HuloolDataGrid Container */}
      <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
        <HuloolDataGrid
          data={tasks}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="لا توجد مهام مطابقة للشروط"
          height="auto"
          minHeight={350}
        />
      </div>

      {/* Offset Pagination Controls Bar */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 bg-card border border-border rounded-lg text-xs">
          <div className="text-text-secondary font-medium">
            عرض الصفحة <span className="font-bold text-text-primary">{pagination.current_page}</span> من <span className="font-bold text-text-primary">{pagination.total_pages}</span> (إجمالي {pagination.total} مهمة)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(pagination.current_page - 1)}
              disabled={!pagination.has_prev || isLoading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-border bg-background text-text-primary hover:bg-muted font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={14} />
              <span>السابق</span>
            </button>

            <span className="px-2 font-bold text-primary">
              {pagination.current_page} / {pagination.total_pages}
            </span>

            <button
              onClick={() => handlePageChange(pagination.current_page + 1)}
              disabled={!pagination.has_next || isLoading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-border bg-background text-text-primary hover:bg-muted font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <span>التالي</span>
              <ChevronLeft size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeOwnTasksTable;
