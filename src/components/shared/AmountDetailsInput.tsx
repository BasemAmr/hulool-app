import { useFieldArray, type Control, type UseFormRegister, useWatch } from 'react-hook-form';
import { XCircle, PlusCircle } from 'lucide-react';
import Button from '../ui/Button';

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
      <div className="d-flex justify-content-between align-items-center mb-2">
        <label className="form-label mb-0">تفاصيل المبلغ (اختياري)</label>
        <Button type="button" variant="outline-primary" size="sm" onClick={() => append({ description: '', amount: '' })}>
          <PlusCircle size={16} className="me-1" /> إضافة تفصيل
        </Button>
      </div>

      {fields.length > 0 && (
        <div className="p-3 border rounded bg-light mb-2">
          {fields.map((field, index) => (
            <div key={field.id} className="d-flex gap-2 mb-2 align-items-center">
              <input
                {...register(`amount_details.${index}.description`)}
                className="form-control"
                placeholder={`وصف البند ${index + 1}`}
              />
              <input
                {...register(`amount_details.${index}.amount`, { valueAsNumber: true })}
                type="number"
                step="0.01"
                className="form-control"
                placeholder="المبلغ"
                style={{ width: '120px' }}
              />
              <Button type="button" variant="danger" size="sm" onClick={() => remove(index)}>
                <XCircle size={16} />
              </Button>
            </div>
          ))}
        </div>
      )}

      {fields.length > 0 && (
        <div className="alert alert-info py-2 small">
          المبلغ الإجمالي: {totalAmount.toLocaleString()} | 
          مجموع التفاصيل: {currentDetailsSum.toLocaleString()} | 
          المتبقي للتفصيل: <span className="fw-bold">{remainingAmount.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
};

export default AmountDetailsInput;
