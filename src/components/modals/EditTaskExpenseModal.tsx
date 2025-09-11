import React, { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import { useModalStore } from '../../stores/modalStore';
import { useToast } from '../../hooks/useToast';
import { useUpdateTask, useGetTask } from '../../queries/taskQueries';
import { formatCurrency } from '../../utils/formatUtils';

interface EditExpenseFormData {
  expense_amount: string;
}

const EditTaskExpenseModal = () => {
  const { success, error } = useToast();
  const { isOpen, modalType, props, closeModal } = useModalStore();
  const updateTaskMutation = useUpdateTask();

  const [formData, setFormData] = useState<EditExpenseFormData>({
    expense_amount: '',
  });

  const [errors, setErrors] = useState<Partial<EditExpenseFormData>>({});

  const isModalOpen = isOpen && modalType === 'editTaskExpense';
  const { transaction } = props || {};
  const relatedTaskId = transaction?.related_task_id;

  // Fetch task data to get current expense amount
  const { data: taskData } = useGetTask(
    isModalOpen && relatedTaskId ? parseInt(relatedTaskId) : 0
  );

  // Get employee data for commission rate calculation
  // Note: This is a simplified approach - we'll use a default commission rate for now
  // TODO: Implement proper employee lookup by user_id
  const employeeData = { commission_rate: 20 }; // Default 20% commission

  // Initialize form data when modal opens
  useEffect(() => {
    if (isModalOpen && taskData) {
      setFormData({
        expense_amount: (taskData.expense_amount || 0).toString(),
      });
    }
  }, [isModalOpen, taskData]);

  const validateForm = (): boolean => {
    const newErrors: Partial<EditExpenseFormData> = {};

    if (formData.expense_amount === '' || parseFloat(formData.expense_amount) < 0) {
      newErrors.expense_amount = 'Please enter a valid expense amount (0 or greater)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !relatedTaskId) return;

    try {
      const updateData = {
        expense_amount: parseFloat(formData.expense_amount),
      };

      await updateTaskMutation.mutateAsync({ 
        id: parseInt(relatedTaskId, 10),
        taskData: updateData as any // Cast as any since expense_amount may not be in UpdateTaskPayload interface
      });

      success('تم تحديث مصاريف المهمة بنجاح');
      closeModal();
      
      // Call onSuccess callback if provided
      if (props?.onSuccess) {
        props.onSuccess();
      }
    } catch (err: any) {
      error(err.message || 'فشل في تحديث مصاريف المهمة');
    }
  };

  const handleClose = () => {
    // Reset form data on close
    setFormData({
      expense_amount: '',
    });
    setErrors({});
    closeModal();
  };

  const handleInputChange = (field: keyof EditExpenseFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Calculate financial breakdown
  const getFinancialBreakdown = () => {
    const taskAmount = transaction?.task_amount ? parseFloat(transaction.task_amount) : 0;
    const currentExpense = formData.expense_amount ? parseFloat(formData.expense_amount) : 0;
    const netAmount = taskAmount - currentExpense;
    const commissionRate = employeeData?.commission_rate || 20; // Default to 20% if not found
    const employeeCommission = (netAmount * commissionRate) / 100;

    return {
      taskAmount,
      currentExpense,
      netAmount,
      commissionRate,
      employeeCommission: Math.max(0, employeeCommission) // Ensure commission is not negative
    };
  };

  const breakdown = getFinancialBreakdown();

  return (
    <BaseModal
      isOpen={isModalOpen}
      onClose={handleClose}
      title="تعديل مصاريف المهمة"
    >
      {/* Task Information */}
      <div className="mb-3">
        <div className="alert alert-info">
          <strong>المهمة:</strong> {transaction?.task_name || 'مهمة غير معروفة'}<br />
          <strong>العميل:</strong> {transaction?.client_name || 'عميل غير معروف'}<br />
          <strong>العمولة الحالية:</strong> {transaction?.amount ? `${transaction.amount} ريال` : 'قيد المراجعة'}
        </div>
      </div>

      {/* Financial Breakdown Visual Indicators */}
      <div className="mb-4">
        <h6 className="mb-3">التفصيل المالي</h6>
        <div className="row g-3">
          {/* Task Amount */}
          <div className="col-md-6">
            <div className="card border-primary">
              <div className="card-body text-center p-3">
                <div className="text-primary fs-5 fw-bold">
                  {formatCurrency(breakdown.taskAmount)}
                </div>
                <small className="text-muted">مبلغ المهمة الإجمالي</small>
              </div>
            </div>
          </div>

          {/* Current Expense */}
          <div className="col-md-6">
            <div className="card border-warning">
              <div className="card-body text-center p-3">
                <div className="text-warning fs-5 fw-bold">
                  {formatCurrency(breakdown.currentExpense)}
                </div>
                <small className="text-muted">المصاريف الحالية</small>
              </div>
            </div>
          </div>

          {/* Net Amount */}
          <div className="col-md-6">
            <div className="card border-info">
              <div className="card-body text-center p-3">
                <div className="text-info fs-5 fw-bold">
                  {formatCurrency(breakdown.netAmount)}
                </div>
                <small className="text-muted">المبلغ الصافي</small>
              </div>
            </div>
          </div>

          {/* Employee Commission */}
          <div className="col-md-6">
            <div className="card border-success">
              <div className="card-body text-center p-3">
                <div className="text-success fs-5 fw-bold">
                  {formatCurrency(breakdown.employeeCommission)}
                </div>
                <small className="text-muted">
                  عمولة الموظف ({breakdown.commissionRate}%)
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="edit-expense-amount" className="form-label">
            مبلغ المصاريف <span className="text-danger">*</span>
          </label>
          <div className="input-group">
            <span className="input-group-text">ريال</span>
            <input
              type="number"
              step="0.01"
              min="0"
              className={`form-control ${errors.expense_amount ? 'is-invalid' : ''}`}
              id="edit-expense-amount"
              value={formData.expense_amount}
              onChange={(e) => handleInputChange('expense_amount', e.target.value)}
              placeholder="أدخل مبلغ المصاريف"
              required
            />
            {errors.expense_amount && (
              <div className="invalid-feedback">{errors.expense_amount}</div>
            )}
          </div>
          <div className="form-text">
            سيؤدي هذا إلى تحديث مصاريف المهمة وإعادة حساب عمولة الموظف.
          </div>
        </div>

        <div className="d-flex justify-content-end gap-2">
          <Button
            type="button"
            variant="outline-secondary"
            onClick={handleClose}
          >
            <X size={16} className="me-1" />
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={updateTaskMutation.isPending}
          >
            <Save size={16} className="me-1" />
            تحديث المصاريف
          </Button>
        </div>
      </form>
    </BaseModal>
  );
};

export default EditTaskExpenseModal;
