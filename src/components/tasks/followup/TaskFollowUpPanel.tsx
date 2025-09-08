import React from 'react';
import { MessageSquare, User } from 'lucide-react';
import { useDrawerStore } from '../../../stores/drawerStore';
import { useTaskMessages } from '../../../queries/taskMessageQueries';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

const TaskFollowUpPanel: React.FC = () => {
  const { isOpen, drawerType, props, closeDrawer } = useDrawerStore();
  
  const { taskId, taskName, clientName, highlightMessage } = props || {};

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

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
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
        className="modal-backdrop fade show"
        onClick={handleBackdropClick}
        style={{ 
          zIndex: 1040,
          transition: 'opacity 0.3s ease-in-out'
        }}
      />
      
      {/* Offcanvas Panel */}
      <div 
        className="offcanvas offcanvas-end show" 
        tabIndex={-1} 
        style={{ 
          zIndex: 1045, 
          width: '400px',
          transition: 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          transform: 'translateX(0)',
          boxShadow: '-2px 0 10px rgba(0, 0, 0, 0.1)'
        }}
      >
        {/* Header */}
        <div className="offcanvas-header border-bottom bg-light">
          <div className="d-flex align-items-center">
            <div className="bg-primary bg-opacity-10 rounded p-2 me-3">
              <MessageSquare className="text-primary" size={20} />
            </div>
            <div>
              <h5 className="offcanvas-title mb-0">المتابعة والتعليقات</h5>
              <div className="small text-muted">
                <div className="text-truncate" style={{ maxWidth: '250px' }}>{taskInfo.task_name}</div>
                <div className="d-flex align-items-center mt-1">
                  <User size={12} className="me-1" />
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
          </div>
          <button 
            type="button" 
            className="btn-close" 
            onClick={handleClose}
            aria-label="Close"
          ></button>
        </div>

        {/* Content Area */}
        <div className="offcanvas-body p-0 d-flex flex-column">
          {/* Messages List */}
          <div 
            className="flex-grow-1 overflow-auto"
            style={{
              transition: 'opacity 0.2s ease-in-out',
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
            className="border-top bg-white"
            style={{
              transition: 'transform 0.2s ease-in-out',
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
