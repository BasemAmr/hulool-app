import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye } from 'lucide-react';
import type { TreasuryAccountWithPermission } from '@/api/types';

interface EmployeeCOAAccountRowProps {
  account: TreasuryAccountWithPermission;
}

const formatBalance = (balance: number): string => {
  const englishNum = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(balance);
  return `${englishNum} ريال سعودي`;
};

const EmployeeCOAAccountRow: React.FC<EmployeeCOAAccountRowProps> = ({ account }) => {
  const navigate = useNavigate();

  const handleView = () => {
    navigate(`/employee/treasury-accounts/${account.id}`);
  };

  return (
    <div className="grid grid-cols-12 border-b border-border-strong hover:bg-bg-surface-hover transition-colors text-base">
      <span className="col-span-2 border-s border-e border-border-strong/80 px-3 py-3 text-text-secondary font-mono font-medium">
        {account.sub_type || '—'}
      </span>
      <span className="col-span-5 border-e border-border-strong/80 px-3 py-3 text-text-primary truncate font-medium">
        {account.name}
      </span>
      <span className="col-span-3 border-e border-border-strong/80 px-3 py-3 text-left font-semibold text-text-primary tracking-tight">
        {formatBalance(account.balance)}
      </span>
      <div className="col-span-2 border-e border-border-strong/80 px-3 py-3 flex items-center justify-center gap-1">
        <button
          onClick={handleView}
          className="p-1.5 rounded-md text-text-secondary hover:text-primary hover:bg-bg-surface transition-colors"
          title="عرض الحساب"
        >
          <Eye size={16} />
        </button>
      </div>
    </div>
  );
};

export default EmployeeCOAAccountRow;
