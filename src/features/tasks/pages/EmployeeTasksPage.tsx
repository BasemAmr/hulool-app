import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { applyPageBackground } from '@/shared/utils/backgroundUtils';
import EmployeeOwnTasksTable from '@/features/tasks/components/tables/EmployeeOwnTasksTable';
import { Search, Filter } from 'lucide-react';

/**
 * EmployeeTasksPage - Page for employees to view and manage their own tasks
 * 
 * Features:
 * - View own tasks with pagination
 * - Search and filter tasks
 * - Submit tasks for review
 * - Edit task details
 * - View requirements and amount details
 */
const EmployeeTasksPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchParams] = useSearchParams();
  
  // Get highlight parameter from URL
  const highlightTaskId = searchParams.get('highlight');

  useEffect(() => {
    applyPageBackground('employee-tasks');
  }, []);

  // Helper function to get type background color
  const getTypeRowStyle = (type: string) => {
    switch (type) {
      case 'Government':
        return { backgroundColor: 'color-mix(in srgb, var(--primitive-brand-500) 8%, var(--token-bg-page))' };
      case 'RealEstate':
        return { backgroundColor: 'color-mix(in srgb, var(--primitive-green-600) 10%, var(--token-bg-page))' };
      case 'Accounting':
        return { backgroundColor: 'color-mix(in srgb, var(--primitive-amber-600) 10%, var(--token-bg-page))' };
      default:
        return { backgroundColor: 'color-mix(in srgb, var(--primitive-gray-500) 10%, var(--token-bg-page))' };
    }
  };

  // Helper function to get status badge style
  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'New':
        return {
          backgroundColor: 'color-mix(in srgb, var(--primitive-brand-500) 18%, var(--token-bg-page))',
          color: 'var(--token-text-brand)',
          border: '1px dashed color-mix(in srgb, var(--primitive-brand-500) 35%, var(--token-border-default))',
        };
      case 'In Progress':
        return {
          backgroundColor: 'color-mix(in srgb, var(--primitive-brand-500) 18%, var(--token-bg-page))',
          color: 'var(--token-text-brand)',
          border: '1px dashed color-mix(in srgb, var(--primitive-brand-500) 35%, var(--token-border-default))',
        };
      case 'Deferred':
        return {
          backgroundColor: 'color-mix(in srgb, var(--primitive-red-600) 18%, var(--token-bg-page))',
          color: 'var(--token-status-danger-text)',
          border: '1px dashed color-mix(in srgb, var(--primitive-red-600) 35%, var(--token-border-default))',
        };
      case 'Completed':
        return {
          backgroundColor: 'color-mix(in srgb, var(--primitive-green-600) 18%, var(--token-bg-page))',
          color: 'var(--token-status-success-text)',
          border: '1px dashed color-mix(in srgb, var(--primitive-green-600) 35%, var(--token-border-default))',
        };
      default:
        return {
          backgroundColor: 'color-mix(in srgb, var(--primitive-gray-600) 16%, var(--token-bg-page))',
          color: 'var(--token-text-primary)',
          border: '1px dashed color-mix(in srgb, var(--primitive-gray-600) 30%, var(--token-border-default))',
        };
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
  };

  return (
    <div className="w-full p-3">
      {/* Page Header with Filters in Same Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <h1 className="text-xl font-bold mb-1 text-text-primary">مهامي</h1>
        </div>
        <div>
          <div className="flex items-center border border-border rounded-md overflow-hidden">
            <span className="px-3 py-2 bg-background border-r border-border">
              <Search size={16} className="text-text-primary" />
            </span>
            <input
              type="text"
              className="flex-1 px-3 py-2 text-sm border-0 focus:outline-none focus:ring-0"
              placeholder="البحث في المهام..."
              value={searchTerm}
              onChange={handleSearchChange}
              style={{ backgroundColor: 'transparent' }}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center border border-border rounded-md overflow-hidden">
            <span className="px-3 py-2 bg-background border-r border-border">
              <Filter size={16} className="text-text-primary" />
            </span>
            <select
              className="flex-1 px-3 py-2 text-sm border-0 focus:outline-none focus:ring-0"
              value={statusFilter}
              onChange={handleStatusFilterChange}
              style={{ backgroundColor: 'transparent' }}
            >
              <option value="">جميع الحالات</option>
              <option value="New">جديد</option>
              <option value="In Progress">قيد العمل</option>
              <option value="Pending Review">في المراجعة</option>
              <option value="Completed">مكتمل</option>
              <option value="Deferred">مؤجل</option>
              <option value="Cancelled">ملغي</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tasks Table */}
      <div>
        <EmployeeOwnTasksTable
          searchTerm={searchTerm}
          statusFilter={statusFilter}
          highlightTaskId={highlightTaskId || undefined}
          getTypeRowStyle={getTypeRowStyle}
          getStatusBadgeStyle={getStatusBadgeStyle}
        />
      </div>
    </div>
  );
};

export default EmployeeTasksPage;
