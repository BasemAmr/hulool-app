// CardColumnContainer - Standardized container for client card columns

import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../../ui/badge';
import { cn } from '@/lib/utils';

interface CardColumnContainerProps {
  /** Column title */
  title: string;
  /** Icon element to show next to title */
  icon?: React.ReactNode;
  /** Primary color for header/footer */
  primaryColor: string;
  /** Number of items to show in badge */
  itemCount?: number;
  /** Link for "show more" footer */
  moreLink?: string;
  /** Whether title text should be dark (for light backgrounds like yellow) */
  darkText?: boolean;
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
  primaryColor,
  itemCount,
  moreLink,
  darkText = false,
  children,
  className,
  minHeight = '400px',
  emptyMessage = 'لا توجد نتائج',
  isEmpty = false,
}: CardColumnContainerProps) => {
  const textColorClass = darkText ? 'text-gray-800' : 'text-white';
  
  return (
    <div
      className={cn(
        "rounded-none border border-gray-300 flex flex-col overflow-visible relative",
        className
      )}
      style={{ minHeight }}
    >
      {/* Fixed Header */}
      <div
        className={cn(
          "flex justify-center items-center py-2 border-b border-gray-300 flex-shrink-0",
          textColorClass
        )}
        style={{ backgroundColor: primaryColor }}
      >
        <div className="flex justify-center items-center font-bold gap-2">
          {icon && (
            <span className="text-black">{icon}</span>
          )}
          {moreLink ? (
            <Link
              to={moreLink}
              className={cn(
                "no-underline text-center",
                darkText ? "text-gray-800" : "text-black"
              )}
            >
              <h6 className="mb-0 font-medium text-center">{title}</h6>
            </Link>
          ) : (
            <h6 className={cn("mb-0 font-medium text-center", darkText ? "text-gray-800" : "text-white")}>
              {title}
            </h6>
          )}
          {typeof itemCount === 'number' && (
            <Badge className="bg-white text-primary rounded-full px-2 py-1 text-black">
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
            <div className="mb-3">
              <i className="fas fa-clipboard-list fa-3x text-gray-400"></i>
            </div>
            <p className="text-muted-foreground mb-0">{emptyMessage}</p>
          </div>
        ) : (
          children
        )}
      </div>

      {/* Fixed Footer - optional */}
      {moreLink && (
        <div
          className="py-2 border-t border-gray-300 flex-shrink-0"
          style={{ backgroundColor: primaryColor }}
        >
          <Link
            to={moreLink}
            className={cn(
              "block w-full text-center font-medium py-1.5 rounded border border-white/30 transition-colors",
              darkText ? "text-gray-800" : "text-white"
            )}
            style={{ backgroundColor: 'transparent' }}
          >
            عرض المزيد
          </Link>
        </div>
      )}
    </div>
  );
};

export default CardColumnContainer;
