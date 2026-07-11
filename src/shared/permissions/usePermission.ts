import { useMemo } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useCurrentUserCapabilities } from '@/features/employees/api/userQueries';
import { hasPermission, getPermissionsForType } from './permissionDefinitions';
import type { Permission, PermissionMap, EmployeeType } from './types';

export function usePermission() {
  const user = useAuthStore((state) => state.user);
  const { data: capabilities, isLoading: capsLoading } = useCurrentUserCapabilities();

  const userType = user?.type as EmployeeType | undefined;

  const can = (permission: Permission): boolean => {
    return hasPermission(userType, capabilities, permission);
  };

  const allPermissions = useMemo((): PermissionMap => {
    const perms = getPermissionsForType(userType) ?? [];
    const map = {} as PermissionMap;

    const allKeys: Permission[] = [
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
    ];

    for (const p of allKeys) {
      (map as any)[p] = hasPermission(userType, capabilities, p);
    }

    return map;
  }, [userType, capabilities]);

  return {
    can,
    allPermissions,
    isLoading: capsLoading,
    userType,
  };
}
