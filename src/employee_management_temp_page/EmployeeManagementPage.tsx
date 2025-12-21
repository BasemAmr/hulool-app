import React from 'react';
import { useParams } from 'react-router-dom';
import { useGetEmployee } from '../queries/employeeQueries';
import AdminEmployeeClientColumn from './AdminEmployeeClientColumn';
import AdminEmployeeTasksTable from './AdminEmployeeTasksTable';
import { Card, CardHeader, CardContent } from '../components/ui/card';

const EmployeeManagementPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const employeeId = parseInt(id || '0', 10);
  
  const { data: employee, isLoading, error: employeeError } = useGetEmployee(employeeId);

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-muted-foreground">جاري تحميل الموظف...</p>
      </div>
    );
  }

  if (employeeError || !employee) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-center">
        <h4 className="font-bold">الموظف غير موجود</h4>
        <p>لم يتم العثور على الموظف المطلوب.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Left column: Client cards */}
      <div className="lg:col-span-4">
        <Card className="shadow-sm">
          <CardHeader className="bg-primary text-white rounded-t-lg py-3">
            <h6 className="mb-0 font-medium">العملاء ذوي المهام النشطة</h6>
          </CardHeader>
          <CardContent className="p-0 max-h-[calc(100vh-200px)] overflow-y-auto">
            <AdminEmployeeClientColumn employeeId={employeeId} />
          </CardContent>
        </Card>
      </div>

      {/* Right column: Tasks table with filters */}
      <div className="lg:col-span-8">
        <Card className="shadow-sm">
          <CardHeader className="bg-primary text-white rounded-t-lg py-3">
            <h6 className="mb-0 font-medium">جميع مهام الموظف</h6>
          </CardHeader>
          <CardContent className="p-0">
            <AdminEmployeeTasksTable userId={parseInt(id || '0', 10)} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmployeeManagementPage;
