import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { applyPageBackground } from '@/shared/utils/backgroundUtils';
import EmployeeOwnTasksTable from '@/features/tasks/components/tables/EmployeeOwnTasksTable';
import { useGetEmployeeOwnTasks } from '@/features/tasks/api/employeeTasksQueries';
import { Search, Filter, Layers, Plus } from 'lucide-react';
import { useModalStore } from '@/shared/stores/modalStore';
import Button from '@/shared/ui/primitives/Button';

/**
 * EmployeeTasksPage - Page for employees to view and manage their own tasks
 * 
 * Features:
 * - HuloolDataGrid table representation with full cell background styles
 * - Offset Pagination (page, per_page, total count)
 * - Server-side search & filtering by status and task type
 * - Quick actions for task management
 */
const EmployeeTasksPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const [searchParams] = useSearchParams();
  const { openModal } = useModalStore();

  useEffect(() => {
    applyPageBackground('employee-tasks');
  }, []);

  // Server-side query for employee tasks with offset pagination & filters
  const { data, isLoading } = useGetEmployeeOwnTasks({
    page,
    per_page: perPage,
    search: searchTerm,
    status: statusFilter,
    type: typeFilter,
  });

  const tasks = data?.tasks || [];
  const pagination = data?.pagination;

  // Filter change handlers (resets page to 1)
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  const handleTypeFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTypeFilter(e.target.value);
    setPage(1);
  };

  return (
    <div className="w-full p-4 space-y-4">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary m-0">مهامي</h1>
          <p className="text-xs text-text-secondary m-0">إدارة ومتابعة المهام المسندة</p>
        </div>

        <Button
          variant="primary"
          size="sm"
          className="gap-1.5 font-bold"
          onClick={() => openModal('taskForm', {})}
        >
          <Plus size={16} />
          <span>إضافة مهمة جديدة</span>
        </Button>
      </div>

      {/* Server-Side Filtering Bar (Search, Status Filter, Type Filter) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-card border border-border rounded-xl shadow-xs">
        {/* Search Input */}
        <div className="flex items-center border border-border rounded-lg overflow-hidden bg-background">
          <span className="px-3 py-2 border-l border-border text-text-secondary">
            <Search size={16} />
          </span>
          <input
            type="text"
            className="flex-1 px-3 py-2 text-sm text-text-primary bg-transparent focus:outline-none placeholder:text-text-muted font-medium"
            placeholder="البحث في المهمة، العميل، رقم الجوال..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center border border-border rounded-lg overflow-hidden bg-background">
          <span className="px-3 py-2 border-l border-border text-text-secondary">
            <Filter size={16} />
          </span>
          <select
            className="flex-1 px-3 py-2 text-sm text-text-primary bg-transparent focus:outline-none cursor-pointer font-bold"
            value={statusFilter}
            onChange={handleStatusFilterChange}
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

        {/* Type Filter */}
        <div className="flex items-center border border-border rounded-lg overflow-hidden bg-background">
          <span className="px-3 py-2 border-l border-border text-text-secondary">
            <Layers size={16} />
          </span>
          <select
            className="flex-1 px-3 py-2 text-sm text-text-primary bg-transparent focus:outline-none cursor-pointer font-bold"
            value={typeFilter}
            onChange={handleTypeFilterChange}
          >
            <option value="">جميع الأنواع</option>
            <option value="Government">حكومية</option>
            <option value="RealEstate">عقارية</option>
            <option value="Accounting">محاسبية</option>
            <option value="General">عامة</option>
          </select>
        </div>
      </div>

      {/* Tasks Table with Offset Pagination */}
      <EmployeeOwnTasksTable
        tasks={tasks}
        isLoading={isLoading}
        pagination={pagination}
        onPageChange={setPage}
      />
    </div>
  );
};

export default EmployeeTasksPage;
