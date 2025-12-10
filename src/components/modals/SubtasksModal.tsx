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
      <div className="modal-content-wrapper space-y-4">
        {/* Instructions */}
        <div className="rounded-lg border border-blue-600 bg-blue-50 p-4 flex gap-3">
          <Layers size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-black mb-1">إدارة المهام الفرعية</div>
            <small className="text-muted-foreground text-sm">
              يمكنك تقسيم المهمة إلى مهام فرعية منفصلة. سيتم حساب المبلغ الإجمالي تلقائياً من مجموع المهام الفرعية.
            </small>
          </div>
        </div>

        {/* Subtasks List */}
        <div className="subtasks-list space-y-3 max-h-96 overflow-y-auto">
          {localSubtasks.map((subtask, index) => (
            <div 
              key={index} 
              className="subtask-item rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-md"
            >
              <div className="grid grid-cols-5 gap-4 items-start">
                {/* Description */}
                <div className="col-span-2">
                  <label className="font-medium text-black text-sm block mb-2">وصف المهمة الفرعية</label>
                  <Input
                    value={subtask.description}
                    onChange={(e) => handleSubtaskChange(index, 'description', e.target.value)}
                    placeholder="مثال: تصميم الواجهة"
                    className={errors[index]?.description ? 'border-destructive bg-destructive/5' : ''}
                  />
                  {errors[index]?.description && (
                    <div className="text-destructive text-xs mt-1">{errors[index].description}</div>
                  )}
                </div>
                
                {/* Amount */}
                <div className="col-span-1">
                  <label className="font-medium text-black text-sm block mb-2">المبلغ (ريال)</label>
                  <Input
                    type="number"
                    value={subtask.amount}
                    onChange={(e) => handleSubtaskChange(index, 'amount', Number(e.target.value))}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    className={errors[index]?.amount ? 'border-destructive bg-destructive/5' : ''}
                  />
                  {errors[index]?.amount && (
                    <div className="text-destructive text-xs mt-1">{errors[index].amount}</div>
                  )}
                </div>
                
                {/* Completion Status */}
                <div className="col-span-1">
                  <label className="font-medium text-black text-sm block mb-2">مكتملة</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="rounded cursor-pointer"
                      id={`completed-${index}`}
                      checked={subtask.is_completed}
                      onChange={(e) => handleSubtaskChange(index, 'is_completed', e.target.checked)}
                    />
                    <label className="cursor-pointer text-sm" htmlFor={`completed-${index}`}>
                      {subtask.is_completed ? (
                        <span className="text-green-600 flex items-center gap-1">
                          <Check size={14} />
                          مكتملة
                        </span>
                      ) : (
                        <span className="text-muted-foreground">غير مكتملة</span>
                      )}
                    </label>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="col-span-1 flex justify-end pt-8">
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
          ))}
        </div>

        {/* Add Subtask Button */}
        <div className="flex justify-center">
          <Button
            variant="outline-primary"
            onClick={addSubtask}
            className="flex items-center gap-2"
          >
            <Plus size={18} />
            إضافة مهمة فرعية جديدة
          </Button>
        </div>

        {/* Total Summary */}
        {hasValidSubtasks && (
          <div 
            className="p-4 rounded-lg text-white bg-gradient-to-r from-yellow-500 to-yellow-700"
          >
            <div className="flex justify-between items-center">
              <div>
                <div className="font-semibold">المجموع الإجمالي</div>
                <small className="opacity-75 text-xs">مجموع جميع المهام الفرعية</small>
              </div>
              <div className="text-right">
                <div className="font-semibold text-lg flex items-center gap-1">
                  <DollarSign size={20} />
                  {calculateTotal().toLocaleString()} ريال
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="secondary" onClick={onClose || closeModal}>
            <X size={16} className="mr-1" />
            إلغاء
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSave}
          >
            <Save size={16} className="mr-1" />
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
        
        .modal-content-wrapper {
          max-height: 80vh;
        }
      `}</style>
    </BaseModal>
  );
};

export default SubtasksModal;