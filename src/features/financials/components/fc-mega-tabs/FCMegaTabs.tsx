import React from 'react';
import { Landmark, Users, Briefcase } from 'lucide-react';
import type { FCActiveTab } from '@/features/financials/types/fcTypes';

interface FCMegaTabsProps {
  activeTab: FCActiveTab;
  onTabChange: (tab: FCActiveTab) => void;
}

const tabs: { key: FCActiveTab; label: string; icon: React.ReactNode }[] = [
  { key: 'treasury', label: 'الخزينة', icon: <Landmark size={20} /> },
  { key: 'employees', label: 'الموظفون', icon: <Users size={20} /> },
  { key: 'clients', label: 'العملاء', icon: <Briefcase size={20} /> },
];

const FCMegaTabs: React.FC<FCMegaTabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="inline-flex rounded-lg border border-border-default overflow-hidden" dir="rtl">
      {tabs.map((tab, idx) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`flex items-center gap-2 px-6 py-3 text-base font-bold transition-colors whitespace-nowrap ${
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-text-secondary hover:bg-muted hover:text-text-primary'
            } ${idx !== 0 ? 'border-r border-border-default' : ''}`}
          >
            <span className="flex-shrink-0">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default FCMegaTabs;
