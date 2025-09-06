import React, { useEffect, useRef } from 'react';
import { type InfiniteData } from '@tanstack/react-query';
import { Loader2, AlertCircle, Bot, User, MessageSquare } from 'lucide-react';
import { type TaskMessage, type TaskMessagePaginatedData } from '../../../queries/taskMessageQueries';

interface MessageListProps {
  messagesData?: InfiniteData<TaskMessagePaginatedData>;
  isLoading: boolean;
  error: any;
  onLoadMore: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
}

const MessageList: React.FC<MessageListProps> = ({
  messagesData,
  isLoading,
  error,
  onLoadMore,
  hasNextPage,
  isFetchingNextPage,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive (only for the first page)
  useEffect(() => {
    if (messagesData?.pages.length === 1) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messagesData?.pages[0]?.messages.length]);

  if (isLoading) {
    return (
      <div className="d-flex align-items-center justify-content-center h-100 p-4">
        <div className="text-center">
          <Loader2 className="text-primary mb-2" size={24} />
          <p className="small text-muted mb-0">جاري تحميل التعليقات...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="d-flex align-items-center justify-content-center h-100 p-4">
        <div className="text-center">
          <AlertCircle className="text-danger mb-3" size={32} />
          <h6 className="text-dark mb-1">خطأ في تحميل التعليقات</h6>
          <p className="small text-muted mb-3">
            {error?.message || 'حدث خطأ غير متوقع'}
          </p>
          <button 
            className="btn btn-outline-primary btn-sm"
            onClick={() => window.location.reload()}
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  const allMessages = messagesData?.pages.flatMap(page => page.messages) || [];

  if (allMessages.length === 0) {
    return (
      <div className="d-flex align-items-center justify-content-center h-100 p-4">
        <div className="text-center">
          <MessageSquare className="text-muted mb-3" size={48} />
          <h6 className="text-dark mb-1">لا توجد تعليقات بعد</h6>
          <p className="small text-muted mb-0">
            ابدأ بإضافة تعليق حول هذه المهمة
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={scrollContainerRef}
      className="h-100 overflow-auto"
    >
      {/* Load More Button (at top for older messages) */}
      {hasNextPage && (
        <div className="text-center p-3 border-bottom">
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={onLoadMore}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 size={12} className="me-1" />
                جاري التحميل...
              </>
            ) : (
              'تحميل تعليقات أقدم'
            )}
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="p-2">
        {/* Reverse the order to show newest first */}
        {[...allMessages].reverse().map((message, index) => (
          <MessageItem key={`${message.id}-${index}`} message={message} />
        ))}
      </div>

      {/* Bottom reference for auto-scroll */}
      <div ref={bottomRef} />
    </div>
  );
};

interface MessageItemProps {
  message: TaskMessage;
}

const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const isSystemMessage = message.is_system_message;
  
  if (isSystemMessage) {
    return (
      <div className="text-center mb-2">
        <div className="d-inline-block bg-light rounded px-2 py-1">
          <div className="d-flex align-items-center">
            <Bot size={12} className="text-muted me-1" />
            <small className="text-muted">{message.message_content}</small>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex mb-2">
      {/* Avatar */}
      <div className="flex-shrink-0 me-2">
        <div className="bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center" style={{ width: '28px', height: '28px' }}>
          <User size={14} className="text-primary" />
        </div>
      </div>

      {/* Message Content */}
      <div className="flex-grow-1 min-w-0">
        <div className="bg-light rounded p-2">
          <div className="d-flex align-items-center justify-content-between mb-1">
            <small className="fw-medium text-dark mb-0">
              {message.employee_name}
            </small>
            <small className="text-muted">
              {message.created_at_formatted}
            </small>
          </div>
          <p className="small mb-0 text-dark" style={{ lineHeight: '1.3' }}>
            {message.message_content}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MessageList;
