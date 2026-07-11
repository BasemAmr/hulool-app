import React from 'react';
import { Accordion } from '@/shared/ui/shadcn/accordion';
import FCCOASection from './FCCOASection';
import type { COATreeData } from '@/features/financials/types/fcTypes';

interface FCCOATreeProps {
  data: COATreeData;
  filterSection?: string;
}

const FCCOATree: React.FC<FCCOATreeProps> = ({ data, filterSection }) => {
  return (
    <Accordion type="multiple" defaultValue={filterSection ? [filterSection] : []} className="border border-border-default rounded-lg overflow-hidden bg-bg-surface">
      {data.map((section) => (
        <FCCOASection key={section.section.id} section={section} />
      ))}
    </Accordion>
  );
};

export default FCCOATree;
