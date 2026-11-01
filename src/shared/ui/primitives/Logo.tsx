import type { HTMLAttributes } from 'react';

interface LogoProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
  compact?: boolean;
  variant?: 'navbar' | 'default';
}

const Logo = ({ className, compact = false, variant = 'navbar', ...props }: LogoProps) => {
  const isNavbar = variant === 'navbar';
  return (
    <div className={`flex items-center gap-2 ${className || ''}`} {...props}>
      <div
        className={`flex items-center justify-center w-8 h-8 rounded-lg font-black text-lg shadow-xs ${
          isNavbar
            ? 'bg-white text-sky-700 shadow-sm'
            : 'bg-primary text-primary-foreground shadow-sm'
        }`}
      >
        ح
      </div>
      {!compact && (
        <span
          className={`text-xl font-black tracking-tight font-['Cairo'] ${
            isNavbar ? 'text-white drop-shadow-xs' : 'text-primary'
          }`}
        >
          حلول
        </span>
      )}
    </div>
  );
};

export default Logo;
