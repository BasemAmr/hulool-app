import React, { useState } from 'react';
import { ChevronUp } from 'lucide-react';
import TaskStatusCards from './TaskStatusCards';

interface CollapsibleTaskStatusCardsProps {
  stats: {
    new_tasks: number;
    deferred_tasks: number;
    pending_review_tasks?: number;
    completed_tasks: number;
    late_tasks: number;
    late_receivables: number;
    total_unpaid_amount?: number;
  };
  totalPaidAmount?: number;
  isLoading: boolean;
}

const CollapsibleTaskStatusCards: React.FC<CollapsibleTaskStatusCardsProps> = ({
  stats,
  totalPaidAmount,
  isLoading
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: isCollapsed ? 999 : 10000,
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: isCollapsed ? 'translateY(calc(100% - 18px))' : 'translateY(0)',
        backgroundColor: '#fff',
        borderTop: '2px solid rgba(212, 175, 55, 0.1)',
        boxShadow: isCollapsed
          ? '0 -4px 12px rgba(0, 0, 0, 0.08)'
          : '0 -8px 24px rgba(0, 0, 0, 0.12)',
        padding: isCollapsed ? '0' : '0.25rem 1rem',
        borderRadius: isCollapsed ? '24px 24px 0 0' : '0 0 24px 24px',
        overflow: isCollapsed ? 'visible' : 'hidden'
      }}
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="collapse-toggle-btn"
        style={{
          position: 'absolute',
          top: isCollapsed ? -14 : -28,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '48px',
          height: '48px',
          borderRadius: isCollapsed ? '24px 24px 0 0' : '0 0 24px 24px',
          background: isCollapsed
            ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.95) 0%, rgba(212, 175, 55, 1) 100%)'
            : 'rgba(212, 175, 55, 0.4)',
          border: `2px solid ${isCollapsed ? 'rgba(212, 175, 55, 1)' : 'rgba(212, 175, 55, 0.6)'}`,
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isCollapsed
            ? '0 -4px 12px rgba(0, 0, 0, 0.15)'
            : '0 4px 12px rgba(0, 0, 0, 0.1)',
          zIndex: 1001,
          padding: 0,
          outline: 'none'
        }}
        title={isCollapsed ? 'عرض بطاقات الحالة' : 'إخفاء بطاقات الحالة'}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = isCollapsed
            ? '0 -6px 16px rgba(0, 0, 0, 0.2)'
            : '0 6px 16px rgba(0, 0, 0, 0.15)';
          e.currentTarget.style.transform = 'translateX(-50%) translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = isCollapsed
            ? '0 -4px 12px rgba(0, 0, 0, 0.15)'
            : '0 4px 12px rgba(0, 0, 0, 0.1)';
          e.currentTarget.style.transform = 'translateX(-50%)';
        }}
      >
        <ChevronUp
          size={20}
          style={{
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)'
          }}
        />
      </button>

      {/* Content */}
      {!isCollapsed && (
        <div
          style={{
            animation: 'slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            maxHeight: '200px',
            overflowY: 'auto'
          }}
        >
          <style>
            {`
              @keyframes slideUp {
                from {
                  opacity: 0;
                  transform: translateY(20px);
                }
                to {
                  opacity: 1;
                  transform: translateY(0);
                }
              }

              @keyframes slideDown {
                from {
                  opacity: 1;
                  transform: translateY(0);
                }
                to {
                  opacity: 0;
                  transform: translateY(20px);
                }
              }

              .collapse-toggle-btn:hover {
                background: linear-gradient(135deg, rgba(212, 175, 55, 1) 0%, rgba(212, 175, 55, 0.95) 100%) !important;
              }

              .collapse-toggle-btn:active {
                transform: translateX(-50%) scale(0.95) !important;
              }
            `}
          </style>
          <TaskStatusCards
            stats={stats}
            totalPaidAmount={totalPaidAmount}
            isLoading={isLoading}
          />
        </div>
      )}

      {/* Collapsed State Indicator */}
      {isCollapsed && (
        <div
          style={{
            height: '50px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            color: 'rgba(212, 175, 55, 0.8)',
            fontWeight: 500,
            cursor: 'pointer',
            userSelect: 'none'
          }}
          onClick={() => setIsCollapsed(false)}
        >
          اضغط لعرض إحصائيات المهام
        </div>
      )}
    </div>
  );
};

export default CollapsibleTaskStatusCards;