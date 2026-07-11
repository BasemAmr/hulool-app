import { useForm } from 'react-hook-form';
import Input from '@/shared/ui/primitives/Input';
import Button from '@/shared/ui/primitives/Button';
import type { CreateEmployeeAccountRequest } from '@/api/types';

interface EmployeeFormProps {
    onSubmit: (data: CreateEmployeeAccountRequest) => void;
    isLoading?: boolean;
    onCancel: () => void;
    isAdmin?: boolean;
}

const EmployeeForm = ({ onSubmit, isLoading = false, onCancel, isAdmin = false }: EmployeeFormProps) => {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<CreateEmployeeAccountRequest>({
        defaultValues: {
            type: 'employee',
        },
    });

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" dir="rtl">
            <Input
                label="الاسم *"
                {...register('display_name', {
                    required: 'الاسم مطلوب',
                    minLength: {
                        value: 2,
                        message: 'الاسم يجب أن يكون حرفين على الأقل',
                    },
                })}
                error={errors.display_name?.message}
                placeholder="مثال: أحمد علي"
            />

            <Input
                label="رقم الجوال *"
                type="tel"
                {...register('phone', {
                    required: 'رقم الجوال مطلوب',
                    pattern: {
                        value: /^[0-9]{7,15}$/,
                        message: 'رقم الجوال يجب أن يكون أرقاماً فقط (7-15 خانة)',
                    },
                })}
                error={errors.phone?.message}
                placeholder="مثال: 0512345678"
                inputMode="numeric"
            />

            <Input
                label="كلمة المرور (اختياري)"
                type="password"
                {...register('password')}
                placeholder="اتركه فارغاً للإنشاء التلقائي"
            />

            <p className="text-xs text-foreground/60 mt-2">
                * إذا تركت كلمة المرور فارغة، سيتم إنشاء كلمة مرور آمنة تلقائياً
            </p>

            {isAdmin && (
                <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-foreground tracking-tight">
                        نوع الحساب
                    </label>
                    <select
                        {...register('type')}
                        className="base-input w-full"
                    >
                        <option value="employee">موظف</option>
                        <option value="employee_admin">مدير موظفين</option>
                        <option value="admin">مدير</option>
                    </select>
                </div>
            )}

            <div className="flex items-center justify-start gap-3 pt-4 border-t border-border">
                <Button
                    type="submit"
                    variant="primary"
                    isLoading={isLoading}
                >
                    إنشاء موظف
                </Button>
                <Button
                    type="button"
                    variant="outline-info"
                    onClick={onCancel}
                    disabled={isLoading}
                >
                    إلغاء
                </Button>
            </div>
        </form>
    );
};

export default EmployeeForm;
