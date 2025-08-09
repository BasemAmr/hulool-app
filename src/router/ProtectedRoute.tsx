import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const ProtectedRoute = () => {
  const status = useAuthStore((state) => state.status);

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

  // If authenticated, render the child route. Otherwise, redirect to login.
  return status === 'authenticated' ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;