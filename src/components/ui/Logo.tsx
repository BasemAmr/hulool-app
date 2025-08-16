import type { HTMLAttributes } from 'react';
import logoSvg from '../../assets/images/logo.svg';

interface LogoProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
  width?: string | number;
  height?: string | number;
}

const Logo = ({ className, width, height, ...props }: LogoProps) => {
  return (
    <div className={`logo-container ${className || ''}`} {...props}>
      <img src={logoSvg} alt="Hulool Logo" style={{ height: height || '64px', width: width || 'auto' }} />
      <span className="logo-text">حلول</span>
    </div>
  );
};

export default Logo;