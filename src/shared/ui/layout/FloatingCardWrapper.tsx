import React, { useState } from 'react';

interface FloatingCardWrapperProps {
  children: React.ReactNode;
  hoverScale?: number;
  className?: string;
  dynamicWidth?: string;
}

export const FloatingCardWrapper: React.FC<FloatingCardWrapperProps> = ({
  children,
  hoverScale = 1.03,
  className = '',
  dynamicWidth,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`floating-card-container ${className}`}
      style={{
        position: 'relative',
        zIndex: isHovered ? 40 : 1,
        isolation: 'isolate',
        overflow: 'visible',
      }}
    >
      {/*
        ── Shadow lives on its OWN layer ──────────────────────────────
        Only `opacity` transitions here. Opacity is GPU-composited and
        never triggers repaint — so the backdrop-filter on the card
        content underneath is never dirtied during animation.
      */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          boxShadow: 'var(--token-shadow-float)',
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          pointerEvents: 'none',
          zIndex: -1,
          willChange: 'opacity',
        }}
      />

      {/*
        ── Transform layer ────────────────────────────────────────────
        Only `transform` and `width` animate here — no box-shadow.
        This keeps the element on the compositor thread the whole time.
      */}
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          transform: isHovered ? `scale(${hoverScale})` : 'scale(1)',
          transformOrigin: 'center center',
          transition: 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), width 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          willChange: 'transform',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          overflow: 'visible',
          position: 'relative',
          pointerEvents: 'auto',
          width: isHovered ? (dynamicWidth || '105%') : '100%',
        }}
      >
        {children}
      </div>
    </div>
  );
};