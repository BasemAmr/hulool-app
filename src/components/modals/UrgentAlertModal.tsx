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
      <div style={{ direction: 'rtl' }}>
        <div className="modal-body">
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

          {/* Action Buttons */}
          <div className="d-flex gap-2 mb-3">
            <Button
              variant="danger"
              onClick={() => handleToggleUrgent(true)}
              disabled={selectedTasks.length === 0 || updateTaskMutation.isPending}
            >
              <AlertTriangle size={16} className="me-2" />
              إضافة تنبيه عاجل
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleToggleUrgent(false)}
              disabled={selectedTasks.length === 0 || updateTaskMutation.isPending}
            >
              <X size={16} className="me-2" />
              إزالة التنبيه العاجل
            </Button>
          </div>

          {/* Tasks List */}
          <div className="tasks-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {isLoadingTasks ? (
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
                const isUrgent = isTaskUrgent(task);
                const isSelected = selectedTasks.includes(task.id);

                return (
                  <div
                    key={task.id}
                    className={`task-item p-3 mb-2 border rounded cursor-pointer ${isSelected ? 'border-primary bg-light' : 'border-secondary'
                      }`}
                    onClick={() => handleTaskToggle(task.id)}
                    style={{ cursor: 'pointer', transition: 'all 0.2s' }}
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
                            {isUrgent && (
                              <div className="mt-1">
                                <span className="badge bg-danger">
                                  <AlertTriangle size={12} className="me-1" />
                                  عاجل
                                </span>
                              </div>
                            )}
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
            <Button
              variant="secondary"
              onClick={closeModal}
              disabled={updateTaskMutation.isPending}
            >
              إلغاء
            </Button>
          </div>
        </div>
      </div>

      <style>{`
        .task-item:hover {
          background-color: #f8f9fa ;
        }
      `}</style>
    </BaseModal>
  );
};

export default UrgentAlertModal;