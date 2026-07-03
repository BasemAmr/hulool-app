import { useState } from 'react';
import BaseModal from '@/shared/ui/layout/BaseModal';
import Input from '@/shared/ui/primitives/Input';
import Button from '@/shared/ui/primitives/Button';
import {
  ShadcnSelect as Select,
  ShadcnSelectTrigger as SelectTrigger,
  ShadcnSelectValue as SelectValue,
  ShadcnSelectContent as SelectContent,
  ShadcnSelectItem as SelectItem
} from '@/shared/ui/shadcn/select';
import { useGetEmployeesForSelection } from '@/features/employees/api/employeeQueries';
import { useCreateCashBox } from '../api/cashBoxQueries';
import { useToast } from '@/shared/hooks/useToast';

interface CreateCashBoxModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateCashBoxModal: React.FC<CreateCashBoxModalProps> = ({
  isOpen,
  onClose
}) => {
  const [name, setName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');

  const toast = useToast();
  const { data: employees, isLoading: isLoadingEmployees } = useGetEmployeesForSelection();
  const mutation = useCreateCashBox();

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error('خطأ', 'يرجى إدخال اسم الصندوق');
      return;
    }
    if (!employeeId) {
      toast.error('خطأ', 'يرجى اختيار الموظف المسؤول');
      return;
    }

    const payload = {
      name: name.trim(),
      employee_id: parseInt(employeeId),
      opening_balance: openingBalance ? parseFloat(openingBalance) : 0,
    };

    mutation.mutate(payload, {
      onSuccess: () => {
        toast.success('تم إنشاء الصندوق بنجاح');
        setName('');
        setEmployeeId('');
        setOpeningBalance('');
        onClose();
      },
      onError: (err: any) => {
        toast.error('حدث خطأ', err.response?.data?.message || 'حاول مرة أخرى');
      }
    });
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="إنشاء صندوق جديد">
      <div className="space-y-4 p-4" dir="rtl">
        <div>
          <label className="block text-sm font-medium mb-1 text-right">اسم الصندوق</label>
          <Input
            type="text"
            placeholder="مثال: عهدة المشتريات، صندوق الطوارئ"
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-right">الموظف المسؤول</label>
          <Select value={employeeId} onValueChange={(val: string) => setEmployeeId(val)}>
            <SelectTrigger className="w-full text-right flex-row-reverse">
              <SelectValue placeholder="اختر الموظف المسؤول" />
            </SelectTrigger>
            <SelectContent>
              {employees?.map((emp) => (
                <SelectItem key={emp.id} value={String(emp.id)} className="text-right">
                  {emp.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-right">الرصيد الافتتاحي</label>
          <Input
            type="number"
            placeholder="0.00"
            value={openingBalance}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOpeningBalance(e.target.value)}
          />
        </div>

        <div className="pt-2">
          <Button
            className="w-full"
            onClick={handleSubmit}
            isLoading={mutation.isPending}
          >
            إنشاء صندوق
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};
