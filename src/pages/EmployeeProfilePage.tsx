import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { User, DollarSign, FileText, Users as UsersIcon, CreditCard, Activity, HandCoins, Clock, TrendingUp, TrendingDown, LayoutDashboard } from 'lucide-react';
import Button from '../components/ui/Button';
import { useModalStore } from '../stores/modalStore';
import { useGetEmployee, useGetEmployeeLedger, type EmployeeLedgerResponse } from '../queries/employeeQueries';
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
import AdminEmployeeInvoicesPanel from '../components/employees/AdminEmployeeInvoicesPanel';
import AdminEmployeeTransactionsPanel from '../components/employees/AdminEmployeeTransactionsPanel';

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
    <div className="flex gap-4 items-center bg-gray-50 p-2 rounded-md">
      {/* Total Earned */}
      <div className="flex items-center gap-1">
        <span className="text-sm font-medium text-gray-700">إجمالي المستحق:</span>
        <span className="text-sm font-bold text-gray-900">{formatCurrency(summary.total_earned)}</span>
      </div>

      {/* Total Paid Out */}
      <div className="flex items-center gap-1">
        <span className="text-sm font-medium text-gray-700">إجمالي المصروف:</span>
        <span className="text-sm font-bold text-gray-900">{formatCurrency(totalPaidOut)}</span>
      </div>

      {/* Balance Due */}
      <div className="flex items-center gap-1">
        <span className="text-sm font-medium text-gray-700">الرصيد المتبقي:</span>
        <span className="text-sm font-bold text-gray-900">{formatCurrency(summary.balance_due)}</span>
      </div>

      {/* Pending Commissions */}
      <div className="flex items-center gap-1">
        <span className="text-sm font-medium text-gray-700">عمولات معلقة:</span>
        <span className="text-sm font-bold text-gray-900">{pendingCount} معاملة</span>
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
  modeOptions: ReadonlyArray<{ key: ViewMode; label: string; icon: any }>;
  ledgerData?: EmployeeLedgerResponse;
  pendingCount: number;
}

const EmployeeHeader: React.FC<EmployeePageHeader> = ({ employee, onSarf, onQabd, activeMode, onModeChange, modeOptions, ledgerData, pendingCount }) => {
  return (
    <div className="flex flex-wrap justify-around items-center gap-4 mb-6">
      {/* Employee Name and Status */}
      <div className="flex justify-around items-center gap-4 flex-1">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center">
            <User size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-black">{employee.display_name}</h1>
          </div>
        </div>
        <FinancialSummaryCard
          summary={ledgerData?.data?.summary}
          pendingCount={pendingCount}
        />

      </div>

      {/* Mode Selection Cards */}
      <div className="flex items-center gap-2">
        {modeOptions.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onModeChange(key)}
            className={`px-4 py-2 rounded-md font-bold text-lg transition-colors ${activeMode === key
                ? 'bg-primary text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            <Icon size={20} className="mr-2 inline" />
            {label}
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline-primary"
          size="sm"
          onClick={onQabd}
          className='font-bold text-lg rounded-md px-4 py-2'
        >
          <HandCoins size={16} className="mr-1" />
          قبض
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={onSarf}
          className='font-bold text-lg rounded-md px-4 py-2'
        >
          <DollarSign size={16} className="mr-1" />
          صرف
        </Button>
      </div>
    </div>
  );
};
const EmployeeProfilePage = () => {
  const { id, mode } = useParams<{ id: string; mode?: string }>();
  const navigate = useNavigate();
  const { openModal } = useModalStore();
  const activeMode = (mode as ViewMode) || 'dashboard';

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
    navigate(`/employees/${employeeTableId}/${mode}`);
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
        ledgerData={ledgerData}
        pendingCount={pendingCount}
      />


      {/* Dashboard View - Admin Employee Management - 3 Panel Layout */}
      {activeMode === 'dashboard' && (
        <div
          className="grid gap-2"
          style={{
            height: 'calc(100vh - 280px)',
            gridTemplateColumns: '1fr 1fr 2fr'
          }}
        >
          {/* Tasks Panel - 0.25 fraction */}
          <div style={{ height: '100%', overflow: 'hidden' }}>
            <Card className="shadow-sm h-full flex flex-col">
              <CardHeader className="bg-primary text-white rounded-t-lg py-2 flex-shrink-0">
                <h6 className="mb-0 font-medium text-sm">العملاء ذوي المهام النشطة</h6>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-y-auto">
                <AdminEmployeeClientColumn employeeId={employeeTableId} />
              </CardContent>
            </Card>
          </div>

          {/* Invoices Panel - 0.25 fraction */}
          <div style={{ height: '100%', overflow: 'hidden' }}>
            <AdminEmployeeInvoicesPanel employeeId={employeeTableId} />
          </div>

          {/* Transactions Panel - 0.5 fraction */}
          <div style={{ height: '100%', overflow: 'hidden' }}>
            <AdminEmployeeTransactionsPanel employeeId={employeeTableId} />
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
