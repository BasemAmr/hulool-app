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
  highlightMessage?: number;
}

const MessageList: React.FC<MessageListProps> = ({
  messagesData,
  isLoading,
  error,
  onLoadMore,
  hasNextPage,
  isFetchingNextPage,
  highlightMessage,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Auto-scroll to bottom when new messages arrive (only for the first page)
  useEffect(() => {
    if (messagesData?.pages.length === 1) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messagesData?.pages[0]?.messages.length]);

  // Scroll to and highlight specific message when highlightMessage is provided
  useEffect(() => {
    if (highlightMessage && messagesData?.pages) {
      console.log('Attempting to highlight message ID:', highlightMessage);
      
      // Find all messages across all pages
      const allMessages = messagesData.pages.flatMap(page => page.messages);
      const targetMessage = allMessages.find(msg => msg.id === highlightMessage);
      
      if (targetMessage) {
        console.log('Found target message:', targetMessage);
        
        // Wait a bit for the DOM to be ready
        setTimeout(() => {
          const messageElement = messageRefs.current.get(highlightMessage);
          if (messageElement) {
            console.log('Scrolling to message element');
            messageElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            });
            
            // Add highlight animation
            messageElement.style.backgroundColor = 'rgba(255, 193, 7, 0.3)';
            messageElement.style.transition = 'background-color 0.5s ease';
            
            // Remove highlight after 3 seconds
            setTimeout(() => {
              messageElement.style.backgroundColor = '';
            }, 3000);
          } else {
            console.log('Message element not found in DOM');
          }
        }, 500);
      } else {
        console.log('Target message not found in loaded messages');
      }
    }
  }, [highlightMessage, messagesData]);

  // Helper function to set message refs
  const setMessageRef = (messageId: number, element: HTMLDivElement | null) => {
    if (element) {
      messageRefs.current.set(messageId, element);
    } else {
      messageRefs.current.delete(messageId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-center">
          <Loader2 className="text-primary mb-2 animate-spin" size={24} />
          <p className="text-sm text-black mb-0">جاري تحميل التعليقات...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-center">
          <AlertCircle className="text-red-600 mb-3" size={32} />
          <h6 className="text-black mb-1 font-semibold">خطأ في تحميل التعليقات</h6>
          <p className="text-sm text-black mb-3">
            {error?.message || 'حدث خطأ غير متوقع'}
          </p>
          <button 
            className="px-4 py-2 text-sm border border-primary text-primary rounded-md hover:bg-primary/10 transition-colors"
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
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-center">
          <MessageSquare className="text-black mb-3" size={48} />
          <h6 className="text-black mb-1 font-semibold">لا توجد تعليقات بعد</h6>
          <p className="text-sm text-black mb-0">
            ابدأ بإضافة تعليق حول هذه المهمة
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={scrollContainerRef}
      className="h-full overflow-auto"
    >
      {/* Load More Button (at top for older messages) */}
      {hasNextPage && (
        <div className="text-center p-3 border-b border-border">
          <button
            className="px-4 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors disabled:opacity-50"
            onClick={onLoadMore}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 size={12} className="inline mr-1 animate-spin" />
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
          <MessageItem 
            key={`${message.id}-${index}`} 
            message={message}
            ref={(el) => setMessageRef(message.id, el)}
          />
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

const MessageItem = React.forwardRef<HTMLDivElement, MessageItemProps>(({ message }, ref) => {
  const isSystemMessage = message.is_system_message;
  
  if (isSystemMessage) {
    return (
      <div ref={ref} className="text-center mb-2">
        <div className="inline-block bg-muted rounded px-2 py-1">
          <div className="flex items-center">
            <Bot size={12} className="text-black mr-1" />
            <small className="text-black">{message.message_content}</small>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="flex mb-2">
      {/* Avatar */}
      <div className="flex-shrink-0 mr-2">
        <div className="bg-primary/10 rounded-full flex items-center justify-center" style={{ width: '28px', height: '28px' }}>
          <User size={14} className="text-primary" />
        </div>
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0">
        <div className="bg-muted rounded p-2">
          <div className="flex items-center justify-between mb-1">
            <small className="font-medium text-black mb-0">
              {message.employee_name}
            </small>
            <small className="text-black">
              {message.created_at_formatted}
            </small>
          </div>
          <p className="text-sm mb-0 text-black" style={{ lineHeight: '1.3' }}>
            {message.message_content}
          </p>
        </div>
      </div>
    </div>
  );
});

export default MessageList;
