import React, { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import BaseModal from '@/shared/ui/layout/BaseModal';
import Button from '@/shared/ui/primitives/Button';
import { useModalStore } from '@/shared/stores/modalStore';
import { useToast } from '@/shared/hooks/useToast';
import { useUpdateTask, useGetTask } from '@/features/tasks/api/taskQueries';
import { formatCurrency } from '@/shared/utils/formatUtils';

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
      <div className="space-y-2 rounded-lg border border-status-info-border bg-status-info-bg p-4">
        <div><strong className="text-text-primary">المهمة:</strong> <span className="text-status-info-text">{transaction?.task_name || 'مهمة غير معروفة'}</span></div>
        <div><strong className="text-text-primary">العميل:</strong> <span className="text-status-info-text">{transaction?.client_name || 'عميل غير معروف'}</span></div>
        <div><strong className="text-text-primary">العمولة الحالية:</strong> <span className="text-status-info-text">{transaction?.amount ? `${transaction.amount} ريال` : 'قيد المراجعة'}</span></div>
      </div>

      {/* Financial Breakdown Visual Indicators */}
      <div className="space-y-3">
        <h6 className="font-semibold text-text-primary text-sm">التفصيل المالي</h6>
        <div className="grid grid-cols-2 gap-3">
          {/* Task Amount */}
          <div className="rounded-lg border border-primary bg-card p-3 text-center">
            <div className="text-primary text-lg font-semibold">
              {formatCurrency(breakdown.taskAmount)}
            </div>
            <small className="text-text-secondary text-xs block">مبلغ المهمة الإجمالي</small>
          </div>

          {/* Current Expense */}
          <div className="rounded-lg border border-status-warning-border bg-card p-3 text-center">
            <div className="text-status-warning-text text-lg font-semibold">
              {formatCurrency(breakdown.currentExpense)}
            </div>
            <small className="text-text-secondary text-xs block">المصاريف الحالية</small>
          </div>

          {/* Net Amount */}
          <div className="rounded-lg border border-status-info-border bg-card p-3 text-center">
            <div className="text-status-info-text text-lg font-semibold">
              {formatCurrency(breakdown.netAmount)}
            </div>
            <small className="text-text-secondary text-xs block">المبلغ الصافي</small>
          </div>

          {/* Employee Commission */}
          <div className="rounded-lg border border-status-success-border bg-card p-3 text-center">
            <div className="text-status-success-text text-lg font-semibold">
              {formatCurrency(breakdown.employeeCommission)}
            </div>
            <small className="text-text-secondary text-xs block">
              عمولة الموظف ({breakdown.commissionRate}%)
            </small>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="edit-expense-amount" className="font-semibold text-text-primary text-sm block">
            مبلغ المصاريف <span className="text-destructive">*</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="px-3 py-2 border border-border rounded-md bg-muted text-sm font-medium">ريال</span>
            <input
              type="number"
              step="0.01"
              min="0"
              className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${errors.expense_amount ? 'border-destructive bg-destructive/5' : 'border-border'}`}
              id="edit-expense-amount"
              value={formData.expense_amount}
              onChange={(e) => handleInputChange('expense_amount', e.target.value)}
              placeholder="أدخل مبلغ المصاريف"
              required
            />
          </div>
          {errors.expense_amount && (
            <div className="text-destructive text-sm">{errors.expense_amount}</div>
          )}
          <div className="text-muted-foreground text-xs">
            سيؤدي هذا إلى تحديث مصاريف المهمة وإعادة حساب عمولة الموظف.
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline-secondary"
            onClick={handleClose}
          >
            <X size={16} className="mr-1" />
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={updateTaskMutation.isPending}
          >
            <Save size={16} className="mr-1" />
            تحديث المصاريف
          </Button>
        </div>
      </form>
    </BaseModal>
  );
};

export default EditTaskExpenseModal;
