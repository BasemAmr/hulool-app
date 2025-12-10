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
        className="flex items-center gap-2 px-3 py-1.5 bg-white/95 border border-black/10 rounded-md cursor-pointer text-sm font-medium text-gray-800 transition-all duration-200 shadow-sm backdrop-blur-sm hover:bg-white hover:border-black/15 hover:shadow-md"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-xs font-semibold tracking-wide">{selectedOption?.descriptionArabic || 'الكل'}</span>
        <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute top-[calc(100%+4px)] left-0 bg-white/98 border border-black/10 rounded-md min-w-[140px] shadow-lg overflow-hidden backdrop-blur-sm animate-[slideDown_0.15s_ease-out]">
          {options.map((option) => (
            <div
              key={option.value}
              className={`px-3 py-2.5 cursor-pointer text-xs text-gray-800 transition-all duration-150 flex justify-between items-center border-l-3 rtl ${
                value === option.value 
                  ? 'bg-blue-500/12 border-l-blue-500 font-semibold text-blue-500' 
                  : 'border-l-transparent hover:bg-blue-500/8 hover:border-l-blue-500/30'
              }`}
              onClick={() => handleSelect(option.value)}
            >
              <span className="font-medium">{option.descriptionArabic}</span>
              {value === option.value && (
                <span className="text-blue-500 font-bold text-sm">✓</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardTaskTypeFilter;
