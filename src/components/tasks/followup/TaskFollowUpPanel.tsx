import React, { useEffect } from 'react';
import { MessageSquare, User } from 'lucide-react';
import { useDrawerStore } from '../../../stores/drawerStore';
import { useTaskMessages } from '../../../queries/taskMessageQueries';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

const TaskFollowUpPanel: React.FC = () => {
  const { isOpen, drawerType, props, closeDrawer } = useDrawerStore();
  
  const { taskId, taskName, clientName, highlightMessage } = props || {};

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeDrawer();
      }
    };

    if (isOpen && drawerType === 'taskFollowUp') {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, drawerType, closeDrawer]);

  const {
    data: messagesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useTaskMessages(taskId || 0);
  
  if (!isOpen || drawerType !== 'taskFollowUp') {
    return null;
  }

  const handleClose = () => {
    closeDrawer();
  };



  // Use props data first, then fallback to API data
  const taskInfo = {
    task_name: taskName || messagesData?.pages[0]?.task_info?.task_name || 'مهمة غير محددة',
    client_name: clientName || messagesData?.pages[0]?.task_info?.client_name || 'عميل غير محدد'
  };

  const totalMessages = messagesData?.pages[0]?.pagination?.total_messages || 0;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 transition-opacity"
        style={{ 
          zIndex: 1040
        }}
        onClick={handleClose}
      />
      
      {/* Drawer Panel */}
      <div 
        className="fixed right-0 top-0 h-full w-96 bg-card shadow-xl transition-transform flex flex-col"
        style={{ 
          zIndex: 1045,
          transform: 'translateX(0)'
        }}
      >
        {/* Header */}
        <div className="border-b border-border bg-muted/30 px-4 py-3">
          <div className="flex items-center">
            <div className="bg-primary/10 rounded p-2 mr-3">
              <MessageSquare className="text-primary" size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <h5 className="text-lg font-bold text-black mb-0">المتابعة والتعليقات</h5>
              <div className="text-sm text-black">
                <div className="truncate" style={{ maxWidth: '250px' }}>{taskInfo.task_name}</div>
                <div className="flex items-center mt-1">
                  <User size={12} className="mr-1" />
                  <span>{taskInfo.client_name}</span>
                  {totalMessages > 0 && (
                    <>
                      <span className="mx-1">•</span>
                      <span>{totalMessages} تعليق</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <button 
              type="button" 
              className="text-black hover:text-foreground transition-colors p-2"
              onClick={handleClose}
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages List */}
          <div 
            className="flex-1 overflow-auto transition-opacity"
            style={{
              opacity: isLoading ? 0.7 : 1
            }}
          >
            <MessageList
              messagesData={messagesData}
              isLoading={isLoading}
              error={error}
              onLoadMore={() => {
                if (hasNextPage && !isFetchingNextPage) {
                  fetchNextPage();
                }
              }}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              highlightMessage={highlightMessage}
            />
          </div>

          {/* Message Input */}
          <div 
            className="border-t border-border bg-white transition-transform"
            style={{
              transform: isLoading ? 'translateY(5px)' : 'translateY(0)'
            }}
          >
            <MessageInput taskId={taskId} />
          </div>
        </div>
      </div>
    </>
  );
};

export default TaskFollowUpPanel;
