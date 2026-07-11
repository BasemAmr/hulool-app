import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Banknote } from 'lucide-react';
import type { FCEmployeeSummary } from '@/features/financials/types/fcTypes';

interface FCEmployeeListProps {
  employees: FCEmployeeSummary[];
  selectedId: number | null;
  onSelect: (id: number, name: string) => void;
  isLoading: boolean;
  compact?: boolean;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 0 }).format(val);

const FCEmployeeList: React.FC<FCEmployeeListProps> = ({
  employees,
  selectedId,
  onSelect,
  isLoading,
  compact = false,
}) => {
  if (isLoading) {
    return (
      <div className="bg-card border border-border-default rounded-lg p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full border-2 border-border-strong border-t-primary w-6 h-6" />
          <span className="mr-2 text-sm text-text-secondary">جاري التحميل...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border-default rounded-lg">
      {!compact && (
        <div className="p-4 border-b border-border-default">
          <h2 className="text-xl font-extrabold text-text-primary">الموظفون</h2>
        </div>
      )}
      <div className="divide-y divide-border-default">
        {employees.map((employee) => {
          const isSelected = selectedId === employee.id;
          return (
            <button
              key={employee.id}
              type="button"
              onClick={() => onSelect(employee.id, employee.display_name)}
              className={`w-full flex items-center justify-between p-4 transition-colors text-right ${
                isSelected
                  ? 'border-r-[5px] border-r-primary bg-primary/10 shadow-sm'
                  : 'hover:bg-primary/5 hover:border-r-[5px] hover:border-r-primary/30'
              }`}
            >
              <div className="flex flex-col items-start gap-1.5">
                <span className="text-base font-bold text-text-primary">
                  {employee.display_name}
                </span>
                {employee.last_activity && (
                  <span className="text-xs text-text-secondary">
                    {formatDistanceToNow(new Date(employee.last_activity), {
                      addSuffix: true,
                      locale: ar,
                    })}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-base font-bold ${
                    employee.balance >= 0 ? 'text-status-success-text' : 'text-status-danger-text'
                  }`}
                >
                  {formatCurrency(employee.balance)}
                </span>
                <Banknote size={18} className="text-text-secondary" />
              </div>
            </button>
          );
        })}
        {employees.length === 0 && (
          <div className="p-6 text-center text-sm text-text-secondary">
            لا يوجد موظفون
          </div>
        )}
      </div>
    </div>
  );
};

export default FCEmployeeList;
