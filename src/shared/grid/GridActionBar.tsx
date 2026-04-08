/**
 * GridActionBar - Reusable action bar for grid tables
 *
 * Design principle: All action icons use a single neutral ghost style.
 * Only destructive actions (delete, cancel, reject) use muted red.
 * No rainbow — the eye rests on the data, not the controls.
 */

import React from 'react';
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
import { cn } from '@/shared/utils/cn';

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
  /** Override auto-detected style. 'destructive' = muted red. 'neutral' = gray ghost (default). */
  style?: 'neutral' | 'destructive';
  title?: string;
  className?: string;
  // Legacy prop — ignored, style is now auto-detected from type
  variant?: string;
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
  add: <Plus size={14} />,
  edit: <Edit size={14} />,
  delete: <Trash2 size={14} />,
  view: <ExternalLink size={14} />,
  whatsapp: <MessageSquare size={14} />,
  googleDrive: <ExternalLink size={14} />,
  message: <MessageSquare size={14} />,
  assign: <UserPlus size={14} />,
  complete: <CheckCircle size={14} />,
  defer: <Pause size={14} />,
  resume: <Play size={14} />,
  restore: <RotateCcw size={14} />,
  review: <ClipboardCheck size={14} />,
  requirements: <FileText size={14} />,
  payment: <CreditCard size={14} />,
  viewAmount: <DollarSign size={14} />,
  cancel: <X size={14} />,
  reject: <Ban size={14} />,
  custom: <MoreVertical size={14} />,
};

// Destructive actions get muted red. Everything else gets neutral gray.
const DESTRUCTIVE_TYPES = new Set<ActionType>(['delete', 'cancel', 'reject']);

// ================================
// BUTTON STYLES
// ================================

/**
 * Neutral ghost base — shared padding/layout for action buttons.
 * The icon itself inherits the gray foreground and turns darker on hover.
 */
const NEUTRAL_CLASS =
  'inline-flex items-center justify-center rounded p-1.5 ' +
  'text-text-secondary hover:text-text-primary ' +
  'transition-colors duration-150 ' +
  'disabled:opacity-40 disabled:cursor-not-allowed';

/**
 * Destructive actions keep the same shape but use red on hover.
 */
const DESTRUCTIVE_CLASS =
  'inline-flex items-center justify-center rounded p-1.5 ' +
  'text-text-secondary hover:text-text-danger ' +
  'transition-colors duration-150 ' +
  'disabled:opacity-40 disabled:cursor-not-allowed';

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
    if (typeof action.hidden === 'function') return !action.hidden(item);
    return !action.hidden;
  });

  if (!visibleActions.length) return null;

  return (
    <div
      className={`grid-action-bar ${direction === 'vertical' ? 'flex-col' : 'flex-row'}`}
      style={{
        display: 'flex',
        flexDirection: direction === 'vertical' ? 'column' : 'row',
        gap: compact ? '2px' : '6px',
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

        // Determine style: explicit override > type-based detection
        const isDestructive =
          action.style === 'destructive' ||
          (action.style !== 'neutral' && DESTRUCTIVE_TYPES.has(action.type));

        const baseClass = isDestructive ? DESTRUCTIVE_CLASS : NEUTRAL_CLASS;

        const handleClick = (e: React.MouseEvent) => {
          e.stopPropagation();
          e.preventDefault();
          e.nativeEvent.stopImmediatePropagation?.();
          action.onClick(item, index);
        };

        return (
          <button
            key={`${action.type}-${actionIndex}`}
            type="button"
            onClick={handleClick}
            onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
            onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); }}
            disabled={isDisabled}
            title={action.title || action.label}
            className={cn(baseClass, action.className)}
            style={{
              pointerEvents: 'auto',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
            }}
          >
            {icon}
            {!compact && action.label && (
              <span className="mr-1 text-xs">{action.label}</span>
            )}
          </button>
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
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
      onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
      onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); }}
    >
      <GridActionBar item={rowData} index={rowIndex} actions={actions} compact={compact} />
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
  return { type, onClick, ...options };
}

// ================================
// HELPER: COMMON ACTIONS
// All helpers now rely on the auto-detected style from type.
// No per-action saturated className overrides.
// ================================

export function createEditAction<T>(onClick: (item: T) => void): GridAction<T> {
  return createAction('edit', onClick, { title: 'تعديل' });
}

export function createDeleteAction<T>(onClick: (item: T) => void): GridAction<T> {
  return createAction('delete', onClick, { title: 'حذف' });
}

export function createViewAction<T>(onClick: (item: T) => void): GridAction<T> {
  return createAction('view', onClick, { title: 'عرض' });
}

export function createAddTaskAction<T>(onClick: (item: T) => void): GridAction<T> {
  return createAction('add', onClick, { title: 'إضافة مهمة', icon: <Plus size={14} /> });
}

export function createAddInvoiceAction<T>(onClick: (item: T) => void): GridAction<T> {
  return createAction('add', onClick, { title: 'إضافة فاتورة', icon: <Plus size={14} /> });
}

export function createWhatsAppAction<T extends { phone?: string }>(
  getPhone?: (item: T) => string
): GridAction<T> {
  return createAction(
    'whatsapp',
    (item) => {
      const phone = getPhone ? getPhone(item) : item.phone;
      if (phone) {
        const cleanPhone = phone.replace(/\D/g, '');
        const formattedPhone = cleanPhone.startsWith('0')
          ? `966${cleanPhone.substring(1)}`
          : `966${cleanPhone}`;
        window.open(`https://wa.me/${formattedPhone}`, '_blank');
      }
    },
    {
      title: 'واتساب',
      // WhatsApp brand icon — uses var(--color-whatsapp)
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--color-whatsapp)">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>
      ),
    }
  );
}

export function createGoogleDriveAction<T>(getLink: (item: T) => string | undefined): GridAction<T> {
  return createAction(
    'googleDrive',
    (item) => {
      const link = getLink(item);
      if (link) window.open(link, '_blank');
    },
    {
      title: 'Google Drive',
      hidden: (item) => !getLink(item),
    }
  );
}

export function createPaymentAction<T>(onClick: (item: T) => void): GridAction<T> {
  return createAction('payment', onClick, { title: 'دفع', label: 'دفع' });
}

export function createCompleteAction<T>(onClick: (item: T) => void): GridAction<T> {
  return createAction('complete', onClick, { title: 'إكمال' });
}

export function createDeferAction<T>(onClick: (item: T) => void): GridAction<T> {
  return createAction('defer', onClick, { title: 'تأجيل' });
}

export function createResumeAction<T>(onClick: (item: T) => void): GridAction<T> {
  return createAction('resume', onClick, { title: 'استئناف' });
}

export function createRestoreAction<T>(onClick: (item: T) => void): GridAction<T> {
  return createAction('restore', onClick, { title: 'استعادة' });
}

export function createReviewAction<T>(onClick: (item: T) => void): GridAction<T> {
  return createAction('review', onClick, { title: 'مراجعة' });
}

export function createAssignAction<T>(onClick: (item: T) => void): GridAction<T> {
  return createAction('assign', onClick, { title: 'تكليف موظف' });
}

export function createMessageAction<T>(onClick: (item: T) => void): GridAction<T> {
  return createAction('message', onClick, { title: 'المراسلات' });
}

export function createRequirementsAction<T>(onClick: (item: T) => void): GridAction<T> {
  return createAction('requirements', onClick, { title: 'المتطلبات' });
}

export function createViewAmountAction<T>(onClick: (item: T) => void): GridAction<T> {
  return createAction('viewAmount', onClick, { title: 'تفاصيل المبلغ' });
}

export default GridActionBar;
