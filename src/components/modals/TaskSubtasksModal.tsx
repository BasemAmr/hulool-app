import { useState } from 'react';
import { Layers, DollarSign, X, Save, Plus, Edit, Check, XCircle, AlertTriangle } from 'lucide-react';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { useModalStore } from '../../stores/modalStore';
import { useUpdateTask } from '../../queries/taskQueries';
import { useToast } from '../../hooks/useToast';
import type { Task } from '../../api/types';

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

      success('تم الحفظ', 'تم حفظ المهام الفرعية بنجاح');
      setHasChanges(false);
      closeModal();
    } catch (err: any) {
      error('خطأ', err.message || 'حدث خطأ أثناء حفظ المهام الفرعية');
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
      <div className="modal-content-wrapper">
        {/* Header Edit Button */}
        <div className="d-flex justify-end mb-3">
          <Button
            variant="outline-success"
            size="sm"
            onClick={handleHeaderEdit}
            className="d-flex align-items-center gap-1"
          >
            <Edit size={16} />
            تحرير المهمة
          </Button>
        </div>
        {hasValidSubtasks && (
          <div 
            className="p-3 rounded mb-4"
            style={{ 
              background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
              border: '1px solid #dee2e6'
            }}
          >
            <div className="row">
              <div className="col-md-8">
                <div className="fw-bold mb-2 d-flex align-items-center">
                  <div 
                    className="me-2"
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: progress.percentage === 100 ? '#28a745' : progress.percentage > 0 ? '#ffc107' : '#6c757d'
                    }}
                  ></div>
                  تقدم إنجاز المهام الفرعية
                </div>
                <div className="progress mb-2" style={{ height: '8px' }}>
                  <div 
                    className="progress-bar" 
                    role="progressbar" 
                    style={{ 
                      width: `${progress.percentage}%`,
                      backgroundColor: progress.percentage === 100 ? '#28a745' : progress.percentage > 0 ? '#ffc107' : '#6c757d'
                    }}
                    aria-valuenow={progress.percentage} 
                    aria-valuemin={0} 
                    aria-valuemax={100}
                  ></div>
                </div>
                <small className="text-muted">
                  {progress.completed} من {progress.total} مهام مكتملة ({progress.percentage}%)
                </small>
              </div>
              <div className="col-md-4 text-end">
                <div className="fw-bold fs-5 d-flex align-items-center justify-content-end">
                  <DollarSign size={20} className="me-1" style={{ color: '#d4af37' }} />
                  {calculateTotal().toLocaleString()} ريال
                </div>
                <small className="text-muted">المجموع الإجمالي</small>
                {hasSubtasks() && (
                  <div className="mt-1">
                    <span className="badge bg-info text-dark small">
                      محسوب من المهام الفرعية
                    </span>
                  </div>
                )}
                {shouldDisableAmount() && (
                  <small className="text-muted mt-1 d-block">
                    المبلغ محسوب تلقائياً من المهام الفرعية ({localSubtasks.length} مهمة)
                  </small>
                )}
                {hasSubtasks() && !shouldDisableAmount() && (
                  <small className="text-info mt-1 d-block">
                    هذه المهمة تحتوي على {localSubtasks.length} مهام فرعية
                  </small>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="alert alert-info mb-4">
          <div className="d-flex align-items-start">
            <Layers size={18} className="me-2 mt-1" style={{ color: '#0ea5e9' }} />
            <div>
              <div className="fw-bold mb-1">إدارة المهام الفرعية</div>
              <small className="text-muted">
                يمكنك تتبع وإدارة المهام الفرعية، وتحديد حالة الإنجاز لكل مهمة. اضغط على "تحرير المهمة" للوصول للتحرير الكامل.
              </small>
            </div>
          </div>
        </div>

        {/* Subtasks List */}
        <div className="subtasks-list mb-4">
          {localSubtasks.map((subtask, index) => (
            <div 
              key={index} 
              className="subtask-item card mb-3"
              style={{ 
                border: '1px solid #e9ecef',
                backgroundColor: subtask.is_completed ? '#f8f9fa' : 'white'
              }}
            >
              <div className="card-body">
                <div className="row align-items-center">
                  {/* Completion Status */}
                  <div className="col-md-1 text-center">
                    <div 
                      className="form-check"
                      style={{ display: 'flex', justifyContent: 'center' }}
                    >
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={subtask.is_completed}
                        onChange={(e) => handleSubtaskChange(index, 'is_completed', e.target.checked)}
                        style={{
                          backgroundColor: subtask.is_completed ? '#28a745' : 'white',
                          borderColor: subtask.is_completed ? '#28a745' : '#ced4da'
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* Description */}
                  <div className="col-md-5">
                    <label className="form-label small fw-bold">وصف المهمة الفرعية</label>
                    <Input
                      value={subtask.description}
                      onChange={(e) => handleSubtaskChange(index, 'description', e.target.value)}
                      placeholder="مثال: تصميم الواجهة"
                      className={errors[index]?.description ? 'is-invalid' : ''}
                      style={{
                        textDecoration: subtask.is_completed ? 'line-through' : 'none',
                        opacity: subtask.is_completed ? 0.7 : 1
                      }}
                    />
                    {errors[index]?.description && (
                      <div className="invalid-feedback">{errors[index].description}</div>
                    )}
                  </div>
                  
                  {/* Amount */}
                  <div className="col-md-3">
                    <label className="form-label small fw-bold">المبلغ (ريال)</label>
                    <Input
                      type="number"
                      value={subtask.amount}
                      onChange={(e) => handleSubtaskChange(index, 'amount', Number(e.target.value))}
                      placeholder="0"
                      min="0"
                      step="0.01"
                      className={errors[index]?.amount ? 'is-invalid' : ''}
                      style={{
                        opacity: subtask.is_completed ? 0.7 : 1
                      }}
                    />
                    {errors[index]?.amount && (
                      <div className="invalid-feedback">{errors[index].amount}</div>
                    )}
                  </div>
                  
                  {/* Status Badge */}
                  <div className="col-md-2">
                    <div className="text-center">
                      {subtask.description.trim() && subtask.amount > 0 && (
                        <span 
                          className={`badge ${subtask.is_completed ? 'bg-success' : 'bg-warning'}`}
                          style={{ fontSize: '0.75rem' }}
                        >
                          {subtask.is_completed ? (
                            <>
                              <Check size={12} className="me-1" />
                              مكتملة
                            </>
                          ) : (
                            <>
                              <AlertTriangle size={12} className="me-1" />
                              قيد العمل
                            </>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Delete Button */}
                  <div className="col-md-1 text-end">
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => removeSubtask(index)}
                      disabled={localSubtasks.length <= 1}
                      className="d-flex align-items-center gap-1"
                      style={{ fontSize: '0.75rem' }}
                    >
                      <XCircle size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Subtask Button */}
        <div className="text-center mb-4">
          <Button
            variant="outline-primary"
            onClick={addSubtask}
            className="d-flex align-items-center gap-2 mx-auto"
            style={{ borderColor: '#d4af37', color: '#d4af37' }}
          >
            <Plus size={18} />
            إضافة مهمة فرعية جديدة
          </Button>
        </div>

        {/* Footer Actions */}
        <div className="d-flex justify-content-end gap-2 pt-3" style={{ borderTop: '1px solid #e9ecef' }}>
          <Button variant="secondary" onClick={closeModal}>
            <X size={16} className="me-1" />
            إغلاق
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSave}
            disabled={updateTaskMutation.isPending}
            style={{ backgroundColor: '#d4af37', borderColor: '#d4af37' }}
          >
            <Save size={16} className="me-1" />
            {updateTaskMutation.isPending ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
          </Button>
        </div>
      </div>

      {/* Custom Styles */}
      <style>{`
        .task-subtasks-modal .modal-dialog {
          max-width: 1000px;
        }
        
        .subtask-item {
          transition: all 0.2s ease;
        }
        
        .subtask-item:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .modal-content-wrapper {
          max-height: 80vh;
          overflow-y: auto;
        }
        
        .form-check-input:checked {
          background-color: #28a745;
          border-color: #28a745;
        }

        .progress-bar {
          transition: width 0.3s ease;
        }
      `}</style>
    </BaseModal>
  );
};

export default TaskSubtasksModal;