import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const ProtectedRoute = () => {
  const status = useAuthStore((state) => state.status);

  // On initial load, status is 'idle'. We can show a loading spinner here.
//   if (status === 'idle') {
//     // Or a full-page loader component
//     return <div>Loading...</div>; 
//   }

  // If authenticated, render the child route. Otherwise, redirect to login.
  return status === 'authenticated' ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;