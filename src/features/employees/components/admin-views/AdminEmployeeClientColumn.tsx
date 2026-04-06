// Admin view of employee client column
import { useState, useCallback } from 'react';
import { useGetAdminEmployeeDashboardClients } from '@/features/employees/api/employeeManagementQueries';
import { FloatingCardWrapper } from '@/shared/ui/layout/FloatingCardWrapper';
import { AdminEmployeeClientCard } from '@/shared/client-card';

interface AdminEmployeeClientColumnProps {
  employeeId: number;
}

const AdminEmployeeClientColumn = ({ employeeId }: AdminEmployeeClientColumnProps) => {
  // Fetch clients with active tasks for this employee
  const { data: clients = [], isLoading, error } = useGetAdminEmployeeDashboardClients(employeeId);
  const [dynamicWidths, setDynamicWidths] = useState<Record<string | number, string>>({});


  const handleWidthCalculated = useCallback((clientId: string | number, width: string) => {
    setDynamicWidths(prev => {
      // Only update if the width actually changed for this client
      if (prev[clientId] === width) {
        return prev;
      }
      return { ...prev, [clientId]: width };
    });
  }, []);

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-status-danger-bg border border-status-danger-border text-status-danger-text px-4 py-3 rounded" role="alert">
        Error loading clients: {error.message}
      </div>
    );
  }

  if (!clients || clients.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        لا توجد مهام نشطة لهذا الموظف
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      {clients.map((clientData, index) => (
        <FloatingCardWrapper 
          key={clientData.client.id}
          dynamicWidth={dynamicWidths[clientData.client.id]}
        >
          <AdminEmployeeClientCard
            data={clientData}
            onWidthCalculated={(width) => handleWidthCalculated(clientData.client.id, width)}
          />
        </FloatingCardWrapper>
      ))}
    </div>
  );
};

export default AdminEmployeeClientColumn;

