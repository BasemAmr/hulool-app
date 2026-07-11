import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';

/**
 * RoleBasedRedirect - Intelligently redirects users based on tm_employees.type
 * 
 * Routing Logic:
 * - type = 'admin' -> /dashboard
 * - type = 'employee_admin' -> /dashboard (can also access employee routes)
 * - type = 'employee' -> /employee/dashboard (or /employee/onboarding if PIN not set)
 * - No employee record -> /dashboard (fallback)
 */
const RoleBasedRedirect = () => {
  const userRole = useAuthStore((state) => state.userRole);
  const user = useAuthStore((state) => state.user);
  
  // Enforce PIN setup for all employees who haven't set one yet
  const needsPinSetup = !user?.pin_set;
  
  switch (userRole) {
    case 'employee':
      // Redirect to onboarding if PIN hasn't been set yet
      if (needsPinSetup) {
        return <Navigate to="/employee/onboarding" replace />;
      }
      return <Navigate to="/employee/dashboard" replace />;
    case 'admin':
    case 'both':
    default:
      return <Navigate to="/dashboard" replace />;
  }
};

export default RoleBasedRedirect;
