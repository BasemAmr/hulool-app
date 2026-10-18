import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DollarSign, FileText, Users as UsersIcon, CreditCard, Activity, Clock, LayoutDashboard, ChevronDown, TrendingUp, TrendingDown } from 'lucide-react';
import Button from '@/shared/ui/primitives/Button';
import { useModalStore } from '@/shared/stores/modalStore';
import { useGetEmployee } from '@/features/employees/api/employeeQueries';
import { Card, CardHeader, CardContent } from '@/shared/ui/shadcn/card';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/shared/ui/shadcn/dropdown-menu';
import {
  buildSettlementQabdPreset,
  buildSettlementSarfPreset,
} from '@/features/financials/utils/settlementPresets';

// Import table components (to be created)
import EmployeeTransactionsTable from '../../components/management/EmployeeTransactionsTable';
import EmployeeTasksTable from '../../components/management/EmployeeTasksTable';
import EmployeeClientsTable from '../../components/management/EmployeeClientsTable';
import EmployeeInvoicesTable from '../../components/management/EmployeeInvoicesTable';

// Import admin employee management components
import AdminEmployeeClientColumn from '../../components/admin-views/AdminEmployeeClientColumn';
import AdminEmployeeTasksTable from '../../components/admin-views/AdminEmployeeTasksTable';
import AdminEmployeeInvoicesPanel from '../../components/admin-views/AdminEmployeeInvoicesPanel';
import AdminEmployeeTransactionsPanel from '../../components/admin-views/AdminEmployeeTransactionsPanel';

type ViewMode = 'dashboard' | 'transactions' | 'tasks' | 'clients' | 'invoices';

interface EmployeePageHeader {
  employee: any;
  onSarf: () => void;
  onQabd: () => void;
  onSettlementQabd: () => void;
  onSettlementSarf: () => void;
  activeMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  modeOptions: ReadonlyArray<{ key: ViewMode; label: string; icon: any }>;
}

const EmployeeHeader: React.FC<EmployeePageHeader> = ({ employee, onSarf, onQabd, onSettlementQabd, onSettlementSarf, activeMode, onModeChange, modeOptions }) => {
  const openModal = useModalStore((state) => state.openModal);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
      {/* Employee Name — sits at the RTL start (right), no avatar */}
      <div className="flex items-center gap-3 flex-1">
        <h1 className="text-2xl font-bold text-text-primary">{employee.display_name}</h1>
      </div>

      {/* Mode Selection Cards */}
      <div className="flex items-center gap-2">
        {modeOptions.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onModeChange(key)}
            className={`px-4 py-2 rounded-md font-bold text-lg transition-colors ${activeMode === key
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-background text-text-secondary hover:bg-background hover:text-text-primary'
              }`}
          >
            <Icon size={20} className="mr-2 inline" />
            {label}
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {/* سند قبض */}
        <Button
          variant="outline-success"
          size="sm"
          onClick={onQabd}
          className='font-bold text-lg rounded-md px-4 py-2 flex items-center gap-1'
        >
          <TrendingUp size={16} />
          سند قبض
        </Button>
        {/* سند صرف */}
        <Button
          variant="outline-danger"
          size="sm"
          onClick={onSarf}
          className='font-bold text-lg rounded-md px-4 py-2 flex items-center gap-1'
        >
          <TrendingDown size={16} />
          سند صرف
        </Button>
        {/* سند تسوية */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline-secondary"
              size="sm"
              className='font-bold text-lg rounded-md px-4 py-2 flex items-center gap-1'
            >
              <span>سند تسوية</span>
              <ChevronDown size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-right">
            <DropdownMenuItem
              className="cursor-pointer flex flex-row-reverse justify-end gap-2 text-status-success-text font-bold"
              onClick={onSettlementQabd}
            >
              <span>تسوية قبض</span>
              <TrendingUp size={16} className="text-status-success-text" />
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer flex flex-row-reverse justify-end gap-2 text-status-danger-text font-bold"
              onClick={onSettlementSarf}
            >
              <span>تسوية صرف</span>
              <TrendingDown size={16} className="text-status-danger-text" />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
  const userId = employee?.user_id;

  const handleSarf = () => {
    if (!employee) return;
    openModal('unifiedTransaction', {
      defaultFromCardType: 'cashbox',
      defaultToCardType: 'employee',
      // Canonical ledger id is tm_employees.id (employee.id), same source the
      // تسوية handlers use — never the raw URL param, which can be stale mid-transition.
      defaultToAccountId: String(employee.id),
      lockDirection: true,
      title: 'سند صرف',
    });
  };

  const handleQabd = () => {
    if (!employee) return;
    openModal('unifiedTransaction', {
      defaultFromCardType: 'employee',
      // Canonical ledger id is tm_employees.id (employee.id), same source the
      // تسوية handlers use — never the raw URL param, which can be stale mid-transition.
      defaultFromAccountId: String(employee.id),
      defaultToCardType: 'cashbox',
      lockDirection: true,
      title: 'سند قبض',
    });
  };

  const handleSettlementQabd = () => {
    if (!employee) return;
    // Standard تسوية preset: قبض for an employee = FROM employee (credit) TO settlement.
    openModal('unifiedTransaction', buildSettlementQabdPreset({ kind: 'employee', id: String(employee.id) }));
  };

  const handleSettlementSarf = () => {
    if (!employee) return;
    // Standard تسوية preset: صرف for an employee = FROM settlement TO employee (debit).
    openModal('unifiedTransaction', buildSettlementSarfPreset({ kind: 'employee', id: String(employee.id) }));
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
      <div className="rounded-lg border border-status-danger-border bg-status-danger-bg0/10 p-6 text-center">
        <h4 className="text-lg font-semibold text-text-primary mb-2">Employee Not Found</h4>
        <p className="text-text-primary">The requested employee could not be found.</p>
      </div>
    );
  }

  const modeOptions = [
    { key: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
    { key: 'transactions', label: 'المعاملات', icon: Activity },
    { key: 'tasks', label: 'المهام', icon: FileText },
    { key: 'clients', label: 'العملاء', icon: UsersIcon },
    { key: 'invoices', label: 'الفواتير', icon: CreditCard },
  ] as const;

  return (
    <div className="p-6">
      <EmployeeHeader
        employee={employee}
        onSarf={handleSarf}
        onQabd={handleQabd}
        onSettlementQabd={handleSettlementQabd}
        onSettlementSarf={handleSettlementSarf}
        activeMode={activeMode}
        onModeChange={handleModeChange}
        modeOptions={modeOptions}
      />


      {/* Dashboard View - Admin Employee Management - 3 Panel Layout */}
      {activeMode === 'dashboard' && (
        <div
          className="grid gap-2"
          style={{
            height: 'calc(100vh - 280px)',
            // increatse the fraction of tasks admin row card SLIGHTLY on expense of tasks panel
            gridTemplateColumns: '  1fr 1fr 1.5fr'
          }}
        >
          {/* Tasks Panel - 0.25 fraction */}
          <div style={{ height: '100%', overflow: 'hidden' }}>
            <Card className="shadow-sm h-full flex flex-col rounded-none">
              <CardHeader className="bg-bg-surface border-b border-border-default border-l-4 border-l-primary py-2 flex-shrink-0">
                <h6 className="mb-0 font-medium text-sm text-text-primary">العملاء ذوي المهام النشطة</h6>
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
            <AdminEmployeeTransactionsPanel employeeId={employeeTableId} employeeName={employee.display_name} />
          </div>
        </div>
      )}

      {/* Other Views */}
      {/* overflow-visible, not hidden: an ancestor with overflow!=visible becomes a new
          scrollport, which silently disables position:sticky on the ledger toolbar below.
          The rounding is cosmetic and no child content overflows. */}
      {activeMode !== 'dashboard' && (
        <div className="rounded-lg border bg-card overflow-visible">
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

          {activeMode === 'invoices' && (
            <EmployeeInvoicesTable
              employeeId={employeeTableId}
              page={currentPage}
              perPage={perPage}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default EmployeeProfilePage;
