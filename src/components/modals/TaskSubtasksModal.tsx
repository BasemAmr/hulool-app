import { useState } from 'react';
import { Layers, DollarSign, X, Save, Plus, Edit, Check, XCircle, AlertTriangle } from 'lucide-react';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { useModalStore } from '../../stores/modalStore';
import { useUpdateTask } from '../../queries/taskQueries';
import { useToast } from '../../hooks/useToast';
import type { Task } from '../../api/types';
import { TOAST_MESSAGES } from '../../constants/toastMessages';

interface Subtask {
  id?: number;
  description: string;
  amount: number;
  is_completed: boolean;
}

interface TaskSubtasksModalProps {
  task: Task;
}

const TaskSubtasksModal = () => {
  const { success, error } = useToast();
  const closeModal = useModalStore((state) => state.closeModal);
  const openModal = useModalStore((state) => state.openModal);
  const props = useModalStore((state) => state.props as TaskSubtasksModalProps);
  
  const { task } = props;
  
  const [localSubtasks, setLocalSubtasks] = useState<Subtask[]>(
    (task.subtasks && task.subtasks.length > 0) 
      ? [...task.subtasks] 
      : [{ description: '', amount: 0, is_completed: false }]
  );
  
  const [errors, setErrors] = useState<{ [key: number]: { description?: string; amount?: string } }>({});
  const [hasChanges, setHasChanges] = useState(false);
  
  const updateTaskMutation = useUpdateTask();

  // Check if amount should be disabled (when subtasks exist and sum matches amount)
  const shouldDisableAmount = () => {
    if (!localSubtasks || localSubtasks.length === 0) {
      return false;
    }

    const subtasksTotal = localSubtasks.reduce((sum, subtask) => sum + (subtask.amount || 0), 0);
    const currentAmount = task.amount || 0;
    
    // Allow for small floating point differences
    return Math.abs(currentAmount - subtasksTotal) < 0.01;
  };

  const hasSubtasks = () => {
    return localSubtasks && localSubtasks.length > 0;
  };

  const validateSubtask = (subtask: Subtask) => {
    const subtaskErrors: { description?: string; amount?: string } = {};
    
    if (!subtask.description.trim()) {
      subtaskErrors.description = 'وصف المهمة الفرعية مطلوب';
    }
    
    if (subtask.amount <= 0) {
      subtaskErrors.amount = 'يجب أن يكون المبلغ أكبر من صفر';
    }
    
    return subtaskErrors;
  };

  const handleSubtaskChange = (index: number, field: keyof Subtask, value: string | number | boolean) => {
    const updatedSubtasks = [...localSubtasks];
    if (field === 'amount') {
      updatedSubtasks[index] = { ...updatedSubtasks[index], [field]: Number(value) };
    } else {
      updatedSubtasks[index] = { ...updatedSubtasks[index], [field]: value };
    }
    setLocalSubtasks(updatedSubtasks);
    setHasChanges(true);
    
    // Clear errors for this field
    if (errors[index]) {
      const newErrors = { ...errors };
      delete newErrors[index]?.[field as keyof typeof newErrors[number]];
      if (Object.keys(newErrors[index] || {}).length === 0) {
        delete newErrors[index];
      }
      setErrors(newErrors);
    }
  };

  const addSubtask = () => {
    setLocalSubtasks([...localSubtasks, { description: '', amount: 0, is_completed: false }]);
    setHasChanges(true);
  };

  const removeSubtask = (index: number) => {
    if (localSubtasks.length > 1) {
      const updatedSubtasks = localSubtasks.filter((_, i) => i !== index);
      setLocalSubtasks(updatedSubtasks);
      setHasChanges(true);
      
      // Remove errors for this index and adjust indices
      const newErrors = { ...errors };
      delete newErrors[index];
      
      // Adjust error indices for remaining items
      const adjustedErrors: typeof errors = {};
      Object.keys(newErrors).forEach(key => {
        const numKey = Number(key);
        if (numKey > index) {
          adjustedErrors[numKey - 1] = newErrors[numKey];
        } else if (numKey < index) {
          adjustedErrors[numKey] = newErrors[numKey];
        }
      });
      
      setErrors(adjustedErrors);
    }
  };

  const handleSave = async () => {
    // Filter out empty subtasks
    const validSubtasks = localSubtasks.filter(subtask => 
      subtask.description.trim() && subtask.amount > 0
    );

    // Validate all subtasks
    const allErrors: { [key: number]: { description?: string; amount?: string } } = {};
    let hasErrors = false;

    validSubtasks.forEach((subtask, index) => {
      const subtaskErrors = validateSubtask(subtask);
      if (Object.keys(subtaskErrors).length > 0) {
        allErrors[index] = subtaskErrors;
        hasErrors = true;
      }
    });

    if (hasErrors) {
      setErrors(allErrors);
      return;
    }

    try {
      // Calculate the new total amount from subtasks
      const calculatedAmount = validSubtasks.reduce((sum, subtask) => sum + (subtask.amount || 0), 0);
      
      await updateTaskMutation.mutateAsync({
        id: task.id,
        taskData: {
          task_name: task.task_name || '',
          type: task.type,
          amount: calculatedAmount, // Update amount to match subtasks total
          start_date: task.start_date,
          end_date: task.end_date || undefined,
          prepaid_amount: task.prepaid_amount,
          notes: task.notes || '',
          tags: task.tags ? task.tags.map(tag => typeof tag === 'object' ? String(tag.id || tag) : String(tag)) : [],
          amount_details: task.amount_details || [],
          subtasks: validSubtasks
        }
      });

      success(TOAST_MESSAGES.TASK_UPDATED);
      setHasChanges(false);
      closeModal();
    } catch (err: any) {
      error(TOAST_MESSAGES.OPERATION_FAILED, err.message);
    }
  };

  const handleHeaderEdit = () => {
    if (hasChanges) {
      // Show confirmation modal
      openModal('confirmDelete', {
        title: 'حفظ التغييرات؟',
        message: 'لديك تغييرات غير محفوظة. هل تريد حفظ التغييرات قبل الانتقال لتحرير المهمة؟',
        onConfirm: async () => {
          try {
            await handleSave();
            // After saving (which updates the amount), open TaskModal in edit mode
            openModal('taskForm', { taskToEdit: { ...task, amount: calculateTotal() }, client: task.client });
          } catch (err) {
            // Error handling is already done in handleSave
          }
        }
      });
    } else {
      // No changes, directly open TaskModal
      closeModal();
      openModal('taskForm', { taskToEdit: task, client: task.client });
    }
  };

  const calculateTotal = () => {
    return localSubtasks.reduce((sum, subtask) => sum + (subtask.amount || 0), 0);
  };

  const calculateProgress = () => {
    const validSubtasks = localSubtasks.filter(subtask => 
      subtask.description.trim() && subtask.amount > 0
    );
    
    if (validSubtasks.length === 0) return { completed: 0, total: 0, percentage: 0 };
    
    const completed = validSubtasks.filter(subtask => subtask.is_completed).length;
    const total = validSubtasks.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { completed, total, percentage };
  };

  const hasValidSubtasks = localSubtasks.some(subtask => 
    subtask.description.trim() && subtask.amount > 0
  );

  const progress = calculateProgress();

  return (
    <BaseModal 
      isOpen={true} 
      onClose={closeModal} 
      title={`المهام الفرعية - ${task.task_name || `مهمة ${task.type}`}`}
      className="task-subtasks-modal"
    >
      <div className="max-h-screen overflow-y-auto space-y-4">
        {/* Header Edit Button */}
        <div className="flex justify-end">
          <Button
            variant="outline-success"
            size="sm"
            onClick={handleHeaderEdit}
            className="flex items-center gap-1"
          >
            <Edit size={16} />
            تحرير المهمة
          </Button>
        </div>
        {hasValidSubtasks && (
          <div className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg border border-gray-300 p-4 space-y-3">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="font-semibold mb-3 flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: progress.percentage === 100 ? '#28a745' : progress.percentage > 0 ? '#ffc107' : '#6c757d'
                    }}
                  ></div>
                  تقدم إنجاز المهام الفرعية
                </div>
                <div className="w-full h-2 bg-gray-300 rounded-full overflow-hidden">
                  <div 
                    className="h-full transition-all duration-300 ease-out"
                    style={{ 
                      width: `${progress.percentage}%`,
                      backgroundColor: progress.percentage === 100 ? '#28a745' : progress.percentage > 0 ? '#ffc107' : '#6c757d'
                    }}
                  ></div>
                </div>
                <small className="text-muted-foreground text-sm mt-2 block">
                  {progress.completed} من {progress.total} مهام مكتملة ({progress.percentage}%)
                </small>
              </div>
              <div className="text-right">
                <div className="font-semibold text-lg flex items-center justify-end gap-1">
                  <DollarSign size={20} className="text-yellow-600" />
                  {calculateTotal().toLocaleString()} ريال
                </div>
                <small className="text-muted-foreground text-sm">المجموع الإجمالي</small>
                {hasSubtasks() && (
                  <div className="mt-2">
                    <span className="inline-block bg-blue-100 text-blue-900 text-xs px-2 py-1 rounded">
                      محسوب من المهام الفرعية
                    </span>
                  </div>
                )}
                {shouldDisableAmount() && (
                  <small className="text-muted-foreground text-xs mt-1 block">
                    المبلغ محسوب تلقائياً من المهام الفرعية ({localSubtasks.length} مهمة)
                  </small>
                )}
                {hasSubtasks() && !shouldDisableAmount() && (
                  <small className="text-blue-600 text-xs mt-1 block">
                    هذه المهمة تحتوي على {localSubtasks.length} مهام فرعية
                  </small>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="rounded-lg border border-blue-600 bg-blue-50 p-4 flex gap-3">
          <Layers size={18} className="text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <div className="font-semibold mb-1">إدارة المهام الفرعية</div>
            <small className="text-muted-foreground text-sm">
              يمكنك تتبع وإدارة المهام الفرعية، وتحديد حالة الإنجاز لكل مهمة. اضغط على "تحرير المهمة" للوصول للتحرير الكامل.
            </small>
          </div>
        </div>

        {/* Subtasks List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {localSubtasks.map((subtask, index) => (
            <div 
              key={index} 
              className="rounded-lg border border-gray-200 p-4 transition-all duration-200 hover:shadow-md"
              style={{ 
                backgroundColor: subtask.is_completed ? '#f8f9fa' : 'white'
              }}
            >
              <div className="grid grid-cols-6 gap-4 items-start">
                {/* Completion Status */}
                <div className="flex justify-center">
                  <input
                    type="checkbox"
                    checked={subtask.is_completed}
                    onChange={(e) => handleSubtaskChange(index, 'is_completed', e.target.checked)}
                    className="w-5 h-5 rounded cursor-pointer accent-green-600"
                  />
                </div>
                
                {/* Description */}
                <div className="col-span-2">
                  <label className="font-medium text-black text-sm block mb-2">وصف المهمة الفرعية</label>
                  <Input
                    value={subtask.description}
                    onChange={(e) => handleSubtaskChange(index, 'description', e.target.value)}
                    placeholder="مثال: تصميم الواجهة"
                    className={errors[index]?.description ? 'border-destructive bg-destructive/5' : ''}
                    style={{
                      textDecoration: subtask.is_completed ? 'line-through' : 'none',
                      opacity: subtask.is_completed ? 0.7 : 1
                    }}
                  />
                  {errors[index]?.description && (
                    <div className="text-destructive text-xs mt-1">{errors[index].description}</div>
                  )}
                </div>
                
                {/* Amount */}
                <div>
                  <label className="font-medium text-black text-sm block mb-2">المبلغ (ريال)</label>
                  <Input
                    type="number"
                    value={subtask.amount}
                    onChange={(e) => handleSubtaskChange(index, 'amount', Number(e.target.value))}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    className={errors[index]?.amount ? 'border-destructive bg-destructive/5' : ''}
                    style={{
                      opacity: subtask.is_completed ? 0.7 : 1
                    }}
                  />
                  {errors[index]?.amount && (
                    <div className="text-destructive text-xs mt-1">{errors[index].amount}</div>
                  )}
                </div>
                
                {/* Status Badge */}
                <div className="flex justify-center">
                  {subtask.description.trim() && subtask.amount > 0 && (
                    <span 
                      className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded ${
                        subtask.is_completed 
                          ? 'bg-green-100 text-green-900' 
                          : 'bg-yellow-100 text-yellow-900'
                      }`}
                    >
                      {subtask.is_completed ? (
                        <>
                          <Check size={12} />
                          مكتملة
                        </>
                      ) : (
                        <>
                          <AlertTriangle size={12} />
                          قيد العمل
                        </>
                      )}
                    </span>
                  )}
                </div>
                
                {/* Delete Button */}
                <div className="flex justify-end">
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => removeSubtask(index)}
                    disabled={localSubtasks.length <= 1}
                    className="flex items-center gap-1"
                    style={{ fontSize: '0.75rem' }}
                  >
                    <XCircle size={14} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Subtask Button */}
        <div className="flex justify-center">
          <Button
            variant="outline-primary"
            onClick={addSubtask}
            className="flex items-center gap-2"
            style={{ borderColor: '#d4af37', color: '#d4af37' }}
          >
            <Plus size={18} />
            إضافة مهمة فرعية جديدة
          </Button>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
          <Button variant="secondary" onClick={closeModal}>
            <X size={16} />
            إغلاق
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSave}
            disabled={updateTaskMutation.isPending}
            style={{ backgroundColor: '#d4af37', borderColor: '#d4af37' }}
          >
            <Save size={16} />
            {updateTaskMutation.isPending ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
          </Button>
        </div>
      </div>

      {/* Custom Styles */}
      <style>{`
        .task-subtasks-modal .modal-dialog {
          max-width: 1000px;
        }
      `}</style>
    </BaseModal>
  );
};

export default TaskSubtasksModal;