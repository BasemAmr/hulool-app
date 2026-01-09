
import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { arSA } from 'date-fns/locale';

// Override style to match Bootstrap/Tailwind inputs
const customStyles = `
  .react-datepicker-wrapper {
    width: 100%;
  }
  .react-datepicker__input-container input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    font-family: 'Segoe UI', Roboto, Helvetica Neue, Arial, sans-serif !important;
    direction: ltr !important;
    text-align: left;
  }
  .react-datepicker-popper {
    z-index: 9999 !important;
  }
`;

interface DateInputProps {
    name: string;
    value: string; // Expecting YYYY-MM-DD
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    label?: string;
    error?: string;
    className?: string;
    disabled?: boolean;
    minDate?: string;
    maxDate?: string;
    placeholder?: string;
    required?: boolean;
}

export const DateInput: React.FC<DateInputProps> = ({
    name,
    value,
    onChange,
    label,
    error,
    className = '',
    disabled,
    minDate,
    maxDate,
    placeholder = 'YYYY-MM-DD',
    required
}) => {
    // Convert string YYYY-MM-DD to Date object
    const selectedDate = value ? new Date(value) : null;

    const handleDateChange = (date: Date | null) => {
        // Manually construct the event object to match standard input onChange signature
        const event = {
            target: {
                name,
                value: date ? date.toLocaleDateString('en-CA') : '' // en-CA gives YYYY-MM-DD format
            }
        } as React.ChangeEvent<HTMLInputElement>;

        onChange(event);
    };

    return (
        <div className={className}>
            <style>{customStyles}</style>
            {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
            <DatePicker
                selected={selectedDate}
                onChange={handleDateChange}
                dateFormat="yyyy-MM-dd"
                placeholderText={placeholder}
                disabled={disabled}
                locale={arSA} // Use Arabic locale for the calendar UI (months/days) but numbers will be English due to font override
                required={required}
                minDate={minDate ? new Date(minDate) : undefined}
                maxDate={maxDate ? new Date(maxDate) : undefined}
                className={`${error ? 'border-red-500' : 'border-gray-300'}`}
                showYearDropdown
                scrollableYearDropdown
                yearDropdownItemNumber={15}
                autoComplete="off"
                dropdownMode="select"
                calendarStartDay={6} // Start week on Saturday
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
    );
};
