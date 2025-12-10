// BaseClientCard - Unified export

export { default as BaseClientCard } from './BaseClientCard';
export { default as SortableBaseClientCard } from './SortableBaseClientCard';
export { default as CardColumnContainer } from './CardColumnContainer';
export { default as CardHeader } from './CardHeader';
export { default as TaskRow } from './TaskRow';
export { default as TaskActionDropdown } from './TaskActionDropdown';
export { default as ClientHeaderDropdown } from './ClientHeaderDropdown';

// Pre-configured wrappers for specific use cases
export {
  AdminDashboardClientCard,
  EmployeeDashboardClientCard,
  AdminEmployeeClientCard,
} from './wrappers';

// Hook
export { default as useClientCardActions } from './useClientCardActions';

// Types
export type {
  UserRole,
  CardContext,
  TaskActions,
  ClientActions,
  ColorScheme,
  ClientWithTasks,
  BaseClientCardProps,
  TaskRowProps,
  CardHeaderProps,
  ActionDropdownProps,
} from './types';

// Utilities
export {
  hexToRgba,
  calculateColorScheme,
  getRowBackground,
  TASK_TYPE_COLORS,
  URGENT_COLORS,
  DEFAULT_ALTERNATING_COLORS,
} from './colorUtils';

export { formatDaysElapsed, formatShortDate } from './dateUtils';

export {
  getAvailableActions,
  getCompleteButtonLabel,
  getAssignButtonLabel,
  isTaskAssignedToEmployee,
} from './actionUtils';
