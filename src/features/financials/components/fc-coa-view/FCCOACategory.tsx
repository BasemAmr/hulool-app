import React from 'react';
import FCCOAAccountRow from './FCCOAAccountRow';
import type { COACategoryGroup } from '@/features/financials/types/fcTypes';

interface FCCOACategoryProps {
  category: COACategoryGroup;
  sectionId: string;
}

const FCCOACategory: React.FC<FCCOACategoryProps> = ({ category }) => {
  return (
    <div className="border-b border-border-strong/80">
      {/* Category header row — bluish background, blue text */}
      <div className="grid grid-cols-12 bg-status-info-bg border-b border-status-info-border text-sm font-bold text-status-info-text">
        <div className="col-span-12 px-3 py-2">
          {category.label}
          <span className="text-xs mr-2 opacity-70">
            ({category.accounts.length})
          </span>
        </div>
      </div>
      {category.accounts.map((account) => (
        <FCCOAAccountRow key={account.id} account={account} />
      ))}
    </div>
  );
};

export default FCCOACategory;
