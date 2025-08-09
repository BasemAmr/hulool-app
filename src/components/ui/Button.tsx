import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline-primary';
  size?: 'sm' | 'lg';
  isLoading?: boolean;
}

const Button = ({ children, variant = 'primary', size, isLoading = false, className, ...props }: ButtonProps) => {
  const sizeClass = size ? `btn-${size}` : '';
  return (
    <button 
      className={`btn btn-${variant} ${sizeClass} ${className || ''}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? '...' : children}
    </button>
  );
};
export default Button;