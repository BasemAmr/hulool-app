import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useGetEmployeeAccounts } from '@/features/financials/api/fcQueries';
import FCEmployeeList from './FCEmployeeList';
import FCEmployeeTransactionPanel from './FCEmployeeTransactionPanel';

const FCEmployeesView: React.FC = () => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [selectedEmployeeName, setSelectedEmployeeName] = useState<string>('');

  const { data: employees = [], isLoading } = useGetEmployeeAccounts();

  const handleSelect = (id: number, name: string) => {
    setSelectedEmployeeId(id);
    setSelectedEmployeeName(name);
  };

  const handleBack = () => {
    setSelectedEmployeeId(null);
    setSelectedEmployeeName('');
  };

  return (
    <div className="space-y-4" dir="rtl">
      {selectedEmployeeId && (
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          <ArrowRight size={16} />
          <span>عرض الكل</span>
        </button>
      )}

      {selectedEmployeeId ? (
        <div className="space-y-4">
          <FCEmployeeList
            employees={employees}
            selectedId={selectedEmployeeId}
            onSelect={handleSelect}
            isLoading={isLoading}
            compact
          />
          <FCEmployeeTransactionPanel
            employeeId={selectedEmployeeId}
            employeeName={selectedEmployeeName}
          />
        </div>
      ) : (
        <FCEmployeeList
          employees={employees}
          selectedId={selectedEmployeeId}
          onSelect={handleSelect}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};

export default FCEmployeesView;
