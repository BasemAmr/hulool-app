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
        backgroundColor: 'var(--token-bg-surface)',
        borderTop: '1px solid var(--token-border-default)',
        boxShadow: isCollapsed ? 'var(--token-shadow-lg)' : 'var(--token-shadow-xl)',
        padding: isCollapsed ? '0' : '0.25rem 1rem',
        borderRadius: isCollapsed ? '24px 24px 0 0' : '0',
        overflow: isCollapsed ? 'visible' : 'hidden'
      }}
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{
          position: 'absolute',
          top: isCollapsed ? -14 : -28,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '48px',
          height: '48px',
          borderRadius: isCollapsed ? '24px 24px 0 0' : '0 0 24px 24px',
          backgroundColor: 'var(--token-bg-surface)',
          border: '1px solid var(--token-border-default)',
          color: 'var(--token-text-primary)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: 'var(--token-shadow-lg)',
          zIndex: 1001,
          padding: 0,
          outline: 'none'
        }}
        title={isCollapsed ? 'عرض بطاقات الحالة' : 'إخفاء بطاقات الحالة'}
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
        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
          <TaskStatusCards
            stats={stats}
            totalPaidAmount={totalPaidAmount}
            isLoading={isLoading}
          />
        </div>
      )}

      {/* Collapsed indicator */}
      {isCollapsed && (
        <div
          style={{
            height: '50px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            color: 'var(--token-text-secondary)',
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
