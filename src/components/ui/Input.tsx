import { forwardRef, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, name, error, className, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label 
            htmlFor={name} 
            className="block text-sm font-semibold text-foreground tracking-tight"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={name}
          name={name}
          className={`base-input ${error ? '!border-destructive focus:!ring-destructive/10' : ''} ${className || ''}`}
          {...props}
        />
        {error && (
          <div className="text-xs text-destructive font-medium mt-1 flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
export default Input;