import { useCurrentUserCapabilities } from '../queries/userQueries';

/**
 * Custom hook to check user permissions for receivables-related actions
 */
export const useReceivablesPermissions = () => {
  const { data: capabilities, isLoading } = useCurrentUserCapabilities();

  // Admin users (with manage_options) bypass all restrictions
  const isAdmin = capabilities?.manage_options || false;
  
  const hasViewAmountsPermission = isAdmin || capabilities?.tm_view_receivables_amounts || false;
  const hasViewPaidReceivablesPermission = isAdmin || capabilities?.tm_view_paid_receivables || false;
  const hasViewOverdueReceivablesPermission = isAdmin || capabilities?.tm_view_overdue_receivables || false;
  const hasViewAllReceivablesPermission = isAdmin || capabilities?.tm_view_all_receivables || false;

  return {
    isLoading,
    hasViewAmountsPermission,
    hasViewPaidReceivablesPermission,
    hasViewOverdueReceivablesPermission,
    hasViewAllReceivablesPermission,
    // Combined permission - user can view receivables if they have any of the view permissions
    hasAnyReceivablesPermission: hasViewAllReceivablesPermission || hasViewPaidReceivablesPermission || hasViewOverdueReceivablesPermission,
  };
};
