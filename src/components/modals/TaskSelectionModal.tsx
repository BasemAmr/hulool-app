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
      <div className="task-selection-modal space-y-4">
        {/* Search Input */}
        <div className="flex items-center gap-2 border border-border rounded-md">
          <span className="px-3 text-muted-foreground">
            <Search size={16} />
          </span>
          <input
            type="text"
            className="flex-1 px-3 py-2 border-0 focus:outline-none focus:ring-0 bg-transparent"
            placeholder="البحث في المهام..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Tasks List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-4">
              <div className="inline-block animate-spin text-primary">
                <div className="h-6 w-6 border-3 border-primary border-t-transparent rounded-full"></div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">جاري التحميل...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              {searchQuery ? 'لا توجد مهام تطابق البحث' : 'لا توجد مهام متاحة'}
            </div>
          ) : (
            filteredTasks.map((task: Task) => {
              const isTagged = isTaskAlreadyTagged(task);
              const isSelected = selectedTasks.includes(task.id);
              
              return (
                <div
                  key={task.id}
                  className={`task-item p-3 rounded-lg border cursor-pointer transition-colors ${
                    isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                  }`}
                  onClick={() => handleTaskToggle(task.id)}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleTaskToggle(task.id)}
                      className="mt-1 rounded cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1">
                      <h6 className="font-semibold text-black text-sm">{task.task_name}</h6>
                      <small className="text-muted-foreground text-xs block">
                        العميل: {task.client?.name || 'غير محدد'} | 
                        المبلغ: {task.amount} ريال
                      </small>
                      <div className="mt-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold text-white ${isTagged ? 'bg-green-600' : 'bg-gray-400'}`}>
                          <Check size={12} className="inline mr-1" />
                          {isTagged ? 'مرتبط' : 'غير مرتبط'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t border-border">
          <div className="text-muted-foreground text-xs">
            {selectedTasks.length > 0 && `تم اختيار ${selectedTasks.length} مهمة`}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={closeModal}>
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
          background-color: var(--color-muted-50) ;
        }
      `}</style>
    </BaseModal>
  );
};

export default TaskSelectionModal;
