import React from 'react';
import { Accordion } from '@/shared/ui/shadcn/accordion';
import EmployeeCOASection from './EmployeeCOASection';
import type { TreasuryAccountWithPermission } from '@/api/types';

interface EmployeeSectionGroup {
  sectionDef: {
    id: string;
    label: string;
    icon: React.ComponentType<{ size?: number }>;
    defaultNormalBalance: string;
  };
  categorized: {
    subType: string;
    label: string;
    accounts: TreasuryAccountWithPermission[];
  }[];
  uncategorized: TreasuryAccountWithPermission[];
  totalCount: number;
}

interface EmployeeCOATreeProps {
  data: EmployeeSectionGroup[];
}

const EmployeeCOATree: React.FC<EmployeeCOATreeProps> = ({ data }) => {
  return (
    <Accordion type="multiple" defaultValue={[]} className="border border-border-default rounded-lg overflow-hidden bg-bg-surface">
      {data.map((section) => (
        <EmployeeCOASection key={section.sectionDef.id} section={section} />
      ))}
    </Accordion>
  );
};

export default EmployeeCOATree;
