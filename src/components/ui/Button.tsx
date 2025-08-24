import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline-primary' | 'outline-success' | 'outline-danger' | 'outline-info' | 'outline-secondary';
  size?: 'sm' | 'lg';
  isLoading?: boolean;
}

const Button = ({ children, variant = 'primary', size, isLoading = false, className, ...props }: ButtonProps) => {
  const sizeClass = size ? `btn-${size}` : '';
  
  const getVariantStyles = (variant: string): string => {
    // Keep original variants as they are
    if (['primary', 'secondary', 'danger', 'outline-primary'].includes(variant)) {
      return `btn-${variant}`;
    }

    // Custom styles for new outline variants
    const customStyles: { [key: string]: string } = {
      'outline-succes': 'border border-success text-success hover:bg-success hover:text-white',
      'outline-danger': 'border border-danger text-danger hover:bg-danger hover:text-white',
      'outline-info': 'border border-info text-info hover:bg-info hover:text-white',
      'outline-secondary': 'border border-secondary text-secondary hover:bg-secondary hover:text-white'
    };

    return customStyles[variant] || `btn-${variant}`;
  };

  return (
    <button 
      className={`btn ${getVariantStyles(variant)} ${sizeClass} ${className || ''}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? '...' : children}
    </button>
  );
};
export default Button;