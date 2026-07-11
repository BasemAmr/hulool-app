import React from 'react';
import EmployeeCOAAccountRow from './EmployeeCOAAccountRow';
import type { TreasuryAccountWithPermission } from '@/api/types';

interface COACategoryGroupEmp {
  subType: string;
  label: string;
  accounts: TreasuryAccountWithPermission[];
}

interface EmployeeCOACategoryProps {
  category: COACategoryGroupEmp;
}

const EmployeeCOACategory: React.FC<EmployeeCOACategoryProps> = ({ category }) => {
  return (
    <div className="border-b border-border-strong/80">
      <div className="grid grid-cols-12 bg-status-info-bg border-b border-status-info-border text-sm font-bold text-status-info-text">
        <div className="col-span-12 px-3 py-2">
          {category.label}
          <span className="text-xs mr-2 opacity-70">
            ({category.accounts.length})
          </span>
        </div>
      </div>
      {category.accounts.map((account) => (
        <EmployeeCOAAccountRow key={account.id} account={account} />
      ))}
    </div>
  );
};

export default EmployeeCOACategory;
