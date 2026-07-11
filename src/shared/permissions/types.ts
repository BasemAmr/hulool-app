export type Permission =
  | 'receivables:view-all'
  | 'receivables:view-paid'
  | 'receivables:view-overdue'
  | 'receivables:view-amounts'
  | 'receivables:any'
  | 'tasks:view-all'
  | 'tasks:delete-any'
  | 'tasks:edit-any'
  | 'employees:manage'
  | 'employees:recovery-codes'
  | 'employees:password-reset'
  | 'financial:view-center'
  | 'financial:view-company'
  | 'cashboxes:manage'
  | 'treasury:manage'
  | 'treasury:categories-manage'
  | 'system:admin'
  | 'media:upload'
  | 'pending:approve';

export type PermissionMap = Record<Permission, boolean>;

export type EmployeeType = 'admin' | 'employee_admin' | 'employee';
