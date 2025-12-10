import React, { useState } from 'react';
import BaseModal from '@/components/ui/BaseModal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Loader2, AlertCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/apiClient';
import { useToast } from '@/hooks/useToast';

interface EditExpectedCommissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingItem: {
    id: string | number;
    expected_amount: number;
    task?: {
      task_name?: string;
    };
  };
}

const EditExpectedCommissionModal: React.FC<EditExpectedCommissionModalProps> = ({
  isOpen,
  onClose,
  pendingItem,
}) => {
  const [amount, setAmount] = useState<string>(pendingItem.expected_amount.toString());
  const [error, setError] = useState<string>('');
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // Mutation to update expected amount
  const updateAmountMutation = useMutation({
    mutationFn: async (newAmount: number) => {
      const response = await apiClient.put(
        `/pending-items/${pendingItem.id}/expected-amount`,
        { expected_amount: newAmount }
      );
      return response.data;
    },
    onSuccess: (data) => {
      showToast({
        type: 'success',
        title: 'تم تحديث المبلغ المتوقع بنجاح',
        message: `المبلغ الجديد: ${parseFloat(amount).toFixed(2)} ر.س`
      });
      
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['pending-items'] });
      queryClient.invalidateQueries({ queryKey: ['pending-commissions'] });
      
      onClose();
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'فشل تحديث المبلغ المتوقع';
      showToast({
        type: 'error',
        title: 'خطأ',
        message: message
      });
      setError(message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate amount
    const numAmount = parseFloat(amount);
    
    if (isNaN(numAmount)) {
      setError('الرجاء إدخال رقم صحيح');
      return;
    }

    if (numAmount <= 0) {
      setError('المبلغ يجب أن يكون أكبر من صفر');
      return;
    }

    updateAmountMutation.mutate(numAmount);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Allow only numbers and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
      setError('');
    }
  };

  const handleClose = () => {
    if (!updateAmountMutation.isPending) {
      setAmount(pendingItem.expected_amount.toString());
      setError('');
      onClose();
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="تعديل المبلغ المتوقع"
    >
      {pendingItem.task?.task_name && (
        <p className="text-sm text-gray-600 mb-4">
          المهمة: {pendingItem.task.task_name}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="expected_amount" className="block text-sm font-medium text-gray-700">
            المبلغ المتوقع (ر.س)
          </label>
          <div className="relative">
            <Input
              id="expected_amount"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={handleAmountChange}
              placeholder="0.00"
              className="text-right"
              disabled={updateAmountMutation.isPending}
              autoFocus
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
              ر.س
            </span>
          </div>
          
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
          
          {amount && !error && (
            <p className="text-xs text-gray-500">
              المبلغ: {parseFloat(amount || '0').toFixed(2)} ر.س
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={updateAmountMutation.isPending}
          >
            إلغاء
          </Button>
          <Button
            type="submit"
            disabled={updateAmountMutation.isPending || !!error || !amount}
          >
            {updateAmountMutation.isPending && (
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
            )}
            حفظ
          </Button>
        </div>
      </form>
    </BaseModal>
  );
};

export default EditExpectedCommissionModal;
