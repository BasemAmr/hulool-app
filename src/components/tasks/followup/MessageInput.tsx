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
        <div className="flex">
          <div className="flex-1 mr-2">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="اكتب تعليق..."
              className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background text-black focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors disabled:opacity-50"
              rows={1}
              style={{ minHeight: '38px', maxHeight: '120px', resize: 'none' }}
              disabled={isLoading}
            />
            
            {/* Character count and hint */}
            <div className="flex justify-between items-center mt-1">
              <small className="text-black">
                {message.length > 0 && `${message.length} حرف`}
              </small>
              <small className="text-black">
                Enter للإرسال • Shift+Enter للسطر الجديد
              </small>
            </div>
          </div>

          <button
            type="submit"
            className="bg-primary text-white px-3 py-2 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed self-start"
            disabled={!canSend}
            style={{ minWidth: '38px' }}
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" />
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
