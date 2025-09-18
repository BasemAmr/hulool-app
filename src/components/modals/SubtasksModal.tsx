import { useState } from 'react';
import { Plus, Trash2, Save, X, Check, DollarSign, Layers } from 'lucide-react';
import { useModalStore } from '../../stores/modalStore';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface Subtask {
  id?: number;
  description: string;
  amount: number;
  is_completed: boolean;
}

interface SubtasksModalProps {
  subtasks?: Subtask[];
  onSave?: (subtasks: Subtask[]) => void;
  onClose?: () => void; // Optional for direct use
}

const SubtasksModal = (directProps?: SubtasksModalProps) => {
  const closeModal = useModalStore((state) => state.closeModal);
  const storeProps = useModalStore((state) => state.props as SubtasksModalProps);
  
  // Use direct props if provided, otherwise use modal store props
  const { subtasks: initialSubtasks, onSave, onClose } = directProps || storeProps;
  
  const [localSubtasks, setLocalSubtasks] = useState<Subtask[]>(
    (initialSubtasks && initialSubtasks.length > 0) ? [...initialSubtasks] : [{ description: '', amount: 0, is_completed: false }]
  );
  
  const [errors, setErrors] = useState<{ [key: number]: { description?: string; amount?: string } }>({});

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
  };

  const removeSubtask = (index: number) => {
    if (localSubtasks.length > 1) {
      const updatedSubtasks = localSubtasks.filter((_, i) => i !== index);
      setLocalSubtasks(updatedSubtasks);
      
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

  const handleSave = () => {
    // Filter out empty subtasks
    const validSubtasks = localSubtasks.filter(subtask => 
      subtask.description.trim() && subtask.amount > 0
    );

    if (validSubtasks.length === 0) {
      // If no valid subtasks, save empty array
      onSave?.([]);
      if (onClose) {
        onClose();
      } else {
        closeModal();
      }
      return;
    }

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

    onSave?.(validSubtasks);
    if (onClose) {
      onClose();
    } else {
      closeModal();
    }
  };

  const calculateTotal = () => {
    return localSubtasks.reduce((sum, subtask) => sum + (subtask.amount || 0), 0);
  };

  const hasValidSubtasks = localSubtasks.some(subtask => 
    subtask.description.trim() && subtask.amount > 0
  );

  return (
    <BaseModal 
      isOpen={true} 
      onClose={onClose || closeModal} 
      title="إدارة المهام الفرعية"
      className="subtasks-modal"
    >
      <div className="modal-content-wrapper">
        {/* Instructions */}
        <div className="alert alert-info mb-4">
          <div className="d-flex align-items-start">
            <Layers size={18} className="me-2 mt-1" style={{ color: '#0ea5e9' }} />
            <div>
              <div className="fw-bold mb-1">إدارة المهام الفرعية</div>
              <small className="text-muted">
                يمكنك تقسيم المهمة إلى مهام فرعية منفصلة. سيتم حساب المبلغ الإجمالي تلقائياً من مجموع المهام الفرعية.
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
              style={{ border: '1px solid #e9ecef' }}
            >
              <div className="card-body">
                <div className="row align-items-center">
                  {/* Description */}
                  <div className="col-md-5">
                    <label className="form-label small text-muted">وصف المهمة الفرعية</label>
                    <Input
                      value={subtask.description}
                      onChange={(e) => handleSubtaskChange(index, 'description', e.target.value)}
                      placeholder="مثال: تصميم الواجهة"
                      className={errors[index]?.description ? 'is-invalid' : ''}
                    />
                    {errors[index]?.description && (
                      <div className="invalid-feedback">{errors[index].description}</div>
                    )}
                  </div>
                  
                  {/* Amount */}
                  <div className="col-md-3">
                    <label className="form-label small text-muted">المبلغ (ريال)</label>
                    <Input
                      type="number"
                      value={subtask.amount}
                      onChange={(e) => handleSubtaskChange(index, 'amount', Number(e.target.value))}
                      placeholder="0"
                      min="0"
                      step="0.01"
                      className={errors[index]?.amount ? 'is-invalid' : ''}
                    />
                    {errors[index]?.amount && (
                      <div className="invalid-feedback">{errors[index].amount}</div>
                    )}
                  </div>
                  
                  {/* Completion Status */}
                  <div className="col-md-2">
                    <label className="form-label small text-muted">مكتملة</label>
                    <div className="form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id={`completed-${index}`}
                        checked={subtask.is_completed}
                        onChange={(e) => handleSubtaskChange(index, 'is_completed', e.target.checked)}
                      />
                      <label className="form-check-label" htmlFor={`completed-${index}`}>
                        {subtask.is_completed ? (
                          <span className="text-success d-flex align-items-center">
                            <Check size={14} className="me-1" />
                            مكتملة
                          </span>
                        ) : (
                          <span className="text-muted">غير مكتملة</span>
                        )}
                      </label>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="col-md-2 text-end">
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => removeSubtask(index)}
                      disabled={localSubtasks.length === 1}
                      title="حذف المهمة الفرعية"
                    >
                      <Trash2 size={16} />
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

        {/* Total Summary */}
        {hasValidSubtasks && (
          <div 
            className="p-3 rounded mb-4"
            style={{ 
              background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
              color: 'white'
            }}
          >
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <div className="fw-bold">المجموع الإجمالي</div>
                <small className="opacity-75">مجموع جميع المهام الفرعية</small>
              </div>
              <div className="text-end">
                <div className="fw-bold fs-5 d-flex align-items-center">
                  <DollarSign size={20} className="me-1" />
                  {calculateTotal().toLocaleString()} ريال
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="d-flex justify-content-end gap-2 pt-3" style={{ borderTop: '1px solid #e9ecef' }}>
          <Button variant="secondary" onClick={onClose || closeModal}>
            <X size={16} className="me-1" />
            إلغاء
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSave}
            style={{ backgroundColor: '#d4af37', borderColor: '#d4af37' }}
          >
            <Save size={16} className="me-1" />
            حفظ التغييرات
          </Button>
        </div>
      </div>

      {/* Custom Styles */}
      <style>{`
        .subtasks-modal .modal-dialog {
          max-width: 900px;
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
          background-color: #d4af37;
          border-color: #d4af37;
        }
      `}</style>
    </BaseModal>
  );
};

export default SubtasksModal;