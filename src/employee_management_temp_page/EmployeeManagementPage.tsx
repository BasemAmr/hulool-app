import React from 'react';
import { useParams } from 'react-router-dom';
import { useGetEmployee } from '../queries/employeeQueries';
import AdminEmployeeClientColumn from './AdminEmployeeClientColumn';
import AdminEmployeeTasksTable from './AdminEmployeeTasksTable';

const EmployeeManagementPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const employeeId = parseInt(id || '0', 10);
  
  const { data: employee, isLoading, error: employeeError } = useGetEmployee(employeeId);

  if (isLoading) {
    return <div className="p-4 text-center">Loading employee...</div>;
  }

  if (employeeError || !employee) {
    return (
      <div className="alert alert-danger text-center">
        <h4>Employee Not Found</h4>
        <p>The requested employee could not be found.</p>
      </div>
    );
  }

  return (
    <div className="row g-3">
      {/* Left column: Client cards */}
      <div className="col-lg-4">
        <div className="card shadow-sm">
          <div className="card-header bg-primary text-white">
            <h6 className="mb-0">Clients with Active Tasks</h6>
          </div>
          <div className="card-body p-0" style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
            <AdminEmployeeClientColumn employeeId={employeeId} />
          </div>
        </div>
      </div>

      {/* Right column: Tasks table with filters */}
      <div className="col-lg-8">
        <div className="card shadow-sm">
          <div className="card-header bg-primary text-white">
            <h6 className="mb-0">All Employee Tasks</h6>
          </div>
          <div className="card-body p-0">
            <AdminEmployeeTasksTable employeeId={employeeId} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeManagementPage;
