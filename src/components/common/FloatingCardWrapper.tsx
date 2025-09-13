import React, { useState } from 'react';

interface FloatingCardWrapperProps {
  children: React.ReactNode;
  hoverScale?: number;
  className?: string;
  dynamicWidth?: string; // New prop for dynamic width
}

export const FloatingCardWrapper: React.FC<FloatingCardWrapperProps> = ({
  children,
  hoverScale = 1.03,
  className = '',
  dynamicWidth
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`floating-card-container ${className}`}
      style={{
        position: 'relative',
        zIndex: isHovered ? 10000 : 1,
        isolation: 'isolate',
        overflow: 'visible',
      }}
    >
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          transform: isHovered ? `scale(${hoverScale})  ` : 'scale(1) translateX(0)',
          transformOrigin: 'center center',
          transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          boxShadow: isHovered ? '0 14px 28px rgba(0,0,0,0.25), 0 10px 10px rgba(0,0,0,0.22)' : 'none',
          willChange: 'transform, box-shadow',
          backfaceVisibility: 'hidden',
          overflow: 'visible',
          position: 'relative',
          pointerEvents: 'auto',
          width: isHovered ? (dynamicWidth || '105%') : '100%', // Use dynamic width if provided, else default to 105%
        }}
      >
        {children}
      </div>
    </div>
  );
};