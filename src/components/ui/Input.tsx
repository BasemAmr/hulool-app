import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = ({ label, name, error, className, ...props }: InputProps) => {
  return (
    <div className="mb-3">
      {label && <label htmlFor={name} className="form-label">{label}</label>}
      <input
        id={name}
        name={name}
        className={`form-control ${error ? 'is-invalid' : ''} ${className || ''}`}
        {...props}
      />
      {error && <div className="invalid-feedback">{error}</div>}
    </div>
  );
};
export default Input;