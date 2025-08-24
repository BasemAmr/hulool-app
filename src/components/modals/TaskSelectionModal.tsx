import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useModalStore } from '../../stores/modalStore';
import { useGetTasks, useUpdateTask } from '../../queries/taskQueries';
import { useToast } from '../../hooks/useToast';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import { Check, Search } from 'lucide-react';
import type { Task } from '../../api/types';

interface TaskSelectionModalProps {
  tagId: number;
}

const TaskSelectionModal = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const closeModal = useModalStore((state) => state.closeModal);
  const props = useModalStore((state) => state.props as TaskSelectionModalProps);
  
  const [selectedTasks, setSelectedTasks] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: tasksData, isLoading } = useGetTasks({});
  const updateTaskMutation = useUpdateTask();
  
  const tasks = tasksData?.tasks || [];
  
  // Filter tasks based on search query
  const filteredTasks = tasks.filter((task: Task) => 
    (task.task_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (task.client?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTaskToggle = (taskId: number) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const handleAttachTag = async () => {
    if (selectedTasks.length === 0) {
      toast.error('خطأ', 'يرجى اختيار مهمة واحدة على الأقل');
      return;
    }

    try {
      let actionCount = 0;
      
      for (const taskId of selectedTasks) {
        const task = tasks.find((t: Task) => t.id === taskId);
        if (task) {
          const currentTags = Array.isArray(task.tags) 
            ? task.tags.map((tag: any) => typeof tag === 'object' ? tag.id.toString() : tag.toString())
            : [];
          
          const tagIdStr = props.tagId.toString();
          const isAlreadyTagged = currentTags.includes(tagIdStr);
          let updatedTags: string[];
          
          if (isAlreadyTagged) {
            // Remove the tag
            updatedTags = currentTags.filter(id => id !== tagIdStr);
          } else {
            // Add the tag
            updatedTags = [...currentTags, tagIdStr];
          }
          
          await updateTaskMutation.mutateAsync({
            id: taskId,
            taskData: {
              task_name: task.task_name || '',
              type: task.type,
              amount: task.amount,
              start_date: task.start_date,
              end_date: task.end_date || undefined,
              prepaid_amount: task.prepaid_amount,
              notes: task.notes || '',
              tags: updatedTags,
              requirements: task.requirements?.map((req: any) => ({
                id: req.id,
                requirement_text: req.requirement_text,
                is_provided: req.is_provided
              })) || []
            }
          });
          
          actionCount++;
        }
      }

      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['tag-collections'] });
      

      toast.success('نجح', `تم تحديث ${actionCount} مهمة بنجاح`);
      closeModal();
    } catch (error: any) {
      console.error('Error updating tags for tasks:', error);
      toast.error('خطأ', error?.response?.data?.message || 'حدث خطأ أثناء تحديث العلامة');
    }
  };

  const isTaskAlreadyTagged = (task: Task) => {
    if (!task.tags) return false;
    const taskTags = Array.isArray(task.tags) 
      ? task.tags.map((tag: any) => typeof tag === 'object' ? tag.id.toString() : tag.toString())
      : [];
    return taskTags.includes(props.tagId.toString());
  };

  return (
    <BaseModal
      isOpen={true}
      onClose={closeModal}
      title="اختيار المهام لإدارة العلامة"
    >
      <div className="task-selection-modal">
        {/* Search Input */}
        <div className="mb-3">
          <div className="input-group">
            <span className="input-group-text">
              <Search size={16} />
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="البحث في المهام..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Tasks List */}
        <div className="tasks-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {isLoading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">جاري التحميل...</span>
              </div>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-4 text-muted">
              {searchQuery ? 'لا توجد مهام تطابق البحث' : 'لا توجد مهام متاحة'}
            </div>
          ) : (
            filteredTasks.map((task: Task) => {
              const isTagged = isTaskAlreadyTagged(task);
              const isSelected = selectedTasks.includes(task.id);
              
              return (
                <div
                  key={task.id}
                  className={`task-item p-3 mb-2 border rounded cursor-pointer ${
                    isSelected ? 'border-primary bg-light' : 'border-secondary'
                  }`}
                  onClick={() => handleTaskToggle(task.id)}
                  style={{ 
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleTaskToggle(task.id)}
                          className="form-check-input me-3"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div>
                          <h6 className="mb-1">{task.task_name}</h6>
                          <small className="text-muted">
                            العميل: {task.client?.name || 'غير محدد'} | 
                            المبلغ: {task.amount} ريال
                          </small>
                          <div className="mt-1">
                            <span className={`badge ${isTagged ? 'bg-success' : 'bg-secondary'}`}>
                              <Check size={12} className="me-1" />
                              {isTagged ? 'مرتبط' : 'غير مرتبط'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer d-flex justify-content-between align-items-center">
          <div className="text-muted small">
            {selectedTasks.length > 0 && `تم اختيار ${selectedTasks.length} مهمة`}
          </div>
          <div>
            <Button variant="secondary" onClick={closeModal} className="me-2">
              إلغاء
            </Button>
            <Button 
              variant="primary" 
              onClick={handleAttachTag}
              disabled={selectedTasks.length === 0 || updateTaskMutation.isPending}
              isLoading={updateTaskMutation.isPending}
            >
              تحديث العلامة للمهام المختارة
            </Button>
          </div>
        </div>
      </div>

      <style>{`
        .task-item:hover:not(.opacity-50) {
          background-color: #f8f9fa ;
        }
        
        .task-selection-modal .form-check-input:disabled {
          opacity: 0.5;
        }
      `}</style>
    </BaseModal>
  );
};

export default TaskSelectionModal;
