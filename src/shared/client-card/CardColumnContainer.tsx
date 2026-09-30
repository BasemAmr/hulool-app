// CardColumnContainer - Standardized container for client card columns
// Styled with Mostaql Blue Color Theme and sharp square badges (rounded-none)

import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/shared/utils/cn';

interface CardColumnContainerProps {
  /** Column title */
  title: string;
  /** Icon element to show next to title */
  icon?: React.ReactNode;
  /** Accent color — used as a 3px top border strip */
  accentColor?: string;
  /** @deprecated Kept for backwards compatibility */
  primaryColor?: string;
  /** Number of items to show in badge */
  itemCount?: number;
  /** Link for "show more" footer */
  moreLink?: string;
  /** Children - the cards to render */
  children: React.ReactNode;
  /** Custom class name */
  className?: string;
  /** Min height for the column */
  minHeight?: string;
  /** Empty state message */
  emptyMessage?: string;
  /** Show empty state */
  isEmpty?: boolean;
}

const CardColumnContainer = ({
  title,
  icon,
  accentColor,
  itemCount,
  moreLink,
  children,
  className,
  minHeight = '400px',
  emptyMessage = 'لا توجد نتائج',
  isEmpty = false,
}: CardColumnContainerProps) => {
  return (
    <div
      className={cn(
        "rounded-xl border flex flex-col overflow-visible relative shadow-2xs",
        className
      )}
      style={{
        minHeight,
        borderColor: 'var(--token-column-container-border)',
        backgroundColor: 'var(--token-column-container-bg)',
      }}
    >
      {/* Header — Clean neutral header (no top border, sharp badge) */}
      <div 
        className="flex justify-between items-center px-4 py-2.5 border-b flex-shrink-0 rounded-t-xl"
        style={{
          backgroundColor: 'var(--token-column-header-bg)',
          color: 'var(--token-column-header-text)',
          borderBottomColor: 'var(--token-column-header-border)',
        }}
      >
        <div className="flex items-center font-bold gap-2">
          {icon && (
            <span className="flex-shrink-0" style={{ color: 'var(--token-text-secondary)' }}>{icon}</span>
          )}
          {moreLink ? (
            <Link
              to={moreLink}
              className="no-underline transition-colors"
              style={{ color: 'var(--token-column-header-text)' }}
            >
              <h6 className="mb-0 font-bold text-sm tracking-wide font-['Cairo']" style={{ color: 'inherit' }}>{title}</h6>
            </Link>
          ) : (
            <h6 className="mb-0 font-bold text-sm tracking-wide font-['Cairo']" style={{ color: 'inherit' }}>
              {title}
            </h6>
          )}
        </div>

        {typeof itemCount === 'number' && (
          <span 
            className="rounded-none px-2 py-0.5 text-xs font-semibold tabular-nums font-['Cairo'] shadow-2xs border"
            style={{
              backgroundColor: 'var(--token-column-badge-bg)',
              color: 'var(--token-column-badge-text)',
              borderColor: 'var(--token-column-badge-border)',
            }}
          >
            {itemCount}
          </span>
        )}
      </div>

      {/* Scrollable Content */}
      <div
        className={cn(
          "p-2 flex-1 z-0 overflow-visible",
          isEmpty && "min-h-[200px]"
        )}
      >
        {isEmpty ? (
          <div className="py-12 text-center">
            <p className="text-text-muted mb-0 text-sm font-['Cairo']">{emptyMessage}</p>
          </div>
        ) : (
          children
        )}
      </div>

      {/* Fixed Footer - optional */}
      {moreLink && (
        <div 
          className="py-2 border-t flex-shrink-0 rounded-b-xl"
          style={{
            borderTopColor: 'var(--token-column-container-border)',
            backgroundColor: 'var(--token-bg-surface)',
          }}
        >
          <Link
            to={moreLink}
            className="block w-full text-center font-medium py-1 rounded transition-colors text-xs font-['Cairo']"
            style={{ color: 'var(--token-text-secondary)' }}
          >
            عرض المزيد
          </Link>
        </div>
      )}
    </div>
  );
};

export default CardColumnContainer;
