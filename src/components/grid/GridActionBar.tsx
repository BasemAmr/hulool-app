/**
 * GridActionBar - Reusable action bar for grid tables
 * 
 * Provides a clean separation of actions from table data:
 * - Primary actions (add, edit, etc.)
 * - Row-specific actions rendered inline or in dropdown
 * - Batch actions for selected rows
 */

import React from 'react';
import Button from '../ui/Button';
import {
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  MessageSquare,
  UserPlus,
  CheckCircle,
  Pause,
  Play,
  RotateCcw,
  ClipboardCheck,
  FileText,
  DollarSign,
  CreditCard,
  X,
  MoreVertical,
  Ban,
} from 'lucide-react';

// ================================
// TYPE DEFINITIONS
// ================================

export type ActionType =
  | 'add'
  | 'edit'
  | 'delete'
  | 'view'
  | 'whatsapp'
  | 'googleDrive'
  | 'message'
  | 'assign'
  | 'complete'
  | 'defer'
  | 'resume'
  | 'restore'
  | 'review'
  | 'requirements'
  | 'payment'
  | 'viewAmount'
  | 'cancel'
  | 'reject'
  | 'custom';

export interface GridAction<T = any> {
  type: ActionType;
  label?: string;
  icon?: React.ReactNode;
  onClick: (item: T, index?: number) => void;
  disabled?: boolean | ((item: T) => boolean);
  hidden?: boolean | ((item: T) => boolean);
  variant?: 'primary' | 'secondary' | 'danger' | 'outline-primary' | 'outline-secondary';
  title?: string;
  className?: string;
}

interface GridActionBarProps<T> {
  item: T;
  index: number;
  actions: GridAction<T>[];
  compact?: boolean;
  direction?: 'horizontal' | 'vertical';
}

// ================================
// ACTION ICONS MAP
// ================================

const ACTION_ICONS: Record<ActionType, React.ReactNode> = {
  add: <Plus size={16} />,
  edit: <Edit size={16} />,
  delete: <Trash2 size={16} />,
  view: <ExternalLink size={16} />,
  whatsapp: <MessageSquare size={16} />,
  googleDrive: <ExternalLink size={16} />,
  message: <MessageSquare size={16} />,
  assign: <UserPlus size={16} />,
  complete: <CheckCircle size={16} />,
  defer: <Pause size={16} />,
  resume: <Play size={16} />,
  restore: <RotateCcw size={16} />,
  review: <ClipboardCheck size={16} />,
  requirements: <FileText size={16} />,
  payment: <CreditCard size={16} />,
  viewAmount: <DollarSign size={16} />,
  cancel: <X size={16} />,
  reject: <Ban size={16} />,
  custom: <MoreVertical size={16} />,
};

// ================================
// ACTION VARIANTS
// ================================

const ACTION_VARIANTS: Partial<Record<ActionType, 'primary' | 'secondary' | 'danger' | 'outline-primary' | 'outline-secondary'>> = {
  add: 'primary',
  edit: 'outline-primary',
  delete: 'danger',
  complete: 'primary',
  defer: 'outline-secondary',
  resume: 'outline-primary',
  payment: 'primary',
  cancel: 'danger',
  reject: 'danger',
};

// ================================
// MAIN COMPONENT
// ================================

function GridActionBar<T>({
  item,
  index,
  actions,
  compact = true,
  direction = 'horizontal',
}: GridActionBarProps<T>) {

  const visibleActions = actions.filter(action => {
    if (typeof action.hidden === 'function') {
      return !action.hidden(item);
    }
    return !action.hidden;
  });

  if (!visibleActions.length) return null;

  return (
    <div
      className={`grid-action-bar ${direction === 'vertical' ? 'flex-col' : 'flex-row'}`}
      style={{
        display: 'flex',
        flexDirection: direction === 'vertical' ? 'column' : 'row',
        gap: compact ? '4px' : '8px',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        alignItems: 'center',
      }}
    >
      {visibleActions.map((action, actionIndex) => {
        const isDisabled = typeof action.disabled === 'function'
          ? action.disabled(item)
          : action.disabled;

        const icon = action.icon || ACTION_ICONS[action.type];
        const variant = action.variant || ACTION_VARIANTS[action.type] || 'outline-primary';

        const handleClick = (e: React.MouseEvent) => {
          // CRITICAL: Stop all propagation to prevent grid from capturing
          e.stopPropagation();
          e.preventDefault();
          e.nativeEvent.stopImmediatePropagation?.();

          // Execute action
          action.onClick(item, index);
        };

        return (
          <Button
            key={`${action.type}-${actionIndex}`}
            variant={variant}
            size="sm"
            onClick={handleClick}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            disabled={isDisabled}
            title={action.title || action.label}
            className={`p-1.5 ${action.className || ''}`}
            style={{
              pointerEvents: 'auto',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
            }}
          >
            {icon}
            {!compact && action.label && (
              <span className="mr-1">{action.label}</span>
            )}
          </Button>
        );
      })}
    </div>
  );
}

// ================================
// ACTION CELL COMPONENT
// ================================

export interface ActionCellProps<T> {
  rowData: T;
  rowIndex: number;
  actions: GridAction<T>[];
  compact?: boolean;
}

export function ActionCell<T>({ rowData, rowIndex, actions, compact = true }: ActionCellProps<T>) {
  const handleContainerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };

  const handleContainerMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        padding: '4px 0',
        pointerEvents: 'auto',
      }}
      onClick={handleContainerClick}
      onMouseDown={handleContainerMouseDown}
      onTouchStart={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      <GridActionBar
        item={rowData}
        index={rowIndex}
        actions={actions}
        compact={compact}
      />
    </div>
  );
}

// ================================
// HELPER: CREATE ACTION
// ================================

export function createAction<T>(
  type: ActionType,
  onClick: (item: T, index?: number) => void,
  options?: Partial<GridAction<T>>
): GridAction<T> {
  return {
    type,
    onClick,
    ...options,
  };
}

// ================================
// HELPER: COMMON ACTIONS
// ================================

export function createEditAction<T>(onClick: (item: T) => void): GridAction<T> {
  return createAction('edit', onClick, { title: 'تعديل' });
}

export function createDeleteAction<T>(onClick: (item: T) => void): GridAction<T> {
  return createAction('delete', onClick, { title: 'حذف', variant: 'danger' });
}

export function createViewAction<T>(onClick: (item: T) => void): GridAction<T> {
  return createAction('view', onClick, { title: 'عرض' });
}

export function createAddTaskAction<T>(onClick: (item: T) => void): GridAction<T> {
  return createAction('add', onClick, { title: 'إضافة مهمة', icon: <Plus size={16} /> });
}

export function createAddInvoiceAction<T>(onClick: (item: T) => void): GridAction<T> {
  return createAction('add', onClick, { title: 'إضافة فاتورة', icon: <Plus size={16} /> });
}

export function createWhatsAppAction<T extends { phone?: string }>(getPhone?: (item: T) => string): GridAction<T> {
  return createAction('whatsapp', (item) => {
    const phone = getPhone ? getPhone(item) : item.phone;
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '');
      const formattedPhone = cleanPhone.startsWith('0') ? `966${cleanPhone.substring(1)}` : `966${cleanPhone}`;
      window.open(`https://wa.me/${formattedPhone}`, '_blank');
    }
  }, {
    title: 'واتساب',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
      </svg>
    ),
  });
}

export function createGoogleDriveAction<T>(getLink: (item: T) => string | undefined): GridAction<T> {
  return createAction('googleDrive', (item) => {
    const link = getLink(item);
    if (link) {
      window.open(link, '_blank');
    }
  }, {
    title: 'Google Drive',
    hidden: (item) => {
      const link = getLink(item);
      return !link;
    },
  });
}

export function createPaymentAction<T>(onClick: (item: T) => void): GridAction<T> {
  return createAction('payment', onClick, {
    title: 'دفع',
    label: 'دفع',
    variant: 'primary',
  });
}

export function createCompleteAction<T>(onClick: (item: T) => void): GridAction<T> {
  return createAction('complete', onClick, {
    title: 'إكمال',
    variant: 'primary',
    className: 'bg-green-600 hover:bg-green-700 border-green-600',
  });
}

export function createDeferAction<T>(onClick: (item: T) => void): GridAction<T> {
  return createAction('defer', onClick, {
    title: 'تأجيل',
    className: 'bg-yellow-400 hover:bg-yellow-500 border-yellow-400 text-black',
  });
}

export function createResumeAction<T>(onClick: (item: T) => void): GridAction<T> {
  return createAction('resume', onClick, {
    title: 'استئناف',
    className: 'bg-cyan-500 hover:bg-cyan-600 border-cyan-500 text-white',
  });
}

export function createRestoreAction<T>(onClick: (item: T) => void): GridAction<T> {
  return createAction('restore', onClick, {
    title: 'استعادة',
    className: 'bg-green-700 hover:bg-green-800 border-green-700 text-white',
  });
}

export function createReviewAction<T>(onClick: (item: T) => void): GridAction<T> {
  return createAction('review', onClick, {
    title: 'مراجعة',
    className: 'bg-orange-500 hover:bg-orange-600 border-orange-500 text-white',
  });
}

export function createAssignAction<T>(onClick: (item: T) => void): GridAction<T> {
  return createAction('assign', onClick, { title: 'تكليف موظف' });
}

export function createMessageAction<T>(onClick: (item: T) => void): GridAction<T> {
  return createAction('message', onClick, { title: 'المراسلات' });
}

export function createRequirementsAction<T>(onClick: (item: T) => void): GridAction<T> {
  return createAction('requirements', onClick, {
    title: 'المتطلبات',
    className: 'border-cyan-500 text-cyan-500 hover:bg-cyan-50',
  });
}

export function createViewAmountAction<T>(onClick: (item: T) => void): GridAction<T> {
  return createAction('viewAmount', onClick, {
    title: 'تفاصيل المبلغ',
    className: 'border-cyan-500 text-cyan-500 hover:bg-cyan-50',
  });
}

export default GridActionBar;

