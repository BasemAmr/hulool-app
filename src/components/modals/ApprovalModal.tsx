import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useModalStore } from '../../stores/modalStore';
import { useApproveTask, useRejectTask } from '../../queries/taskQueries';
import { useToast } from '../../hooks/useToast';
import { useState } from 'react';
import type { Task, Invoice } from '../../api/types';
import { TOAST_MESSAGES } from '../../constants/toastMessages';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import Input from '../ui/Input';

import {
  useGetInvoicesByTask
} from '../../queries/invoiceQueries'; // Import new hook

interface ApprovalModalProps {
  task: Task;
  // Invoice prop removed
}

interface ApprovalFormData {
  expense_amount: number;
  notes?: string;
}

const ApprovalModal = () => {
  const { t } = useTranslation();
  const closeModal = useModalStore((state) => state.closeModal);
  const props = useModalStore((state) => state.props as ApprovalModalProps);
  const { task } = props;
  const openModal = useModalStore((state) => state.openModal);

  // Fetch invoice associated with this task
  const { data: invoices, isLoading: isLoadingInvoice } = useGetInvoicesByTask(task?.id, !!task?.id);
  const invoice = invoices && invoices.length > 0 ? invoices[0] : undefined;
  const { success, error } = useToast();

  const [isRejecting, setIsRejecting] = useState(false);

  const approveTaskMutation = useApproveTask();
  const rejectTaskMutation = useRejectTask();

  const { register, handleSubmit, formState: { errors }, watch } = useForm<ApprovalFormData>({
    defaultValues: {
      expense_amount: 0,
      notes: ''
    }
  });

  const watchExpenseAmount = watch('expense_amount');
  const netEarning = task.amount - (Number(watchExpenseAmount) || 0);

  const onApprove = (data: ApprovalFormData) => {
    if (data.expense_amount < 0) {
      error(TOAST_MESSAGES.VALIDATION_ERROR, 'لا يمكن أن يكون مبلغ المصروف سلبياً');
      return;
    }

    if (data.expense_amount > task.amount) {
      error(TOAST_MESSAGES.VALIDATION_ERROR, 'لا يمكن أن يتجاوز مبلغ المصروف مبلغ المهمة');
      return;
    }

    approveTaskMutation.mutate(
      {
        id: Number(task.id),
        expense_amount: Number(data.expense_amount),
        notes: data.notes
      },
      {
        onSuccess: () => {
          success(TOAST_MESSAGES.TASK_APPROVED);
          closeModal();
        },
        onError: (err: any) => {
          error(TOAST_MESSAGES.OPERATION_FAILED, err.message);
        }
      }
    );
  };

  const onReject = () => {
    rejectTaskMutation.mutate(
      {
        id: Number(task.id),
        rejection_reason: 'Task rejected by admin'
      },
      {
        onSuccess: () => {
          success(TOAST_MESSAGES.TASK_REJECTED);
          closeModal();
        },
        onError: (err: any) => {
          error(TOAST_MESSAGES.OPERATION_FAILED, err.message);
        }
      }
    );
  };

  return (
    <BaseModal
      isOpen={true}
      onClose={closeModal}
      title="الموافقة على المهمة"
    >
      <div className="space-y-6">
        {/* Task Summary */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-3">تفاصيل المهمة</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">اسم المهمة:</span>
              <p className="font-medium">{task.task_name || `المهمة #${task.id}`}</p>
            </div>
            <div>
              <span className="text-gray-500">العميل:</span>
              <p className="font-medium">{task.client ? task.client.name : 'عميل غير معروف'}</p>
            </div>
            <div>
              <span className="text-gray-500">مبلغ المهمة:</span>
              <p className="font-medium">{task.amount.toFixed(2)}</p>
            </div>
            <div>
              <span className="text-gray-500">الحالة:</span>
              <p className="font-medium text-orange-600">{task.status}</p>
            </div>
          </div>
        </div>

        {/* Invoice Status Section */}
        {isLoadingInvoice ? (
          <div className="bg-gray-50 border rounded-lg p-4 mb-4 flex justify-center items-center">
            <span className="text-gray-500 text-sm">جاري تحميل بيانات الفاتورة...</span>
          </div>
        ) : invoice && (
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
            <h3 className="font-medium text-purple-900 mb-3">حالة الفاتورة المرتبطة</h3>
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center space-x-2 space-x-reverse mb-1">
                  <span className="text-gray-600 text-sm">رقم الفاتورة:</span>
                  <span className="font-mono font-medium">{invoice.invoice_number || `#${invoice.id}`}</span>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <span className="text-gray-600 text-sm">الحالة:</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                    ${invoice.is_fully_paid ? 'bg-green-100 text-green-800' :
                      invoice.is_partially_paid ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'}`}>
                    {invoice.is_fully_paid ? 'مدفوعة بالكامل' :
                      invoice.is_partially_paid ? 'مدفوعة جزئياً' :
                        'غير مدفوعة'}
                  </span>
                </div>
              </div>
              <Button
                variant="outline-secondary"
                size="default"
                onClick={() => openModal('invoiceDetails', { invoiceId: invoice.id, isEmployeeView: false })}
              >
                عرض تفاصيل الفاتورة
              </Button>
            </div>
          </div>
        )}

        {!isRejecting ? (
          <form onSubmit={handleSubmit(onApprove)} className="space-y-4">
            <div>
              <label htmlFor="expense_amount" className="block text-sm font-medium text-gray-700 mb-1">
                مبلغ المصروف *
              </label>
              <Input
                id="expense_amount"
                type="number"
                step="0.01"
                min="0"
                max={task.amount}
                {...register('expense_amount', {
                  required: 'مبلغ المصروف مطلوب',
                  valueAsNumber: true,
                  min: { value: 0, message: 'لا يمكن أن يكون مبلغ المصروف سلبياً' },
                  max: { value: task.amount, message: 'لا يمكن أن يتجاوز مبلغ المصروف مبلغ المهمة' }
                })}
                error={errors.expense_amount?.message}
                placeholder="أدخل مصروفات المهمة"
              />
            </div>

            {/* Calculated Net Earning */}
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">صافي الربح:</span>
                <span className={`font-semibold ${netEarning >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {netEarning.toFixed(2)}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                مبلغ المهمة ({task.amount.toFixed(2)}) - مبلغ المصروف ({(Number(watchExpenseAmount) || 0).toFixed(2)})
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                ملاحظات (اختياري)
              </label>
              <textarea
                id="notes"
                rows={3}
                {...register('notes')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="أضف أي ملاحظات إضافية حول موافقة هذه المهمة..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline-danger"
                onClick={() => setIsRejecting(true)}
                disabled={approveTaskMutation.isPending || rejectTaskMutation.isPending}
              >
                رفض
              </Button>
              <Button
                type="button"
                variant="outline-secondary"
                onClick={closeModal}
                disabled={approveTaskMutation.isPending || rejectTaskMutation.isPending}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={approveTaskMutation.isPending}
                disabled={approveTaskMutation.isPending || rejectTaskMutation.isPending}
              >
                الموافقة وإكمال
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <h3 className="font-medium text-red-800 mb-2">رفض المهمة</h3>
              <p className="text-red-700 text-sm">
                هل أنت متأكد أنك تريد رفض هذه المهمة؟ سيؤدي ذلك إلى إعادة حالة المهمة إلى "جديدة" وسيتعين على الموظف المعَيَّن إعادة تقديمها للمراجعة.
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline-secondary"
                onClick={() => setIsRejecting(false)}
                disabled={rejectTaskMutation.isPending}
              >
                عودة
              </Button>
              <Button
                type="button"
                variant="outline-secondary"
                onClick={closeModal}
                disabled={rejectTaskMutation.isPending}
              >
                إلغاء
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={onReject}
                isLoading={rejectTaskMutation.isPending}
                disabled={rejectTaskMutation.isPending}
              >
                تأكيد الرفض
              </Button>
            </div>
          </div>
        )}
      </div>
    </BaseModal>
  );
};

export default ApprovalModal;
