import { useState, useEffect } from 'react';
import BaseModal from '@/shared/ui/layout/BaseModal';
import Input from '@/shared/ui/primitives/Input';
import Button from '@/shared/ui/primitives/Button';
import ClientSearchCombobox from '@/shared/search/ClientSearchCombobox';
import { NumberInput } from '@/shared/ui/primitives/NumberInput';
import { useGetAccountsByType } from '@/features/financials/api/financialCenterQueries';
import { useRecordVoucher, useUpdateVoucher, useGetCashBoxes } from '../api/cashBoxQueries';
import { useUpdateTransaction } from '../api/accountQueries';
import { useToast } from '@/shared/hooks/useToast';
import type { CashBoxVoucher } from '@/api/types';

function parseDateTimeParts(raw: any): { date: string; time: string } {
  if (!raw) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return { date: `${y}-${m}-${d}`, time: `${hh}:${mm}:${ss}` };
  }

  const str = String(raw).trim().replace('Z', '').split('.')[0];
  let d = '';
  let t = '00:00:00';

  if (str.includes('T')) {
    const parts = str.split('T');
    d = parts[0] || '';
    t = parts[1] || '00:00:00';
  } else if (str.includes(' ')) {
    const parts = str.split(' ');
    d = parts[0] || '';
    t = parts[1] || '00:00:00';
  } else {
    d = str;
  }

  if (d.includes('/')) {
    const slashParts = d.split('/');
    if (slashParts[0].length === 4) {
      d = `${slashParts[0]}-${slashParts[1].padStart(2, '0')}-${slashParts[2].padStart(2, '0')}`;
    } else if (slashParts[2]?.length === 4) {
      d = `${slashParts[2]}-${slashParts[1].padStart(2, '0')}-${slashParts[0].padStart(2, '0')}`;
    }
  }

  const timeParts = t.split(':');
  if (timeParts.length === 2) {
    t = `${timeParts[0].padStart(2, '0')}:${timeParts[1].padStart(2, '0')}:00`;
  } else if (timeParts.length >= 3) {
    t = `${timeParts[0].padStart(2, '0')}:${timeParts[1].padStart(2, '0')}:${timeParts[2].substring(0, 2).padStart(2, '0')}`;
  }

  return { date: d, time: t };
}

interface RecordVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  boxId?: number;
  defaultType?: 'receipt' | 'payment';
  voucherToEdit?: CashBoxVoucher;
  isTreasury?: boolean;
}

export const RecordVoucherModal: React.FC<RecordVoucherModalProps> = ({
  isOpen,
  onClose,
  boxId,
  defaultType = 'payment',
  voucherToEdit,
  isTreasury = false
}) => {
  const isEdit = !!voucherToEdit;
  
  const [type, setType] = useState<'receipt' | 'payment'>(defaultType);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [transactionDate, setTransactionDate] = useState('');
  const [transactionTime, setTransactionTime] = useState('00:00:00');
  const [targetType, setTargetType] = useState<'company' | 'employee' | 'client'>('company');
  const [targetId, setTargetId] = useState<string>('');

  const toast = useToast();
  const { data: employeesData } = useGetAccountsByType('employee', {}, isOpen);

  const [selectedBoxId, setSelectedBoxId] = useState<number | undefined>(boxId);

  const { data: boxes } = useGetCashBoxes();
  
  // Auto-select if only one box and no boxId provided
  useEffect(() => {
    if (!boxId && boxes && boxes.length === 1 && !selectedBoxId) {
      setSelectedBoxId(boxes[0].id);
    }
  }, [boxes, boxId, selectedBoxId]);

  const recordMutation = useRecordVoucher(selectedBoxId || 0);
  const updateMutation = useUpdateVoucher(selectedBoxId || 0, voucherToEdit?.id || 0);
  const updateTransactionMutation = useUpdateTransaction();

  // Initialize form states
  useEffect(() => {
    if (isOpen) {
      if (boxId) setSelectedBoxId(boxId);
      if (voucherToEdit) {
        const isReceipt = (voucherToEdit.debit || 0) > 0 || voucherToEdit.transaction_type === 'CASHBOX_RECEIPT' || (voucherToEdit as any).type === 'CASHBOX_RECEIPT';
        setType(isReceipt ? 'receipt' : 'payment');
        const amt = (voucherToEdit.debit || 0) > 0 ? voucherToEdit.debit : voucherToEdit.credit;
        setAmount(String(amt));
        setDescription(voucherToEdit.description || '');
        
        // Handle date and time
        const rawDate = voucherToEdit.date || (voucherToEdit as any).transaction_date || (voucherToEdit as any).created_at || '';
        const { date: initialDate, time: initialTime } = parseDateTimeParts(rawDate);
        setTransactionDate(initialDate);
        setTransactionTime(initialTime);
      } else {
        setType(defaultType);
        setAmount('');
        setDescription('');
        const { date: initialDate, time: initialTime } = parseDateTimeParts(null);
        setTransactionDate(initialDate);
        setTransactionTime(initialTime);
        setTargetType('company');
        setTargetId('');
      }
    }
  }, [isOpen, voucherToEdit, defaultType]);

  const handleSubmit = () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('خطأ', 'يرجى إدخال مبلغ صالح أكبر من الصفر');
      return;
    }
    if (!description.trim()) {
      toast.error('خطأ', 'الوصف مطلوب');
      return;
    }
    if (!selectedBoxId) {
      toast.error('خطأ', 'يرجى اختيار الصندوق');
      return;
    }

    if (!isEdit) {
      if (targetType !== 'company' && !targetId) {
        toast.error('خطأ', `يرجى تحديد ${targetType === 'employee' ? 'الموظف' : 'العميل'}`);
        return;
      }
    }

    const finalDateTime = transactionDate ? `${transactionDate} ${transactionTime || '00:00:00'}` : undefined;

    const payload = {
      type,
      amount: parseFloat(amount),
      description: description.trim(),
      target_account_type: isEdit ? 'company' : targetType,
      target_account_id: isEdit ? 1 : (targetType === 'company' ? 1 : parseInt(targetId)),
      transaction_date: finalDateTime,
    };

    if (isEdit && isTreasury) {
      const debit = type === 'receipt' ? parseFloat(amount) : 0;
      const credit = type === 'payment' ? parseFloat(amount) : 0;
      const updatePayload = {
        debit,
        credit,
        description: description.trim(),
        transaction_date: finalDateTime,
      };

      updateTransactionMutation.mutate({ id: voucherToEdit!.id, data: updatePayload }, {
        onSuccess: () => {
          toast.success('تم تحديث الحركة بنجاح');
          onClose();
        },
        onError: (err: any) => {
          toast.error('حدث خطأ', err.response?.data?.message || 'حاول مرة أخرى');
        }
      });
      return;
    }

    const mutation = isEdit ? updateMutation : recordMutation;

    mutation.mutate(payload as any, {
      onSuccess: () => {
        toast.success(isEdit ? 'تم تحديث السند بنجاح' : 'تم تسجيل السند بنجاح');
        onClose();
      },
      onError: (err: any) => {
        toast.error('حدث خطأ', err.response?.data?.message || 'حاول مرة أخرى');
      }
    });
  };

  return (
    <BaseModal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={isEdit ? `تعديل السند #${voucherToEdit?.id}` : (type === 'receipt' ? 'تسجيل سند قبض' : 'تسجيل سند صرف')}
    >
      <div className="space-y-4 p-4 text-right" dir="rtl">
        {/* Box Selector */}
        {!boxId && boxes && boxes.length > 1 && (
          <div>
            <label className="block text-sm font-medium mb-2 text-text-primary">اختيار الصندوق</label>
            <select
              value={selectedBoxId || ''}
              onChange={(e) => setSelectedBoxId(Number(e.target.value))}
              className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="" disabled>-- اختر الصندوق --</option>
              {boxes.map(box => (
                <option key={box.id} value={box.id}>{box.name} ({box.balance})</option>
              ))}
            </select>
          </div>
        )}

        {/* Toggle Receipt / Payment */}
        {!isEdit && (
          <div>
            <label className="block text-sm font-medium mb-2 text-text-primary">نوع السند</label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={type === 'receipt' ? 'primary' : 'secondary'}
                onClick={() => setType('receipt')}
                className="w-full"
              >
                قبض (إيداع بالصندوق)
              </Button>
              <Button
                variant={type === 'payment' ? 'danger' : 'secondary'}
                onClick={() => setType('payment')}
                className="w-full"
              >
                صرف (دفعة من الصندوق)
              </Button>
            </div>
          </div>
        )}

        {/* Amount */}
        <div>
          <NumberInput
            name="amount"
            label="المبلغ"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>

        {/* Date & Time row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-text-primary">تاريخ السند</label>
            <input
              type="date"
              className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-right"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-text-primary">وقت السند (HH:MM:SS)</label>
            <input
              type="time"
              step="1"
              dir="ltr"
              className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm font-mono text-center focus:outline-none focus:ring-1 focus:ring-primary"
              value={transactionTime}
              onChange={(e) => setTransactionTime(e.target.value)}
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-1 text-text-primary">البيان (الوصف)</label>
          <input
            type="text"
            className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background text-right"
            placeholder="مثال: عهدة مؤقتة، مصروفات صيانة..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Target Account (Only for Create) */}
        {!isEdit && (
          <div className="border-t border-border pt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-text-primary">الحساب الطرف الآخر</label>
              <select
                className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background text-right"
                value={targetType}
                onChange={(e) => {
                  setTargetType(e.target.value as any);
                  setTargetId('');
                }}
              >
                <option value="company">حساب الشركة الرئيسي</option>
                <option value="employee">موظف</option>
                <option value="client">عميل</option>
              </select>
            </div>

            {targetType === 'employee' && (
              <div>
                <label className="block text-sm font-medium mb-1 text-text-primary">اختر الموظف</label>
                <select
                  className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background text-right"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  required
                >
                  <option value="">اختر موظفاً...</option>
                  {employeesData?.accounts?.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {targetType === 'client' && (
              <div>
                <label className="block text-sm font-medium mb-1 text-text-primary">اختر العميل</label>
                <ClientSearchCombobox
                  value={targetId}
                  onChange={(val) => setTargetId(val)}
                  placeholder="ابحث عن عميل..."
                />
              </div>
            )}
          </div>
        )}

        {/* Submit */}
        <div className="pt-2">
          <Button
            className="w-full"
            onClick={handleSubmit}
            isLoading={isEdit ? updateMutation.isPending : recordMutation.isPending}
          >
            {isEdit ? 'تحديث السند' : 'حفظ السند'}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};
