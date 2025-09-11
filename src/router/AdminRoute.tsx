import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

/**
 * AdminRoute - Route guard for admin-specific pages
 * 
 * Redirects employee-only users to the employee dashboard.
 * Allows admin-only and users with both roles to access admin routes.
 */
const AdminRoute = () => {
  const status = useAuthStore((state) => state.status);
  const userRole = useAuthStore((state) => state.userRole);



  // On initial load, status is 'idle'. Show loading while auth state is being restored.
  if (status === 'idle') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  // If employee-only user, redirect to employee dashboard
  if (userRole === 'employee') {
    return <Navigate to="/employee/dashboard" replace />;
  }

  // Allow admin and both roles to access admin routes
  return <Outlet />;
};

export default AdminRoute;
