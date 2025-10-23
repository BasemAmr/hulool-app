import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { User, DollarSign, FileText, Users as UsersIcon, CreditCard, Activity, HandCoins, Plus } from 'lucide-react';
import Button from '../components/ui/Button';
import { useModalStore } from '../stores/modalStore';
import { useGetEmployee } from '../queries/employeeQueries';

// Import table components (to be created)
import EmployeeTransactionsTable from '../components/employees/EmployeeTransactionsTable';
import EmployeeTasksTable from '../components/employees/EmployeeTasksTable';
import EmployeeClientsTable from '../components/employees/EmployeeClientsTable';
import EmployeeReceivablesTable from '../components/employees/EmployeeReceivablesTable';
import EmployeeManagementPage from '../employee_management_temp_page/EmployeeManagementPage';

type ViewMode = 'transactions' | 'tasks' | 'clients' | 'receivables' | 'management';

interface EmployeePageHeader {
  employee: any;
  onAddPayout: () => void;
  onAddBorrow: () => void;
  onAddManualCredit: () => void;
  activeMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  modeOptions: ReadonlyArray<{key: ViewMode; label: string; icon: any}>;
}

const EmployeeHeader: React.FC<EmployeePageHeader> = ({ employee, onAddPayout, onAddBorrow, onAddManualCredit, activeMode, onModeChange, modeOptions }) => {
  return (
    <div className="d-flex justify-content-between align-items-center mb-4">
      <div className="d-flex align-items-center">
        <div className="avatar-lg bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3">
          <User size={24} />
        </div>
        <div>
          <h1 className="h4 mb-0">{employee.display_name}</h1>
        </div>
      </div>
      <div className="d-flex align-items-center gap-2">
        <select 
          className="form-select form-select-sm"
          style={{ width: 'auto' }}
          value={activeMode}
          onChange={(e) => onModeChange(e.target.value as ViewMode)}
        >
          {modeOptions.map(({ key, label }) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <Button
          variant="outline-success"
          size="sm"
          onClick={onAddManualCredit}
          title="تسجيل رصيد للموظف"
        >
          <Plus size={16} className="me-1" />
          تسجيل رصيد
        </Button>
        <Button
          variant="outline-primary"
          size="sm"
          onClick={onAddBorrow}
        >
          <HandCoins size={16} className="me-1" />
          اضافة مقترض
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={onAddPayout}
        >
          <DollarSign size={16} className="me-1" />
          صرف
        </Button>
      </div>
    </div>
  );
};

const EmployeeProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const { openModal } = useModalStore();
  
  const [activeMode, setActiveMode] = useState<ViewMode>('management');
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 20;

  const employeeTableId = parseInt(id || '0', 10);
  const { data: employee, isLoading, error: employeeError } = useGetEmployee(employeeTableId);

  const handleAddPayout = () => {
    if (!employee) return;
    openModal('employeePayout', { 
      employee: { 
        ...employee, 
        id: employeeTableId // Ensure the table ID is included
      },
      onSuccess: () => {
        // Refresh transactions data when payout is successfully added
        window.location.reload();
      }
    });
  };

  const handleAddBorrow = () => {
    if (!employee) return;
    openModal('employeeBorrow', { 
      employee: { 
        ...employee, 
        id: employeeTableId // Ensure the table ID is included
      },
      onSuccess: () => {
        // Refresh transactions data when borrow is successfully added
        window.location.reload();
      }
    });
  };

  const handleAddManualCredit = () => {
    if (!employee) return;
    openModal('employeeManualCredit', { 
      employee: { 
        ...employee, 
        id: employeeTableId // Ensure the table ID is included
      },
      onSuccess: () => {
        // Refresh transactions data when credit is successfully added
        window.location.reload();
      }
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
      <div className="alert alert-danger text-center">
        <h4>Employee Not Found</h4>
        <p>The requested employee could not be found.</p>
      </div>
    );
  }

  const modeOptions = [
    { key: 'management', label: 'إدارة المهام', icon: Activity },
    { key: 'transactions', label: 'المعاملات', icon: Activity },
    { key: 'tasks', label: 'المهام', icon: FileText },
    { key: 'clients', label: 'العملاء', icon: UsersIcon },
    { key: 'receivables', label: 'المستحقات', icon: CreditCard },
  ] as const;

  return (
    <div className="container-fluid">
      <EmployeeHeader 
        employee={employee} 
        onAddPayout={handleAddPayout}
        onAddBorrow={handleAddBorrow}
        onAddManualCredit={handleAddManualCredit}
        activeMode={activeMode}
        onModeChange={handleModeChange}
        modeOptions={modeOptions}
      />

      <div className="card">
        <div className="card-body p-0">
          {activeMode === 'management' && (
            <EmployeeManagementPage />
          )}

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
      </div>
    </div>
  );
};

export default EmployeeProfilePage;
