import { useFieldArray, type Control, type UseFormRegister, useWatch, Controller } from 'react-hook-form';
import { XCircle, PlusCircle } from 'lucide-react';
import Button from '../ui/Button';
import { NumberInput } from '../ui/NumberInput';

interface AmountDetailsInputProps {
  control: Control<any>;
  register: UseFormRegister<any>;
  totalAmount: number;
}

const AmountDetailsInput = ({ control, register, totalAmount }: AmountDetailsInputProps) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "amount_details",
  });

  // Watch the amount_details to calculate sum. API may return a JSON string ("[]").
  const watched = useWatch({ control, name: "amount_details" });
  const amountDetails = Array.isArray(watched)
    ? watched
    : (typeof watched === 'string'
      ? (() => { try { const p = JSON.parse(watched); return Array.isArray(p) ? p : []; } catch { return []; } })()
      : []);

  const currentDetailsSum = amountDetails.reduce((sum: number, item: any) => sum + (Number(item?.amount) || 0), 0);
  const remainingAmount = totalAmount - currentDetailsSum;

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <label className="block text-sm font-medium text-foreground">تفاصيل المبلغ (اختياري)</label>
        <Button type="button" variant="outline-primary" size="sm" onClick={() => append({ description: '', amount: '' })}>
          <PlusCircle size={16} className="ml-1" /> إضافة تفصيل
        </Button>
      </div>

      {fields.length > 0 && (
        <div className="p-3 border border-border rounded-md bg-muted/50 mb-2">
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 mb-2 items-center">
              <input
                {...register(`amount_details.${index}.description`)}
                className="base-input"
                placeholder={`وصف البند ${index + 1}`}
              />
              <Controller
                control={control}
                name={`amount_details.${index}.amount`}
                render={({ field }) => (
                  <NumberInput
                    name={field.name}
                    value={field.value}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    placeholder="المبلغ"
                    style={{ width: '120px' }}
                    className="mb-0"
                  />
                )}
              />
              <Button type="button" variant="danger" size="sm" onClick={() => remove(index)}>
                <XCircle size={16} />
              </Button>
            </div>
          ))}
        </div>
      )}

      {fields.length > 0 && (
        <div className="p-2 rounded-md text-sm bg-blue-50 border border-blue-200 text-blue-800">
          المبلغ الإجمالي: {totalAmount.toLocaleString()} |
          مجموع التفاصيل: {currentDetailsSum.toLocaleString()} |
          المتبقي للتفصيل: <span className="font-bold">{remainingAmount.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
};

export default AmountDetailsInput;
