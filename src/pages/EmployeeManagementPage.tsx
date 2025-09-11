import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, Briefcase, UserMinus, Eye } from 'lucide-react';
import Button from '../components/ui/Button';
import { useUsers } from '../queries/userQueries';
import { useCreateEmployee, useRemoveEmployeeStatus } from '../queries/employeeQueries';
import { useToast } from '../hooks/useToast';
import { useCurrentUserCapabilities } from '../queries/userQueries';
import type { User } from '../api/types';

const EmployeeManagementPage = () => {
  const navigate = useNavigate();
  const { success, error } = useToast();
  
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { data: users = [], isLoading: usersLoading, refetch } = useUsers();
  const { data: currentCapabilities } = useCurrentUserCapabilities();
  const createEmployeeMutation = useCreateEmployee();
  const removeEmployeeStatusMutation = useRemoveEmployeeStatus();

  // Check if current user can manage users
  const canManageUsers = currentCapabilities?.tm_manage_users || currentCapabilities?.manage_options || false;

  // Filter users based on search
  const filteredUsers = users.filter((user) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      user.display_name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.username?.toLowerCase().includes(searchLower)
    );
  });

  // Employee status is directly available in the user object
  const isEmployee = (user: User) => user.employee_id !== null;

  const handleToggleEmployeeStatus = async (user: User) => {
    if (!canManageUsers) {
      error('You do not have permission to manage employees');
      return;
    }

    setIsLoading(true);
    try {
      if (isEmployee(user)) {
        // Remove employee status
        await removeEmployeeStatusMutation.mutateAsync(user.id);
        success(`${user.display_name} has been removed as an employee`);
      } else {
        // Add employee status
        await createEmployeeMutation.mutateAsync({
          user_id: user.id,
          commission_rate: 20.00 // Default commission rate
        });
        success(`${user.display_name} has been added as an employee`);
      }
      await refetch();
    } catch (err: any) {
      error(err.message || 'Failed to update employee status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewEmployee = (user: User) => {
    if (isEmployee(user)) {
      navigate(`/employees/${user.employee_id}`);
    }
  };

  if (usersLoading) {
    return <div className="p-4 text-center">Loading users...</div>;
  }

  if (!canManageUsers) {
    return (
      <div className="alert alert-warning text-center">
        <h4>Access Denied</h4>
        <p>You don't have permission to manage employees.</p>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <header className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h1 className="h4 mb-0">
            <Users className="me-2" size={20} />
            إدارة الموظفين
          </h1>
        </div>
      </header>

      {/* Search */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="col-md-6">
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="البحث عن المستخدمين..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <small className="text-muted">
          {filteredUsers.filter(isEmployee).length} موظف من {filteredUsers.length} مستخدم
        </small>
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="bg-light">
                <tr>
                  <th>المستخدم</th>
                  <th>الإيميل</th>
                  <th>الصلاحية</th>
                  <th className="text-center">حالة الموظف</th>
                  <th className="text-center">نسبة العمولة</th>
                  <th className="text-end">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="d-flex align-items-center">
                        <div className="flex-shrink-0 me-3">
                          <div className="avatar-sm bg-primary text-white rounded-circle d-flex align-items-center justify-content-center">
                            <Users size={16} />
                          </div>
                        </div>
                        <div>
                          <div className="fw-medium">{user.display_name}</div>
                          <small className="text-muted">@{user.username}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="text-muted">{user.email}</span>
                    </td>
                    <td>
                      <span className="badge bg-secondary">{user.roles?.[0] || 'subscriber'}</span>
                    </td>
                    <td className="text-center">
                      {isEmployee(user) ? (
                        <span className="badge bg-success">
                          <Briefcase size={12} className="me-1" />
                          Employee
                        </span>
                      ) : (
                        <span className="badge bg-light text-dark">User</span>
                      )}
                    </td>
                    <td className="text-center">
                      {isEmployee(user) ? (
                        <span className="text-muted">{user.commission_rate || 20}%</span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="text-end">
                      <div className="btn-group" role="group">
                        {isEmployee(user) && (
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handleViewEmployee(user)}
                            title="View Employee Profile"
                          >
                            <Eye size={14} />
                          </Button>
                        )}
                        <Button
                          variant={isEmployee(user) ? "outline-danger" : "outline-success"}
                          size="sm"
                          isLoading={isLoading}
                          onClick={() => handleToggleEmployeeStatus(user)}
                          title={isEmployee(user) ? "Remove Employee Status" : "Make Employee"}
                        >
                          {isEmployee(user) ? (
                            <>
                              <UserMinus size={14} className="me-1" />
                              Remove
                            </>
                          ) : (
                            <>
                              <UserPlus size={14} className="me-1" />
                              Add
                            </>
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredUsers.length === 0 && (
              <div className="p-4 text-center text-muted">
                {search ? 'No users found matching your search.' : 'No users available.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeManagementPage;
