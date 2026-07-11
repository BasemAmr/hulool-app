import { useCurrentUserCapabilities } from '@/features/employees/api/userQueries';
import { useAuthStore } from '@/features/auth/store/authStore';
import { hasPermission } from '@/shared/permissions/permissionDefinitions';

/**
 * Custom hook to check user permissions for receivables-related actions.
 * Checks both employee type (admin/employee_admin) and granular capabilities.
 */
export const useReceivablesPermissions = () => {
  const userType = useAuthStore((state) => state.user?.type);
  const { data: capabilities, isLoading } = useCurrentUserCapabilities();

  const isAdmin = userType === 'admin' || capabilities?.manage_options || false;

  const hasViewAmountsPermission = isAdmin
    || userType === 'employee_admin'
    || capabilities?.tm_view_receivables_amounts || false;

  const hasViewPaidReceivablesPermission = isAdmin
    || userType === 'employee_admin'
    || hasPermission(userType, capabilities, 'receivables:view-paid');

  const hasViewOverdueReceivablesPermission = isAdmin
    || userType === 'employee_admin'
    || hasPermission(userType, capabilities, 'receivables:view-overdue');

  const hasViewAllReceivablesPermission = isAdmin
    || userType === 'employee_admin'
    || hasPermission(userType, capabilities, 'receivables:view-all');

  return {
    isLoading,
    hasViewAmountsPermission,
    hasViewPaidReceivablesPermission,
    hasViewOverdueReceivablesPermission,
    hasViewAllReceivablesPermission,
    hasAnyReceivablesPermission: hasViewAllReceivablesPermission || hasViewPaidReceivablesPermission || hasViewOverdueReceivablesPermission,
  };
};
