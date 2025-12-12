import { createBrowserRouter, Navigate } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom'; // Import type for better clarity
import LoginPage from '../pages/LoginPage';
import ProtectedRoute from './ProtectedRoute';
import AdminRoute from './AdminRoute';
import EmployeeRoute from './EmployeeRoute';
import RoleBasedRedirect from './RoleBasedRedirect';
import PageWrapper from '../components/layout/PageWrapper';
import EmployeePageWrapper from '../components/layout/EmployeePageWrapper';
// Admin Pages
import AllClientsPage from '../pages/AllClientsPage';
import AllTasksPage from '../pages/AllTasksPage';
import ReceivablesPage from '../pages/ReceivablesPage';
import PaidReceivablesPage from '../pages/PaidReceivablesPage';
import OverdueReceivablesPage from '../pages/OverdueReceivablesPage';
import ClientProfilePage from '../pages/ClientProfilePage';
import DashboardPage from '../pages/DashboardPage';
import SettingsPage from '../pages/SettingsPage';
import TagsPage from '../pages/TagsPage';
import EmployeeManagementPage from '../pages/EmployeeManagementPage';
import EmployeeProfilePage from '../pages/EmployeeProfilePage';
// Financial Center Pages
import AccountsOverviewPage from '../pages/admin/AccountsOverviewPage';
import InvoicesHubPage from '../pages/admin/InvoicesHubPage';
import CompanyProfilePage from '../pages/admin/CompanyProfilePage';
// Employee Pages
import EmployeeDashboardPage from '../pages/employee/EmployeeDashboardPage';
import EmployeeTasksPage from '../pages/employee/EmployeeTasksPage';
import EmployeeClientsPage from '../pages/employee/EmployeeClientsPage';
import EmployeeFinancialsPage from '../pages/employee/EmployeeFinancialsPageRedesigned';
import EmployeeClientProfilePage from '../pages/employee/EmployeeClientProfilePage';
import EmployeeNotificationsPage from '../pages/employee/EmployeeNotificationsPage';
import EmployeeClientReceivablesPage from '../pages/employee/EmployeeClientReceivablesPage';
import PendingCommissionsPage from '@/pages/admin/PendingCommissionsPage';

const routes: RouteObject[] = [
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute />, // First layer of protection (checks auth status)
    children: [
      // Root redirect based on role
      { index: true, element: <RoleBasedRedirect /> },

      // Admin Routes
      {
        path: 'dashboard',
        element: <AdminRoute />, // Admin route guard
        children: [
          {
            element: <PageWrapper />, // Admin layout wrapper
            children: [
              { index: true, element: <DashboardPage /> },
            ],
          },
        ],
      },
      {
        path: 'clients',
        element: <AdminRoute />, // Admin route guard
        children: [
          {
            element: <PageWrapper />, // Admin layout wrapper
            children: [
              { index: true, element: <AllClientsPage /> },
              { path: ':id', element: <ClientProfilePage /> },
            ],
          },
        ],
      },
      {
        path: 'tasks',
        element: <AdminRoute />, // Admin route guard
        children: [
          {
            element: <PageWrapper />, // Admin layout wrapper
            children: [
              { index: true, element: <AllTasksPage /> },
            ],
          },
        ],
      },
      {
        path: 'tags',
        element: <AdminRoute />, // Admin route guard
        children: [
          {
            element: <PageWrapper />, // Admin layout wrapper
            children: [
              { index: true, element: <TagsPage /> },
            ],
          },
        ],
      },
      {
        path: 'employees',
        element: <AdminRoute />, // Admin route guard
        children: [
          {
            element: <PageWrapper />, // Admin layout wrapper
            children: [
              { index: true, element: <EmployeeManagementPage /> },
              { path: ':id/:mode?', element: <EmployeeProfilePage /> },
            ],
          },
        ],
      },
      {
        path: 'company',
        element: <AdminRoute />, // Admin route guard
        children: [
          {
            element: <PageWrapper />, // Admin layout wrapper
            children: [
              { path: ':id', element: <CompanyProfilePage /> },
            ],
          },
        ],
      },
      {
        path: 'settings',
        element: <AdminRoute />, // Admin route guard
        children: [
          {
            element: <PageWrapper />, // Admin layout wrapper
            children: [
              { index: true, element: <SettingsPage /> },
            ],
          },
        ],
      },
      {
        path: 'receivables',
        element: <AdminRoute />, // Admin route guard
        children: [
          {
            element: <PageWrapper />, // Admin layout wrapper
            children: [
              { index: true, element: <ReceivablesPage /> },
              { path: 'paid', element: <PaidReceivablesPage /> },
              { path: 'overdue', element: <OverdueReceivablesPage /> },
            ],
          },
        ],
      },
      // Financial Center Routes
      {
        path: 'financial-center',
        element: <AdminRoute />, // Admin route guard
        children: [
          {
            element: <PageWrapper />, // Admin layout wrapper
            children: [
              { index: true, element: <Navigate to="accounts" replace /> },
              { path: 'accounts', element: <AccountsOverviewPage /> },
              { path: 'pending', element: <PendingCommissionsPage /> },
              { path: 'invoices', element: <InvoicesHubPage /> },
            ],
          },
        ],
      },

      // Employee Routes (new)
      {
        path: 'employee',
        element: <EmployeeRoute />, // Employee-specific route guard
        children: [
          {
            element: <EmployeePageWrapper />, // Employee layout wrapper
            children: [
              { index: true, element: <Navigate to="dashboard" replace /> },
              { path: 'dashboard', element: <EmployeeDashboardPage /> },
              { path: 'tasks', element: <EmployeeTasksPage /> },
              { path: 'clients', element: <EmployeeClientsPage /> },
              { path: 'clients/:id', element: <EmployeeClientProfilePage /> },
              { path: 'receivables', element: <EmployeeClientReceivablesPage /> },
              { path: 'financials', element: <EmployeeFinancialsPage /> },
              { path: 'notifications', element: <EmployeeNotificationsPage /> },
            ],
          },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);