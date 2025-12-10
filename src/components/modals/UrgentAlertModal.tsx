import { useState, useEffect } from 'react';
import { AlertTriangle, Search, X } from 'lucide-react';
import { useModalStore } from '../../stores/modalStore';
import { useGetTasks, useUpdateTask } from '../../queries/taskQueries';
import { useGetTags } from '../../queries/tagQueries';
import { useToast } from '../../hooks/useToast';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import type { Task } from '../../api/types';
import type { Tag } from '../../api/types';



const UrgentAlertModal = () => {
  const closeModal = useModalStore((state) => state.closeModal);
  const props = useModalStore((state) => state.props);
  const { success, error } = useToast();
  const updateTaskMutation = useUpdateTask();

  const { data: tasksData, isLoading: isLoadingTasks } = useGetTasks({});
  const { data: tagsData } = useGetTags();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTasks, setSelectedTasks] = useState<number[]>([]);
  const [urgentTag, setUrgentTag] = useState<Tag | null>(null);

  const tasks = tasksData?.tasks || [];
  const tags = tagsData || [];

  useEffect(() => {
    // console.log('Tags from API:', tags.map(t => t.name));

    const urgent = tags.find(tag =>
      tag.name?.trim().toLowerCase() === 'قصوى'.toLowerCase()
    );

    setUrgentTag(urgent || null);
  }, [tags]);
  useEffect(() => {
    // If specific task ID is provided, select it
    if (props?.taskId) {
      setSelectedTasks([props.taskId]);
    }
  }, [props?.taskId]);

  const handleTaskToggle = (taskId: number) => {
    setSelectedTasks(prev =>
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const isTaskUrgent = (task: Task) => {
    if (!urgentTag || !task.tags) return false;
    const taskTags = Array.isArray(task.tags)
      ? task.tags.map((tag: any) => typeof tag === 'object' ? tag.id : tag)
      : [];
    return taskTags.includes(urgentTag.id);
  };

  const handleToggleUrgent = async (isAdding: boolean) => {
    if (!urgentTag) {
      error('خطأ', 'لم يتم العثور على علامة "قصوى"');
      return;
    }

    if (selectedTasks.length === 0) {
      error('خطأ', 'يرجى اختيار مهمة واحدة على الأقل');
      return;
    }

    try {
      for (const taskId of selectedTasks) {
        const task = tasks.find((t: Task) => t.id === taskId);
        if (task) {
          const currentTags = Array.isArray(task.tags)
            ? task.tags.map((tag: any) => typeof tag === 'object' ? tag.id : tag)
            : [];

          let updatedTags: string[];

          if (isAdding) {
            // Add urgent tag if not already present
            updatedTags = currentTags.includes(urgentTag.id)
              ? currentTags
              : [...currentTags, urgentTag.id];
          } else {
            // Remove urgent tag
            updatedTags = currentTags.filter(id => id !== urgentTag.id);
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
        }
      }

      success('نجح', `تم ${isAdding ? 'إضافة' : 'إزالة'} التنبيه العاجل بنجاح`);
      closeModal();
    } catch (err: any) {
      console.error('Error toggling urgent alert:', err);
      error('خطأ', err?.response?.data?.message || 'حدث خطأ أثناء المعالجة');
    }
  };

  // Filter tasks based on search query
  const filteredTasks = tasks.filter((task: Task) =>
    (task.task_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (task.client?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <BaseModal
      isOpen={true}
      onClose={closeModal}
      title="إضافة تنبيه عاجل"
    >
      <div style={{ direction: 'rtl' }} className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            className="w-full pl-10 pr-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="البحث في المهام..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="danger"
            onClick={() => handleToggleUrgent(true)}
            disabled={selectedTasks.length === 0 || updateTaskMutation.isPending}
            className="flex-1"
          >
            <AlertTriangle size={16} className="mr-2" />
            إضافة تنبيه عاجل
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleToggleUrgent(false)}
            disabled={selectedTasks.length === 0 || updateTaskMutation.isPending}
            className="flex-1"
          >
            <X size={16} className="mr-2" />
            إزالة التنبيه العاجل
          </Button>
        </div>

        {/* Tasks List */}
        <div className="max-h-96 overflow-y-auto border border-border rounded-lg">
          {isLoadingTasks ? (
            <div className="text-center py-8">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-r-transparent" />
              <p className="mt-2 text-muted-foreground text-sm">جاري التحميل...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {searchQuery ? 'لا توجد مهام تطابق البحث' : 'لا توجد مهام متاحة'}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredTasks.map((task: Task) => {
                const isUrgent = isTaskUrgent(task);
                const isSelected = selectedTasks.includes(task.id);

                return (
                  <div
                    key={task.id}
                    className={`p-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                      isSelected ? 'bg-primary/10 border-l-2 border-primary' : ''
                    }`}
                    onClick={() => handleTaskToggle(task.id)}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleTaskToggle(task.id)}
                        className="rounded mt-0.5"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <h6 className="font-semibold text-black text-sm truncate">{task.task_name}</h6>
                        <p className="text-muted-foreground text-xs mt-1">
                          العميل: {task.client?.name || 'غير محدد'} | المبلغ: {task.amount} ريال
                        </p>
                        {isUrgent && (
                          <div className="mt-2">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-destructive/10 text-destructive text-xs font-medium">
                              <AlertTriangle size={12} />
                              عاجل
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t border-border">
          <div className="text-muted-foreground text-xs">
            {selectedTasks.length > 0 && `تم اختيار ${selectedTasks.length} مهمة`}
          </div>
          <Button
            variant="secondary"
            onClick={closeModal}
            disabled={updateTaskMutation.isPending}
          >
            إلغاء
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};

export default UrgentAlertModal;