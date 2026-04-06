import { createBrowserRouter, Navigate } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import LoginPage from '@/features/auth/pages/LoginPage';
import ProtectedRoute from './ProtectedRoute';
import AdminRoute from './AdminRoute';
import EmployeeRoute from './EmployeeRoute';
import RoleBasedRedirect from './RoleBasedRedirect';
import AdminLayout from '@/layouts/admin/AdminLayout';
import EmployeeLayout from '@/layouts/employee/EmployeeLayout';
import AllClientsPage from '@/features/clients/pages/AllClientsPage';
import AllTasksPage from '@/features/tasks/pages/AllTasksPage';
import ReceivablesPage from '@/features/receivables/pages/ReceivablesPage';
import PaidReceivablesPage from '@/features/receivables/pages/PaidReceivablesPage';
import OverdueReceivablesPage from '@/features/receivables/pages/OverdueReceivablesPage';
import ClientProfilePage from '@/features/clients/pages/ClientProfilePage';
import DashboardPage from '@/features/dashboard/pages/DashboardPage';
import SettingsPage from '@/features/settings/pages/SettingsPage';
import TagsPage from '@/features/tags/pages/TagsPage';
import EmployeeManagementPage from '@/features/employees/pages/admin/EmployeeManagementPage';
import EmployeeProfilePage from '@/features/employees/pages/admin/EmployeeProfilePage';
import AccountsOverviewPage from '@/features/financials/pages/AccountsOverviewPage';
import InvoicesHubPage from '@/features/invoices/pages/InvoicesHubPage';
import CompanyProfilePage from '@/features/financials/pages/CompanyProfilePage';
import PendingCommissionsPage from '@/features/financials/pages/PendingCommissionsPage';
import EmployeeDashboardPage from '@/features/employee-dashboard/pages/EmployeeDashboardPage';
import EmployeeTasksPage from '@/features/tasks/pages/EmployeeTasksPage';
import EmployeeClientsPage from '@/features/employees/pages/employee/EmployeeClientsPage';
import EmployeeFinancialsPage from '@/features/employees/pages/employee/EmployeeFinancialsPage';
import EmployeeClientProfilePage from '@/features/employees/pages/employee/EmployeeClientProfilePage';
import EmployeeNotificationsPage from '@/features/employees/pages/employee/EmployeeNotificationsPage';
import EmployeeClientReceivablesPage from '@/features/employees/pages/employee/EmployeeClientReceivablesPage';
import EmployeeSettingsPage from '@/features/employees/pages/employee/EmployeeSettingsPage';

const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      { index: true, element: <RoleBasedRedirect /> },
      {
        path: 'dashboard', element: <AdminRoute />,
        children: [{ element: <AdminLayout />, children: [{ index: true, element: <DashboardPage /> }] }],
      },
      {
        path: 'clients', element: <AdminRoute />,
        children: [{ element: <AdminLayout />, children: [
          { index: true, element: <AllClientsPage /> },
          { path: ':id', element: <ClientProfilePage /> },
        ] }],
      },
      {
        path: 'tasks', element: <AdminRoute />,
        children: [{ element: <AdminLayout />, children: [{ index: true, element: <AllTasksPage /> }] }],
      },
      {
        path: 'tags', element: <AdminRoute />,
        children: [{ element: <AdminLayout />, children: [{ index: true, element: <TagsPage /> }] }],
      },
      {
        path: 'employees', element: <AdminRoute />,
        children: [{ element: <AdminLayout />, children: [
          { index: true, element: <EmployeeManagementPage /> },
          { path: ':id/:mode?', element: <EmployeeProfilePage /> },
        ] }],
      },
      {
        path: 'company', element: <AdminRoute />,
        children: [{ element: <AdminLayout />, children: [{ path: ':id', element: <CompanyProfilePage /> }] }],
      },
      {
        path: 'settings', element: <AdminRoute />,
        children: [{ element: <AdminLayout />, children: [{ index: true, element: <SettingsPage /> }] }],
      },
      {
        path: 'receivables', element: <AdminRoute />,
        children: [{ element: <AdminLayout />, children: [
          { index: true, element: <ReceivablesPage /> },
          { path: 'paid', element: <PaidReceivablesPage /> },
          { path: 'overdue', element: <OverdueReceivablesPage /> },
        ] }],
      },
      {
        path: 'financial-center', element: <AdminRoute />,
        children: [{ element: <AdminLayout />, children: [
          { index: true, element: <Navigate to="accounts" replace /> },
          { path: 'accounts', element: <AccountsOverviewPage /> },
          { path: 'pending', element: <PendingCommissionsPage /> },
          { path: 'invoices', element: <InvoicesHubPage /> },
        ] }],
      },
      {
        path: 'employee', element: <EmployeeRoute />,
        children: [{ element: <EmployeeLayout />, children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard', element: <EmployeeDashboardPage /> },
          { path: 'tasks', element: <EmployeeTasksPage /> },
          { path: 'clients', element: <EmployeeClientsPage /> },
          { path: 'clients/:id', element: <EmployeeClientProfilePage /> },
          { path: 'receivables', element: <EmployeeClientReceivablesPage /> },
          { path: 'financials', element: <EmployeeFinancialsPage /> },
          { path: 'settings', element: <EmployeeSettingsPage /> },
          { path: 'notifications', element: <EmployeeNotificationsPage /> },
        ] }],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
