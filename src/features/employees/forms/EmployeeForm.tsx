import { useForm } from 'react-hook-form';
import Input from '@/shared/ui/primitives/Input';
import Button from '@/shared/ui/primitives/Button';
import type { CreateEmployeeAccountRequest } from '@/api/types';

interface EmployeeFormProps {
    onSubmit: (data: CreateEmployeeAccountRequest) => void;
    isLoading?: boolean;
    onCancel: () => void;
}

const EmployeeForm = ({ onSubmit, isLoading = false, onCancel }: EmployeeFormProps) => {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<CreateEmployeeAccountRequest>();

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" dir="rtl">
            <Input
                label="اسم المستخدم *"
                {...register('username', {
                    required: 'اسم المستخدم مطلوب',
                    pattern: {
                        value: /^[a-zA-Z0-9_]+$/,
                        message: 'اسم المستخدم يمكن أن يحتوي فقط على حروف وأرقام وشرطات سفلية',
                    },
                    validate: (value) => {
                        if (value.includes(' ')) {
                            return 'اسم المستخدم لا يمكن أن يحتوي على مسافات';
                        }
                        return true;
                    },
                })}
                error={errors.username?.message}
                placeholder="مثال: ahmed_ali"
            />

            <Input
                label="الاسم المعروض *"
                {...register('display_name', {
                    required: 'الاسم المعروض مطلوب',
                    minLength: {
                        value: 2,
                        message: 'الاسم المعروض يجب أن يكون حرفين على الأقل',
                    },
                })}
                error={errors.display_name?.message}
                placeholder="مثال: أحمد علي"
            />

            <Input
                label="البريد الإلكتروني *"
                type="email"
                {...register('email', {
                    required: 'البريد الإلكتروني مطلوب',
                    pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'صيغة البريد الإلكتروني غير صحيحة',
                    },
                })}
                error={errors.email?.message}
                placeholder="مثال: ahmed@company.com"
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
