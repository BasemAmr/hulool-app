import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, Briefcase, UserMinus, Eye } from 'lucide-react';
import Button from '../components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { useUsers } from '../queries/userQueries';
import { useCreateEmployee, useRemoveEmployeeStatus } from '../queries/employeeQueries';
import { useToast } from '../hooks/useToast';
import { useCurrentUserCapabilities } from '../queries/userQueries';
import type { User } from '../api/types';
import { TOAST_MESSAGES } from '../constants/toastMessages';

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
      error(TOAST_MESSAGES.PERMISSION_DENIED);
      return;
    }

    setIsLoading(true);
    try {
      if (isEmployee(user)) {
        // Remove employee status
        await removeEmployeeStatusMutation.mutateAsync(user.id);
        success(TOAST_MESSAGES.EMPLOYEE_DELETED);
      } else {
        // Add employee status
        await createEmployeeMutation.mutateAsync({
          user_id: user.id,
          commission_rate: 20.00 // Default commission rate
        });
        success(TOAST_MESSAGES.EMPLOYEE_CREATED);
      }
      await refetch();
    } catch (err: any) {
      error(TOAST_MESSAGES.OPERATION_FAILED, err.message || 'فشل تحديث حالة الموظف');
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
      <div className="rounded-lg border border-yellow-500 bg-yellow-500/10 p-6 text-center">
        <h4 className="text-lg font-semibold text-black mb-2">Access Denied</h4>
        <p className="text-black">You don't have permission to manage employees.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <header className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Users className="text-primary" size={24} />
          <h1 className="text-2xl font-bold text-black">
            إدارة الموظفين
          </h1>
        </div>
      </header>

      {/* Search */}
      <div className="flex justify-between items-center mb-4">
        <div className="w-full md:w-1/2">
          <input
            type="text"
            className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="البحث عن المستخدمين..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <small className="text-black">
          {filteredUsers.filter(isEmployee).length} موظف من {filteredUsers.length} مستخدم
        </small>
      </div>

      {/* Users Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-black">المستخدم</TableHead>
                <TableHead className="text-black">الإيميل</TableHead>
                <TableHead className="text-black">الصلاحية</TableHead>
                <TableHead className="text-center text-black">حالة الموظف</TableHead>
                <TableHead className="text-center text-black">نسبة العمولة</TableHead>
                <TableHead className="text-right text-black">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center">
                          <Users size={16} />
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-black">{user.display_name}</div>
                        <small className="text-black">@{user.username}</small>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-black">{user.email}</span>
                  </TableCell>
                  <TableCell>
                    <span className="px-2.5 py-1 rounded-full bg-gray-500 text-white text-xs">
                      {user.roles?.[0] || 'subscriber'}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {isEmployee(user) ? (
                      <span className="px-2.5 py-1 rounded-full bg-green-600 text-white text-xs inline-flex items-center gap-1">
                        <Briefcase size={12} />
                        Employee
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-gray-200 text-black text-xs">User</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {isEmployee(user) ? (
                      <span className="text-black">{user.commission_rate || 20}%</span>
                    ) : (
                      <span className="text-black">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-2">
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
                            <UserMinus size={14} className="mr-1" />
                            Remove
                          </>
                        ) : (
                          <>
                            <UserPlus size={14} className="mr-1" />
                            Add
                          </>
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredUsers.length === 0 && (
            <div className="p-4 text-center text-black">
              {search ? 'No users found matching your search.' : 'No users available.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeManagementPage;
