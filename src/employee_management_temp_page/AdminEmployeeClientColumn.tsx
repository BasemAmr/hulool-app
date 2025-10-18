// Admin view of employee client column
import AdminEmployeeDashboardClientCard from './AdminEmployeeDashboardClientCard';
import { useGetAdminEmployeeDashboardClients } from './employeeManagementQueries';

interface AdminEmployeeClientColumnProps {
  employeeId: number;
}

const AdminEmployeeClientColumn = ({ employeeId }: AdminEmployeeClientColumnProps) => {
  // Fetch clients with active tasks for this employee
  const { data: clients = [], isLoading, error } = useGetAdminEmployeeDashboardClients(employeeId);

  // Color palette for alternating backgrounds
  const alternatingColors = [
    '#e3f2fd', // Light blue
    '#bbdefb', // Slightly darker light blue
    '#fff8e1', // Light yellow
    '#ffecb3', // Slightly darker light yellow
    '#e8f5e8', // Light green
    '#c8e6c9', // Slightly darker light green
    '#f8f9fa', // Light gray
    '#e9ecef', // Slightly darker light gray
  ];

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <div className="spinner-border spinner-border-sm" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        Error loading clients: {error.message}
      </div>
    );
  }

  if (!clients || clients.length === 0) {
    return (
      <div className="p-4 text-center text-muted">
        لا توجد مهام نشطة لهذا الموظف
      </div>
    );
  }

  return (
    <div className="d-flex flex-column gap-3 p-3">
      {clients.map((clientData, index) => (
        <AdminEmployeeDashboardClientCard
          key={clientData.client.id}
          data={clientData}
          index={index}
          alternatingColors={alternatingColors}
        />
      ))}
    </div>
  );
};

export default AdminEmployeeClientColumn;
