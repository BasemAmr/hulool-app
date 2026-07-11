import type { Permission, EmployeeType } from './types';

type CapabilityMap = Record<string, Permission[]>;

const TYPE_PERMISSIONS: Record<EmployeeType, Permission[]> = {
  admin: [
    'receivables:view-all',
    'receivables:view-paid',
    'receivables:view-overdue',
    'receivables:view-amounts',
    'receivables:any',
    'tasks:view-all',
    'tasks:delete-any',
    'tasks:edit-any',
    'employees:manage',
    'employees:recovery-codes',
    'employees:password-reset',
    'financial:view-center',
    'financial:view-company',
    'cashboxes:manage',
    'treasury:manage',
    'treasury:categories-manage',
    'system:admin',
    'media:upload',
    'pending:approve',
  ],
  employee_admin: [
    'receivables:view-all',
    'receivables:view-paid',
    'receivables:view-overdue',
    'receivables:view-amounts',
    'receivables:any',
    'tasks:view-all',
    'employees:manage',
    'financial:view-center',
    'cashboxes:manage',
    'treasury:manage',
    'treasury:categories-manage',
    'pending:approve',
  ],
  employee: [
    'receivables:view-amounts',
    'media:upload',
  ],
};

const CAP_TO_PERMISSIONS: CapabilityMap = {
  manage_options: [
    'receivables:view-all',
    'receivables:view-paid',
    'receivables:view-overdue',
    'receivables:view-amounts',
    'receivables:any',
    'tasks:view-all',
    'tasks:delete-any',
    'tasks:edit-any',
    'employees:manage',
    'employees:recovery-codes',
    'employees:password-reset',
    'financial:view-center',
    'financial:view-company',
    'cashboxes:manage',
    'treasury:manage',
    'treasury:categories-manage',
    'system:admin',
    'pending:approve',
  ],
  tm_view_all_receivables: [
    'receivables:view-all',
    'receivables:any',
  ],
  tm_view_paid_receivables: [
    'receivables:view-paid',
    'receivables:any',
  ],
  tm_view_overdue_receivables: [
    'receivables:view-overdue',
    'receivables:any',
  ],
  tm_view_receivables_amounts: [
    'receivables:view-amounts',
  ],
  tm_delete_any_task: [
    'tasks:delete-any',
  ],
  tm_manage_users: [
    'employees:manage',
  ],
  upload_files: [
    'media:upload',
  ],
};

export function getPermissionsForType(type: EmployeeType | undefined): Permission[] {
  if (!type) return [];
  return TYPE_PERMISSIONS[type] ?? [];
}

export function getPermissionsForCap(cap: string): Permission[] {
  return CAP_TO_PERMISSIONS[cap] ?? [];
}

export function hasPermission(
  type: EmployeeType | undefined,
  capabilities: Record<string, boolean> | undefined,
  permission: Permission,
): boolean {
  const typePerms = getPermissionsForType(type);
  if (typePerms.includes(permission)) return true;

  if (capabilities) {
    for (const [cap, perms] of Object.entries(CAP_TO_PERMISSIONS)) {
      if (capabilities[cap] && perms.includes(permission)) return true;
    }
  }

  return false;
}
