// NumberInput.tsx - Optimized for zero-lag typing
// Forces English numerals without performance issues

import React, { useRef, useCallback } from 'react';

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    value: number | string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    label?: string;
    error?: string;
    className?: string;
}

export const NumberInput: React.FC<NumberInputProps> = ({
    name,
    value,
    onChange,
    label,
    error,
    className = '',
    disabled,
    ...props
}) => {
    // Use ref to track the input element directly
    const inputRef = useRef<HTMLInputElement>(null);

    // Track if we're currently typing (to ignore parent updates during typing)
    const isTypingRef = useRef(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Convert Arabic/Hindi numerals to English
    const toEnglishNumerals = useCallback((str: string): string => {
        return str
            .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
            .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString());
    }, []);

    // Sync parent value to input ONLY when not typing
    React.useEffect(() => {
        if (!isTypingRef.current && inputRef.current) {
            const stringValue = value?.toString() || '';
            if (inputRef.current.value !== stringValue) {
                inputRef.current.value = stringValue;
            }
        }
    }, [value]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        // Mark as actively typing
        isTypingRef.current = true;

        // Clear previous timeout
        if (typingTimeoutRef.current !== null) {
            clearTimeout(typingTimeoutRef.current);
        }

        const rawValue = e.target.value;

        // Convert and sanitize INSTANTLY (no state updates, direct DOM manipulation)
        const englishValue = toEnglishNumerals(rawValue);
        const sanitized = englishValue.replace(/[^\d.-]/g, '');

        // Update the input directly if sanitization changed the value
        if (e.target.value !== sanitized) {
            const cursorPos = e.target.selectionStart || 0;
            e.target.value = sanitized;
            // Restore cursor position
            e.target.setSelectionRange(cursorPos, cursorPos);
        }

        // Create event for parent with sanitized value
        const syntheticEvent = {
            ...e,
            target: {
                ...e.target,
                value: sanitized,
                name: name || ''
            }
        } as React.ChangeEvent<HTMLInputElement>;

        // Call parent immediately (parent can decide to debounce on their end if needed)
        onChange(syntheticEvent);

        // Mark as done typing after 150ms of no input
        typingTimeoutRef.current = setTimeout(() => {
            isTypingRef.current = false;
        }, 150);
    }, [name, onChange, toEnglishNumerals]);

    // Cleanup timeout on unmount
    React.useEffect(() => {
        return () => {
            if (typingTimeoutRef.current !== null) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, []);

    return (
        <div className={className}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                </label>
            )}
            <input
                ref={inputRef}
                type="text"
                inputMode="decimal"
                name={name}
                defaultValue={value || ''}
                onChange={handleChange}
                className={`w-full border rounded-md shadow-sm p-2 ${error ? 'border-red-500' : 'border-gray-300'
                    }`}
                style={{
                    fontFamily: 'Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif',
                    direction: 'ltr',
                    textAlign: 'left'
                }}
                disabled={disabled}
                {...props}
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
    );
};