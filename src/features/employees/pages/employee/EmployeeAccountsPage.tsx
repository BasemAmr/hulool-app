import { useState } from 'react';
import { Landmark, Briefcase } from 'lucide-react';
import EmployeeCOAView from '../../components/employee-coa-view/EmployeeCOAView';
import EmployeeFCClientsView from '../../components/employee-clients-view/EmployeeFCClientsView';

type AccountsTab = 'treasury' | 'clients';

const tabs: { key: AccountsTab; label: string; icon: React.ReactNode }[] = [
  { key: 'treasury', label: 'الخزينة', icon: <Landmark size={20} /> },
  { key: 'clients', label: 'العملاء', icon: <Briefcase size={20} /> },
];

const EmployeeAccountsPage = () => {
  const [activeTab, setActiveTab] = useState<AccountsTab>('treasury');

  return (
    <div dir="rtl" className="p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">حساباتي</h1>
        <div className="inline-flex rounded-lg border border-border-default overflow-hidden">
          {tabs.map((tab, idx) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
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
      </div>

      {activeTab === 'treasury' && <EmployeeCOAView />}
      {activeTab === 'clients' && <EmployeeFCClientsView />}
    </div>
  );
};

export default EmployeeAccountsPage;
