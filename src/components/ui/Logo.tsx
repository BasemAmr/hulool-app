import type { HTMLAttributes } from 'react';

interface LogoProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
  compact?: boolean;
}

const Logo = ({ className, compact = false, ...props }: LogoProps) => {
  return (
    <div className={`flex items-center gap-1.5 ${className || ''}`} {...props}>
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground font-bold text-lg shadow-sm">
        ح
      </div>
      {!compact && (
        <span className="text-lg font-bold text-primary tracking-tight">حلول</span>
      )}
    </div>
  );
};

export default Logo;