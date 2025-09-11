import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { applyPageBackground } from '../../utils/backgroundUtils';
import EmployeeOwnTasksTable from '../../components/employee/EmployeeOwnTasksTable';
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
        return { backgroundColor: 'rgba(74, 162, 255, 0.01)' }; // bright blue - increased opacity
      case 'RealEstate':
        return { backgroundColor: 'rgba(90, 175, 110, 0.1)' }; // bright green - increased opacity
      case 'Accounting':
        return { backgroundColor: 'rgba(248, 220, 61, 0.1)' }; // bright yellow - increased opacity
      default:
        return { backgroundColor: 'rgba(206, 208, 209, 0.1)' }; // bright grey - increased opacity
    }
  };

  // Helper function to get status badge style
  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'New':
        return { backgroundColor: 'rgba(255, 215, 0, 0.2)', color: '#B8860B', border: '1px dashed rgba(255, 215, 0, 0.3)' }; // bright faint gold
      case 'In Progress':
        return { backgroundColor: 'rgba(23, 162, 184, 0.2)', color: '#17A2B8', border: '1px dashed rgba(23, 162, 184, 0.3)' }; // bright faint blue
      case 'Deferred':
        return { backgroundColor: 'rgba(220, 53, 69, 0.2)', color: '#DC3545', border: '1px dashed rgba(220, 53, 69, 0.3)' }; // bright faint red
      case 'Completed':
        return { backgroundColor: 'rgba(40, 167, 69, 0.2)', color: '#28A745', border: '1px dashed rgba(40, 167, 69, 0.3)' }; // bright faint green
      default:
        return { backgroundColor: 'rgba(108, 117, 125, 0.2)', color: '#6C757D', border: '1px dashed rgba(108, 117, 125, 0.3)' };
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
  };

  return (
    <div className="container-fluid p-3">
      {/* Page Header with Filters in Same Row */}
      <div className="row mb-4">
        <div className="col-md-4">
          <div>
            <h1 className="h3 mb-1">مهامي</h1>
          </div>
        </div>
        <div className="col-md-4">
          <div className="input-group input-group-sm">
            <span className="input-group-text bg-light border-end-0">
              <Search size={16} className="text-muted" />
            </span>
            <input
              type="text"
              className="form-control border-start-0"
              placeholder="البحث في المهام..."
              value={searchTerm}
              onChange={handleSearchChange}
              style={{ 
                backgroundColor: 'transparent',
                fontSize: 'var(--font-size-sm)'
              }}
            />
          </div>
        </div>
        <div className="col-md-4">
          <div className="input-group input-group-sm">
            <span className="input-group-text bg-light border-end-0">
              <Filter size={16} className="text-muted" />
            </span>
            <select
              className="form-select border-start-0"
              value={statusFilter}
              onChange={handleStatusFilterChange}
              style={{ 
                backgroundColor: 'transparent',
                fontSize: 'var(--font-size-sm)'
              }}
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
      <div className="row">
        <div className="col-12">
          <EmployeeOwnTasksTable
            searchTerm={searchTerm}
            statusFilter={statusFilter}
            highlightTaskId={highlightTaskId || undefined}
            getTypeRowStyle={getTypeRowStyle}
            getStatusBadgeStyle={getStatusBadgeStyle}
          />
        </div>
      </div>
    </div>
  );
};

export default EmployeeTasksPage;
