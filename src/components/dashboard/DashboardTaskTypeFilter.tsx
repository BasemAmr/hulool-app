import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import './DashboardTaskTypeFilter.scss';

interface DashboardTaskTypeFilterProps {
  value: 'all' | 'employee' | 'admin';
  onChange: (value: 'all' | 'employee' | 'admin') => void;
}

type TaskTypeOption = {
  value: 'all' | 'employee' | 'admin';
  label: string;
  descriptionArabic: string;
};

const DashboardTaskTypeFilter: React.FC<DashboardTaskTypeFilterProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const options: TaskTypeOption[] = [
    { value: 'all', label: 'All', descriptionArabic: 'الكل' },
    { value: 'employee', label: 'Employee', descriptionArabic: 'موظف' },
    { value: 'admin', label: 'Admin', descriptionArabic: 'إداري' },
  ];

  const selectedOption = options.find(opt => opt.value === value);

  const handleSelect = (selectedValue: 'all' | 'employee' | 'admin') => {
    onChange(selectedValue);
    setIsOpen(false);
  };

  return (
    <div className="dashboard-task-type-filter">
      <div className="filter-trigger" onClick={() => setIsOpen(!isOpen)}>
        <span className="filter-label">{selectedOption?.descriptionArabic || 'الكل'}</span>
        <ChevronDown size={14} className={`filter-chevron ${isOpen ? 'open' : ''}`} />
      </div>

      {isOpen && (
        <div className="filter-menu">
          {options.map((option) => (
            <div
              key={option.value}
              className={`filter-option ${value === option.value ? 'active' : ''}`}
              onClick={() => handleSelect(option.value)}
            >
              <span className="option-label">{option.descriptionArabic}</span>
              {value === option.value && (
                <span className="option-check">✓</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardTaskTypeFilter;
