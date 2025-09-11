import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

/**
 * EmployeeRoute - Route guard for employee-specific pages
 * 
 * Ensures that only users with employee access can view employee routes.
 * Redirects admin-only users to the admin dashboard.
 * Allows users with both admin and employee roles to access employee routes.
 */
const EmployeeRoute = () => {
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

  // If authenticated but not an employee, redirect to admin dashboard
  if (userRole === 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  // Allow employee and both roles to access employee routes
  return <Outlet />;
};

export default EmployeeRoute;
