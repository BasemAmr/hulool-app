import React from 'react';
import FCCOAView from '@/features/financials/components/fc-coa-view/FCCOAView';

interface FCTreasuryViewProps {
  filterSection?: string;
  filterCategory?: string;
}

const FCTreasuryView: React.FC<FCTreasuryViewProps> = ({ filterSection, filterCategory }) => {
  return <FCCOAView filterSection={filterSection} filterCategory={filterCategory} />;
};

export default FCTreasuryView;
