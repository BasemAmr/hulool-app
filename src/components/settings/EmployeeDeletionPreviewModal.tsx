import { useState, useEffect } from 'react';
import { AlertTriangle, User, Mail, Calendar, X } from 'lucide-react';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import { useModalStore } from '../../stores/modalStore';
import apiClient from '../../api/apiClient';
import type { EmployeeDeletionPreview, EmployeeAccount } from '../../api/types';

interface EmployeeDeletionPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    employee: EmployeeAccount;
    onConfirmDelete: () => Promise<void>;
}

const EmployeeDeletionPreviewModal = ({
    isOpen,
    onClose,
    employee,
    onConfirmDelete,
}: EmployeeDeletionPreviewModalProps) => {
    const [preview, setPreview] = useState<EmployeeDeletionPreview | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch preview when modal opens
    useEffect(() => {
        const fetchPreview = async () => {
            if (!isOpen || !employee?.id) return;

            setIsLoading(true);
            setError(null);

            try {
                const response = await apiClient.get(`/users/${employee.id}/deletion-preview`);
                setPreview(response.data.data);
            } catch (err: any) {
                setError(err.response?.data?.message || 'فشل في جلب بيانات المعاينة');
            } finally {
                setIsLoading(false);
            }
        };

        fetchPreview();
    }, [isOpen, employee?.id]);

    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        try {
            await onConfirmDelete();
            onClose();
        } catch (err: any) {
            setError(err.message || 'فشل في حذف الموظف');
        } finally {
            setIsDeleting(false);
        }
    };

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('ar-SA').format(num);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ar-SA', {
            style: 'currency',
            currency: 'SAR',
            minimumFractionDigits: 2,
        }).format(amount);
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    // Records table data
    const recordsTableData = preview ? [
        { label: 'المهام المسندة', count: preview.related_records.tasks_assigned },
        { label: 'المهام المنشأة', count: preview.related_records.tasks_created },
        { label: 'الفواتير', count: preview.related_records.invoices_created },
        { label: 'المعاملات المالية', count: preview.related_records.transactions },
        { label: 'العمولات المعلقة', count: preview.related_records.pending_commissions },
    ] : [];

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title="">
            <div className="space-y-6" dir="rtl">
                {/* Header */}
                <div className="flex items-center gap-3 pb-4 border-b border-border">
                    <div className="p-3 bg-red-100 rounded-full">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-black">تأكيد حذف الموظف</h2>
                        <p className="text-sm text-black/70">مراجعة البيانات قبل الحذف</p>
                    </div>
                </div>

                {/* Loading State */}
                {isLoading && (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <span className="mr-3 text-black">جاري التحميل...</span>
                    </div>
                )}

                {/* Error State */}
                {error && !isLoading && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
                        <p className="text-red-700 font-bold">{error}</p>
                    </div>
                )}

                {/* Preview Content */}
                {preview && !isLoading && !error && (
                    <>
                        {/* Employee Info */}
                        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                            <h3 className="font-bold text-black text-lg mb-3">بيانات الموظف</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-gray-500" />
                                    <span className="text-black font-bold">{preview.user.display_name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-gray-500" />
                                    <span className="text-black">{preview.user.email}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-500 text-sm">اسم المستخدم:</span>
                                    <span className="text-black font-bold">@{preview.user.username}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-gray-500" />
                                    <span className="text-black text-sm">تاريخ الإنشاء: {formatDate(preview.user.created_at)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Related Records Table */}
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
                                <h3 className="font-bold text-black text-lg">السجلات المرتبطة</h3>
                            </div>
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50">
                                        <th className="px-4 py-3 text-right font-bold text-black border-b border-gray-200">نوع السجل</th>
                                        <th className="px-4 py-3 text-center font-bold text-black border-b border-gray-200">العدد</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recordsTableData.map((row, index) => (
                                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                            <td className="px-4 py-3 text-right font-bold text-black border-b border-gray-100">{row.label}</td>
                                            <td className="px-4 py-3 text-center font-bold text-black border-b border-gray-100">
                                                {formatNumber(row.count)}
                                            </td>
                                        </tr>
                                    ))}
                                    {/* Balance Due Row - Highlighted */}
                                    <tr className="bg-yellow-50">
                                        <td className="px-4 py-3 text-right font-bold text-black border-b border-gray-200">الرصيد المستحق</td>
                                        <td className="px-4 py-3 text-center font-bold text-black border-b border-gray-200">
                                            {formatCurrency(preview.related_records.balance_due)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Warnings */}
                        {preview.warnings.length > 0 && (
                            <div className="space-y-2">
                                {preview.warnings.map((warning, index) => (
                                    <div
                                        key={index}
                                        className={`p-3 rounded-lg border ${warning.type === 'warning'
                                            ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                                            : warning.type === 'error'
                                                ? 'bg-red-50 border-red-200 text-red-800'
                                                : 'bg-blue-50 border-blue-200 text-blue-800'
                                            }`}
                                    >
                                        <p className="font-bold">{warning.message}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Action Description */}
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="font-bold text-black text-lg">تحذير هام</p>
                                    <p className="text-black mt-1">{preview.action_description}</p>
                                    <ul className="mt-2 space-y-1 text-black list-disc mr-5">
                                        <li className="font-bold">سيتم إلغاء تفعيل حساب الموظف</li>
                                        <li className="font-bold">لن يتمكن الموظف من تسجيل الدخول</li>
                                        <li className="font-bold">سيتم الاحتفاظ بجميع السجلات للمراجعة</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Actions */}
                <div className="flex items-center justify-start gap-3 pt-4 border-t border-border">
                    <Button
                        variant="danger"
                        onClick={handleConfirmDelete}
                        isLoading={isDeleting}
                        disabled={isLoading || !!error}
                    >
                        <AlertTriangle className="w-4 h-4 ml-2" />
                        تأكيد الحذف
                    </Button>
                    <Button variant="outline-info" onClick={onClose}>
                        إلغاء
                    </Button>
                </div>
            </div>
        </BaseModal>
    );
};

export default EmployeeDeletionPreviewModal;
