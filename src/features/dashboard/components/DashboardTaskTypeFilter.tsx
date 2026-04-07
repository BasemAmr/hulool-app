import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface DashboardTaskTypeFilterProps {
  value: 'employee' | 'admin';
  onChange: (value: 'employee' | 'admin') => void;
}

type TaskTypeOption = {
  value: 'employee' | 'admin';
  label: string;
  descriptionArabic: string;
};

const DashboardTaskTypeFilter: React.FC<DashboardTaskTypeFilterProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const options: TaskTypeOption[] = [
    { value: 'employee', label: 'Employee', descriptionArabic: 'موظف' },
    { value: 'admin', label: 'Admin', descriptionArabic: 'إداري' },
  ];

  const selectedOption = options.find(opt => opt.value === value);

  const handleSelect = (selectedValue: 'employee' | 'admin') => {
    onChange(selectedValue);
    setIsOpen(false);
  };

  return (
    <div className="absolute top-4 left-4 z-50">
      <div 
        className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-text-primary shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-border-strong hover:bg-background hover:shadow-md"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-xs font-semibold tracking-wide">{selectedOption?.descriptionArabic || 'الكل'}</span>
        <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute top-[calc(100%+4px)] left-0 min-w-[140px] overflow-hidden rounded-md border border-border bg-card shadow-lg backdrop-blur-sm animate-[slideDown_0.15s_ease-out]">
          {options.map((option) => (
            <div
              key={option.value}
              className={`rtl flex cursor-pointer items-center justify-between border-l-3 px-3 py-2.5 text-xs text-text-primary transition-all duration-150 ${
                value === option.value 
                  ? 'border-l-primary bg-status-info-bg/12 font-semibold text-status-info-text' 
                  : 'border-l-transparent hover:border-l-primary/30 hover:bg-background'
              }`}
              onClick={() => handleSelect(option.value)}
            >
              <span className="font-medium">{option.descriptionArabic}</span>
              {value === option.value && (
                <span className="text-status-info-text font-bold text-sm">✓</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardTaskTypeFilter;
