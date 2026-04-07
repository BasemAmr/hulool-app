// CardColumnContainer - Standardized container for client card columns

import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/shared/ui/shadcn/badge';
import { cn } from '@/shared/utils/cn';

interface CardColumnContainerProps {
  /** Column title */
  title: string;
  /** Icon element to show next to title */
  icon?: React.ReactNode;
  /**
   * Accent color — used ONLY as a 4px left-border strip on the header.
   * This replaces the old full-background primaryColor.
   * Pass a CSS color string e.g. 'var(--token-status-info-text)' or a hex.
   */
  accentColor?: string;
  /**
   * @deprecated Use accentColor instead. Kept for backwards compatibility —
   * will be ignored and NOT applied as a background.
   */
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
  // primaryColor is accepted but deliberately not applied as background
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
        "rounded-none border border-border-default flex flex-col overflow-visible relative",
        className
      )}
      style={{ minHeight }}
    >
      {/* Header — white background, single left-border accent strip */}
      <div
        className="flex justify-center items-center py-2 border-b border-border-default flex-shrink-0 bg-bg-surface"
        style={accentColor ? { borderLeftWidth: '4px', borderLeftColor: accentColor, borderLeftStyle: 'solid' } : undefined}
      >
        <div className="flex justify-center items-center font-bold gap-2">
          {icon && (
            <span className="text-text-secondary">{icon}</span>
          )}
          {moreLink ? (
            <Link
              to={moreLink}
              className="no-underline text-center text-text-primary hover:text-text-brand transition-colors"
            >
              <h6 className="mb-0 font-medium text-center">{title}</h6>
            </Link>
          ) : (
            <h6 className="mb-0 font-medium text-center text-text-primary">
              {title}
            </h6>
          )}
          {typeof itemCount === 'number' && (
            <Badge className="bg-background border border-border-default rounded-full px-2 py-0.5 text-text-primary text-xs font-semibold">
              {itemCount}
            </Badge>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div
        className={cn(
          "p-0 flex-1 z-0 overflow-visible",
          isEmpty && "min-h-[200px]"
        )}
      >
        {isEmpty ? (
          <div className="py-12 text-center">
            <p className="text-text-muted mb-0 text-sm">{emptyMessage}</p>
          </div>
        ) : (
          children
        )}
      </div>

      {/* Fixed Footer - optional */}
      {moreLink && (
        <div className="py-2 border-t border-border-default flex-shrink-0 bg-background">
          <Link
            to={moreLink}
            className="block w-full text-center font-medium py-1.5 rounded text-text-secondary hover:text-text-primary transition-colors text-sm"
          >
            عرض المزيد
          </Link>
        </div>
      )}
    </div>
  );
};

export default CardColumnContainer;
