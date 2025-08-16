import { createBrowserRouter, Navigate } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom'; // Import type for better clarity
import LoginPage from '../pages/LoginPage';
import ProtectedRoute from './ProtectedRoute';
import PageWrapper from '../components/layout/PageWrapper';
// import DashboardPage from '../pages/DashboardPage'; // Assuming this exists from previous phase
import AllClientsPage from '../pages/AllClientsPage';
import AllTasksPage from '../pages/AllTasksPage'; // Import the new page
import ReceivablesPage from '../pages/ReceivablesPage';
import PaidReceivablesPage from '../pages/PaidReceivablesPage';
import OverdueReceivablesPage from '../pages/OverdueReceivablesPage';
import ClientProfilePage from '../pages/ClientProfilePage';
import DashboardPage from '../pages/DashboardPage';
import SettingsPage from '../pages/SettingsPage'; // Import the new settings page
import TagsPage from '../pages/TagsPage'; // Import tags page

// Placeholder for the client profile page - will be fully built in Phase 6/7
const routes: RouteObject[] = [
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute />, // First layer of protection (checks auth status)
    children: [
      {
        element: <PageWrapper />, // Second layer for layout (sidebar + content)
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'clients', element: <AllClientsPage /> },
          { path: 'tasks', element: <AllTasksPage /> }, // ADD THIS
          { path: 'clients/:id', element: <ClientProfilePage /> }, // ADD THIS
          { path: 'tags', element: <TagsPage /> }, // ADD TAGS PAGE
          { path: 'settings', element: <SettingsPage /> }, // ADD SETTINGS PAGE
          {
            path: 'receivables',
            element: <ReceivablesPage />,
          },
          {
            path: 'receivables/paid',
            element: <PaidReceivablesPage />,
          },
          {
            path: 'receivables/overdue',
            element: <OverdueReceivablesPage />,
          },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);