// Base Client Card Types - Unified type definitions for all client card variations

import type { Task, Client } from '../../../api/types';

/**
 * User role determines which actions and features are available
 */
export type UserRole = 'admin' | 'employee';

/**
 * Context where the card is being rendered - affects styling and available actions
 */
export type CardContext = 
  | 'admin-dashboard'      // Main admin dashboard with task type columns
  | 'admin-employee-filter' // Admin dashboard filtered by employee
  | 'admin-employee-profile' // Admin viewing employee profile
  | 'employee-dashboard';   // Employee's own dashboard

/**
 * Actions available for tasks based on role and context
 */
export interface TaskActions {
  onComplete?: (task: Task) => void;
  onDefer?: (task: Task) => void;
  onResume?: (task: Task) => void;
  onCancel?: (task: Task) => void;
  onRestore?: (task: Task) => void;
  onSubmitForReview?: (task: Task) => void;
  onShowRequirements?: (task: Task) => void;
  onViewSubtasks?: (task: Task) => void;
  onOpenFollowUp?: (task: Task) => void;
  onToggleUrgent?: (task: Task) => void;
  onAssign?: (task: Task) => void;
}

/**
 * Actions available for client header based on role and context
 */
export interface ClientActions {
  onAddTask?: (client: Client) => void;
  onAddInvoice?: (client: Client) => void;
  onRecordCredit?: (client: Client) => void;
}

/**
 * Color scheme configuration for alternating colors
 */
export interface ColorScheme {
  headerColor: string;
  borderColor: string;
  row1Color: string;
  row2Color: string;
}

/**
 * Base color palette for task types
 */
export interface TaskTypeColorConfig {
  primaryColor: string;
  alternatingColors: [string, string];
}

/**
 * Client stats for dashboard views
 */
export interface ClientStats {
  new_tasks_count: number;
  deferred_tasks_count: number;
  completed_tasks_count: number;
  total_outstanding: number;
}

/**
 * Client data with tasks (and optional stats for dashboard views)
 */
export interface ClientWithTasks {
  client: Client;
  tasks: Task[];
  stats?: ClientStats;
}

/**
 * Main props for BaseClientCard
 */
export interface BaseClientCardProps {
  data: ClientWithTasks;
  role: UserRole;
  context: CardContext;
  
  // Styling
  index?: number;
  alternatingColors?: string[];
  
  // Actions - will be filtered based on role/context
  taskActions?: TaskActions;
  clientActions?: ClientActions;
  
  // Dynamic width calculation for hover expansion
  onWidthCalculated?: (width: string) => void;
  
  // Optional overrides
  showAmount?: boolean;
  showEmployeePrefix?: boolean;
  compactMode?: boolean;
}

/**
 * Props for task row component
 */
export interface TaskRowProps {
  task: Task;
  index: number;
  role: UserRole;
  context: CardContext;
  backgroundColor: string;
  actions: TaskActions;
  showAmount?: boolean;
  showEmployeePrefix?: boolean;
  employeeName?: string;
}

/**
 * Props for card header component
 */
export interface CardHeaderProps {
  client: Client;
  isUrgent: boolean;
  headerColor: string;
  role: UserRole;
  context: CardContext;
  actions: ClientActions;
}

/**
 * Props for action dropdown component
 */
export interface ActionDropdownProps {
  task: Task;
  role: UserRole;
  context: CardContext;
  actions: TaskActions;
  isEmployeeTask?: boolean;
}

/**
 * Column configuration for task table
 */
export interface TableColumnConfig {
  id: string;
  label: string;
  className?: string;
  show?: (context: CardContext) => boolean;
}

/**
 * Default column configurations
 */
export const DEFAULT_COLUMNS: TableColumnConfig[] = [
  { id: 'task', label: 'المهمة' },
  { id: 'date', label: 'تاريخ' },
  { id: 'days', label: 'اليوم' },
  { id: 'amount', label: 'المبلغ', show: (ctx) => ctx !== 'employee-dashboard' },
  { id: 'status', label: 'الحالة', show: (ctx) => ctx === 'admin-employee-profile' || ctx === 'admin-employee-filter' },
  { id: 'actions', label: 'إجراءات', className: 'w-20 min-w-[80px]' },
];

/**
 * Admin-only columns (shown for employees in admin context)
 */
export const ADMIN_EMPLOYEE_COLUMNS: TableColumnConfig[] = [
  { id: 'task', label: 'الخدمة' },
  { id: 'type', label: 'النوع' },
  { id: 'status', label: 'الحالة' },
  { id: 'days', label: 'الوقت' },
  { id: 'actions', label: 'الإجراءات', className: 'w-20 min-w-[80px]' },
];
