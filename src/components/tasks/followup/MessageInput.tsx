import React, { useState, useRef, type KeyboardEvent } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { useCreateTaskMessage } from '../../../queries/taskMessageQueries';
import { useToast } from '../../../hooks/useToast';

interface MessageInputProps {
  taskId: number;
}

const MessageInput: React.FC<MessageInputProps> = ({ taskId }) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const createMessageMutation = useCreateTaskMessage();
  const { success, error } = useToast();

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      return;
    }

    try {
      await createMessageMutation.mutateAsync({
        taskId,
        payload: {
          message_content: trimmedMessage,
        },
      });

      // Reset form
      setMessage('');
      
      // Focus back to textarea
      textareaRef.current?.focus();
      
      success('تم إرسال الرسالة بنجاح', 'تم إضافة الرسالة بنجاح');
    } catch (err) {
      console.error('Error sending message:', err);
      error('فشل في إرسال الرسالة', 'حدث خطأ أثناء إرسال الرسالة');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  };

  const isLoading = createMessageMutation.isPending;
  const canSend = message.trim().length > 0 && !isLoading;

  return (
    <div className="p-3">
      {/* Input Form */}
      <form onSubmit={handleSubmit}>
        <div className="d-flex">
          <div className="flex-grow-1 me-2">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="اكتب تعليق..."
              className="form-control form-control-sm"
              rows={1}
              style={{ minHeight: '38px', maxHeight: '120px', resize: 'none' }}
              disabled={isLoading}
            />
            
            {/* Character count and hint */}
            <div className="d-flex justify-content-between align-items-center mt-1">
              <small className="text-muted">
                {message.length > 0 && `${message.length} حرف`}
              </small>
              <small className="text-muted">
                Enter للإرسال • Shift+Enter للسطر الجديد
              </small>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-sm align-self-start"
            disabled={!canSend}
            style={{ minWidth: '38px' }}
          >
            {isLoading ? (
              <Loader2 size={16} />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MessageInput;
