import React from 'react';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';

interface ValidationConsequences {
    task: {
        id: number;
        name: string;
        current_status: string;
        new_status: string;
    };
    invoices_to_delete: Array<{
        invoice_id: number;
        description: string;
        amount: number;
        paid_amount: number;
        has_payments: boolean;
    }>;
    payments_to_delete: any[];
    commission_to_delete: any;
}

interface TaskRestoreValidationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    validation: {
        allowed: boolean;
        consequences: ValidationConsequences;
    };
    isPending: boolean;
}

const TaskRestoreValidationModal: React.FC<TaskRestoreValidationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    validation,
    isPending
}) => {
    const { consequences } = validation;

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="تأكيد استعادة المهمة"
        >
            <div className="space-y-4" dir="rtl">
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <span className="text-xl">⚠️</span>
                        </div>
                        <div className="mr-3">
                            <h3 className="text-sm font-medium text-yellow-800">
                                تنبيه هام
                            </h3>
                            <div className="mt-2 text-sm text-yellow-700">
                                <p>
                                    سيؤدي استعادة المهمة <strong>{consequences.task.name}</strong> إلى الحالة "جديدة" إلى حذف السجلات المالية التالية نهائياً:
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    {consequences.invoices_to_delete.length > 0 && (
                        <div className="bg-red-50 p-3 rounded-md border border-red-100">
                            <h4 className="font-bold text-red-800 text-sm mb-2">الفواتير التي سيتم حذفها:</h4>
                            <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                                {consequences.invoices_to_delete.map((inv) => (
                                    <li key={inv.invoice_id}>
                                        فاتورة #{inv.invoice_id} - {inv.description}
                                        ({inv.amount} ريال)
                                        {inv.has_payments && (
                                            <span className="block mr-5 text-sm font-bold text-red-800">
                                                ⚠️ تحتوي على مدفوعات بقيمة {inv.paid_amount} ريال سيتم حذفها أيضاً!
                                            </span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {consequences.commission_to_delete && (
                        <div className="bg-red-50 p-3 rounded-md border border-red-100">
                            <h4 className="font-bold text-red-800 text-sm mb-2">العمولات التي سيتم إلغاؤها:</h4>
                            <p className="text-sm text-red-700">
                                سيتم إلغاء العمولات المعلقة للموظف {consequences.commission_to_delete.employee_name}
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                    <Button variant="secondary" onClick={onClose} disabled={isPending}>
                        إلغاء
                    </Button>
                    <Button
                        variant="danger"
                        onClick={onConfirm}
                        isLoading={isPending}
                    >
                        تأكيد واستعادة المهمة
                    </Button>
                </div>
            </div>
        </BaseModal>
    );
};

export default TaskRestoreValidationModal;
