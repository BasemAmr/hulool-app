import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { User, DollarSign, FileText, Users as UsersIcon, CreditCard, Activity, HandCoins, Clock, TrendingUp, TrendingDown, LayoutDashboard } from 'lucide-react';
import Button from '../components/ui/Button';
import { useModalStore } from '../stores/modalStore';
import { useGetEmployee, useGetEmployeeLedger } from '../queries/employeeQueries';
import { formatCurrency } from '../utils/formatUtils';
import { Card, CardHeader, CardContent } from '../components/ui/card';

// Import table components (to be created)
import EmployeeTransactionsTable from '../components/employees/EmployeeTransactionsTable';
import EmployeeTasksTable from '../components/employees/EmployeeTasksTable';
import EmployeeClientsTable from '../components/employees/EmployeeClientsTable';
import EmployeeReceivablesTable from '../components/employees/EmployeeReceivablesTable';

// Import admin employee management components
import AdminEmployeeClientColumn from '../employee_management_temp_page/AdminEmployeeClientColumn';
import AdminEmployeeTasksTable from '../employee_management_temp_page/AdminEmployeeTasksTable';

type ViewMode = 'dashboard' | 'transactions' | 'tasks' | 'clients' | 'receivables';

interface FinancialSummaryCardProps {
  summary?: {
    total_earned: number;
    total_expenses?: number;
    total_paid_out?: number;
    balance_due: number;
    total_transactions: number;
    last_payout_date: string | null;
  };
  pendingCount: number;
}

const FinancialSummaryCard: React.FC<FinancialSummaryCardProps> = ({ summary, pendingCount }) => {
  if (!summary) return null;
  
  const totalPaidOut = summary.total_paid_out ?? summary.total_expenses ?? 0;
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {/* Total Earned */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp size={20} className="text-green-600" />
          <span className="text-sm text-green-700 font-medium">إجمالي المستحق</span>
        </div>
        <p className="text-2xl font-bold text-green-600">
          {formatCurrency(summary.total_earned)} <span className="text-sm">ر.س</span>
        </p>
      </div>
      
      {/* Total Paid Out */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingDown size={20} className="text-red-600" />
          <span className="text-sm text-red-700 font-medium">إجمالي المصروف</span>
        </div>
        <p className="text-2xl font-bold text-red-600">
          {formatCurrency(totalPaidOut)} <span className="text-sm">ر.س</span>
        </p>
      </div>
      
      {/* Balance Due */}
      <div className={`${summary.balance_due > 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'} border rounded-lg p-4`}>
        <div className="flex items-center gap-2 mb-2">
          <DollarSign size={20} className={summary.balance_due > 0 ? 'text-blue-600' : 'text-gray-600'} />
          <span className={`text-sm font-medium ${summary.balance_due > 0 ? 'text-blue-700' : 'text-gray-700'}`}>الرصيد المتبقي</span>
        </div>
        <p className={`text-2xl font-bold ${summary.balance_due > 0 ? 'text-blue-600' : 'text-gray-600'}`}>
          {formatCurrency(summary.balance_due)} <span className="text-sm">ر.س</span>
        </p>
      </div>
      
      {/* Pending Commissions */}
      <div className={`${pendingCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'} border rounded-lg p-4`}>
        <div className="flex items-center gap-2 mb-2">
          <Clock size={20} className={pendingCount > 0 ? 'text-amber-600' : 'text-gray-600'} />
          <span className={`text-sm font-medium ${pendingCount > 0 ? 'text-amber-700' : 'text-gray-700'}`}>عمولات معلقة</span>
        </div>
        <p className={`text-2xl font-bold ${pendingCount > 0 ? 'text-amber-600' : 'text-gray-600'}`}>
          {pendingCount} <span className="text-sm">معاملة</span>
        </p>
      </div>
    </div>
  );
};

interface EmployeePageHeader {
  employee: any;
  onSarf: () => void;
  onQabd: () => void;
  activeMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  modeOptions: ReadonlyArray<{key: ViewMode; label: string; icon: any}>;
}

const EmployeeHeader: React.FC<EmployeePageHeader> = ({ employee, onSarf, onQabd, activeMode, onModeChange, modeOptions }) => {
  return (
    <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center">
          <User size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-black">{employee.display_name}</h1>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <select 
          className="px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          style={{ width: 'auto' }}
          value={activeMode}
          onChange={(e) => onModeChange(e.target.value as ViewMode)}
        >
          {modeOptions.map(({ key, label }) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <Button
          variant="outline-primary"
          size="sm"
          onClick={onQabd}
        >
          <HandCoins size={16} className="mr-1" />
          قبض
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={onSarf}
        >
          <DollarSign size={16} className="mr-1" />
          صرف
        </Button>
      </div>
    </div>
  );
};

const EmployeeProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const { openModal } = useModalStore();
  
  const [activeMode, setActiveMode] = useState<ViewMode>('dashboard');
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 20;

  const employeeTableId = parseInt(id || '0', 10);
  const { data: employee, isLoading, error: employeeError } = useGetEmployee(employeeTableId);
  
  // Fetch ledger data for summary
  const { data: ledgerData } = useGetEmployeeLedger(employeeTableId, { page: 1, per_page: 100 });
  
  // Calculate pending commissions count
  const pendingCount = ledgerData?.data?.pending_commissions?.length || 
    (ledgerData?.data?.transactions || []).filter(t => 
      t.is_pending || 
      (t.direction === 'CREDIT' && 
        (parseFloat(t.amount || '0') === 0 || 
         t.transaction_name?.startsWith('Pending:')))
    ).length;

  const handleSarf = () => {
    if (!employee) return;
    openModal('manualTransaction', { 
      preselectedAccount: { 
        type: 'employee', 
        id: employeeTableId,
        name: employee.display_name,
        email: employee.user_email,
        balance: 0,
        last_activity: null,
        pending_count: 0,
        pending_amount: 0
      },
      direction: 'payout'
    });
  };

  const handleQabd = () => {
    if (!employee) return;
    openModal('manualTransaction', { 
      preselectedAccount: { 
        type: 'employee',
        id: employeeTableId,
        name: employee.display_name,
        email: employee.user_email,
        balance: 0,
        last_activity: null,
        pending_count: 0,
        pending_amount: 0
      },
      direction: 'repayment'
    });
  };

  const handleModeChange = (mode: ViewMode) => {
    setActiveMode(mode);
    setCurrentPage(1); // Reset to first page when changing modes
  };

  if (isLoading) {
    return <div className="p-4 text-center">Loading employee...</div>;
  }

  if (employeeError || !employee) {
    return (
      <div className="rounded-lg border border-red-500 bg-red-500/10 p-6 text-center">
        <h4 className="text-lg font-semibold text-black mb-2">Employee Not Found</h4>
        <p className="text-black">The requested employee could not be found.</p>
      </div>
    );
  }

  const modeOptions = [
    { key: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
    { key: 'transactions', label: 'المعاملات', icon: Activity },
    { key: 'tasks', label: 'المهام', icon: FileText },
    { key: 'clients', label: 'العملاء', icon: UsersIcon },
    { key: 'receivables', label: 'المستحقات', icon: CreditCard },
  ] as const;

  return (
    <div className="p-6">
      <EmployeeHeader 
        employee={employee} 
        onSarf={handleSarf}
        onQabd={handleQabd}
        activeMode={activeMode}
        onModeChange={handleModeChange}
        modeOptions={modeOptions}
      />

      {/* Financial Summary Cards */}
      <FinancialSummaryCard 
        summary={ledgerData?.data?.summary}
        pendingCount={pendingCount}
      />

      {/* Dashboard View - Admin Employee Management */}
      {activeMode === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left column: Client cards */}
          <div className="lg:col-span-4">
            <Card className="shadow-sm">
              <CardHeader className="bg-primary text-white rounded-t-lg py-3">
                <h6 className="mb-0 font-medium">العملاء ذوي المهام النشطة</h6>
              </CardHeader>
              <CardContent className="p-0 max-h-[calc(100vh-200px)] overflow-y-auto">
                <AdminEmployeeClientColumn employeeId={employeeTableId} />
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
                <AdminEmployeeTasksTable employeeId={employeeTableId} />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Other Views */}
      {activeMode !== 'dashboard' && (
        <div className="rounded-lg border bg-card overflow-hidden">
          {activeMode === 'transactions' && (
            <EmployeeTransactionsTable
              employeeId={employeeTableId}
              page={currentPage}
              perPage={perPage}
              onPageChange={setCurrentPage}
            />
          )}
          
          {activeMode === 'tasks' && (
            <EmployeeTasksTable
              employeeId={employeeTableId}
              page={currentPage}
              perPage={perPage}
              onPageChange={setCurrentPage}
            />
          )}
          
          {activeMode === 'clients' && (
            <EmployeeClientsTable
              employeeId={employeeTableId}
              page={currentPage}
              perPage={perPage}
            />
          )}
          
          {activeMode === 'receivables' && (
            <EmployeeReceivablesTable
              employeeId={employeeTableId}
              page={currentPage}
              perPage={perPage}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default EmployeeProfilePage;
