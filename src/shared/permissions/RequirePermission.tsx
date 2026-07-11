import type { ReactNode } from 'react';
import { usePermission } from './usePermission';
import type { Permission } from './types';

interface Props {
  permission: Permission;
  fallback?: ReactNode;
  children: ReactNode;
}

export function RequirePermission({ permission, fallback = null, children }: Props) {
  const { can, isLoading } = usePermission();

  if (isLoading) return null;
  if (!can(permission)) return fallback;

  return <>{children}</>;
}

interface RequireTypeProps {
  types: Array<'admin' | 'employee_admin' | 'employee'>;
  fallback?: ReactNode;
  children: ReactNode;
}

export function RequireType({ types, fallback = null, children }: RequireTypeProps) {
  const { userType } = usePermission();

  if (!userType || !types.includes(userType)) return fallback;

  return <>{children}</>;
}
