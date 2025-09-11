import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

/**
 * RoleBasedRedirect - Intelligently redirects users based on their role
 * 
 * Routing Logic:
 * - Admin only -> /dashboard
 * - Employee only -> /employee/dashboard  
 * - Both roles -> /dashboard (default to admin view, but can access both)
 * - No role -> /dashboard (fallback)
 */
const RoleBasedRedirect = () => {
  const userRole = useAuthStore((state) => state.userRole);
  
  switch (userRole) {
    case 'employee':
      return <Navigate to="/employee/dashboard" replace />;
    case 'admin':
    case 'both':
    default:
      return <Navigate to="/dashboard" replace />;
  }
};

export default RoleBasedRedirect;
