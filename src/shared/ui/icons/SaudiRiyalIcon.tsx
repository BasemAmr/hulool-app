import React from 'react';

interface SaudiRiyalIconProps {
  size?: number;
  strokeWidth?: number;
  style?: React.CSSProperties;
  className?: string;
  amount?: number;
}

const SaudiRiyalIcon: React.FC<SaudiRiyalIconProps> = ({ 
  size = 24, 
  strokeWidth = 1.5, 
  style,
  className,
  amount 
}) => {
  const displayAmount = amount !== undefined ? 
    new Intl.NumberFormat('en-US', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount) : null;

  return (
    <span className="inline-flex items-center">
      {displayAmount ? (
        <span className="me-1">{displayAmount}</span>
      ) : null}
    </span>
  );
};

export default SaudiRiyalIcon;
