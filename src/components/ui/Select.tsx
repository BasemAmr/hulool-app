import React, { forwardRef } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder = "-- اختر --", className, ...props }, ref) => {
    return (
      <div className="form-group">
        {label && (
          <label className="form-label" style={{ fontSize: '14px', marginBottom: '4px' }}>
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`form-select ${error ? 'is-invalid' : ''} ${className || ''}`}
          style={{
            borderRadius: '6px',
            border: '1px solid #ddd',
            fontSize: '14px',
            padding: '8px 12px',
            minWidth: '150px',
            backgroundColor: '#fff'
          }}
          {...props}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <div className="invalid-feedback d-block">
            <small className="text-danger" style={{ fontSize: '12px' }}>{error}</small>
          </div>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
