import { useState, useEffect } from 'react';
import { AlertTriangle, User, Mail, Calendar, X } from 'lucide-react';
import BaseModal from '@/shared/ui/layout/BaseModal';
import Button from '@/shared/ui/primitives/Button';
import { useModalStore } from '@/shared/stores/modalStore';
import apiClient from '@/api/client';
import type { EmployeeDeletionPreview, EmployeeAccount } from '@/api/types';

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
                    <div className="p-3 bg-status-danger-bg rounded-full">
                        <AlertTriangle className="w-6 h-6 text-status-danger-text" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-text-primary">تأكيد حذف الموظف</h2>
                        <p className="text-sm text-text-primary/70">مراجعة البيانات قبل الحذف</p>
                    </div>
                </div>

                {/* Loading State */}
                {isLoading && (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <span className="mr-3 text-text-primary">جاري التحميل...</span>
                    </div>
                )}

                {/* Error State */}
                {error && !isLoading && (
                    <div className="p-4 bg-status-danger-bg border border-status-danger-border rounded-lg text-center">
                        <p className="text-status-danger-text font-bold">{error}</p>
                    </div>
                )}

                {/* Preview Content */}
                {preview && !isLoading && !error && (
                    <>
                        {/* Employee Info */}
                        <div className="bg-bg-surface-muted rounded-lg p-4 space-y-3">
                            <h3 className="font-bold text-text-primary text-lg mb-3">بيانات الموظف</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-text-muted" />
                                    <span className="text-text-primary font-bold">{preview.user.display_name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-text-muted" />
                                    <span className="text-text-primary">{preview.user.email}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-text-muted text-sm">اسم المستخدم:</span>
                                    <span className="text-text-primary font-bold">@{preview.user.username}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-text-muted" />
                                    <span className="text-text-primary text-sm">تاريخ الإنشاء: {formatDate(preview.user.created_at)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Related Records Table */}
                        <div className="border border-border-default rounded-lg overflow-hidden">
                            <div className="bg-bg-surface-muted px-4 py-3 border-b border-border-default">
                                <h3 className="font-bold text-text-primary text-lg">السجلات المرتبطة</h3>
                            </div>
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-bg-surface-muted">
                                        <th className="px-4 py-3 text-right font-bold text-text-primary border-b border-border-default">نوع السجل</th>
                                        <th className="px-4 py-3 text-center font-bold text-text-primary border-b border-border-default">العدد</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recordsTableData.map((row, index) => (
                                        <tr key={index} className={index % 2 === 0 ? 'bg-card' : 'bg-bg-surface-muted'}>
                                            <td className="px-4 py-3 text-right font-bold text-text-primary border-b border-gray-100">{row.label}</td>
                                            <td className="px-4 py-3 text-center font-bold text-text-primary border-b border-gray-100">
                                                {formatNumber(row.count)}
                                            </td>
                                        </tr>
                                    ))}
                                    {/* Balance Due Row - Highlighted */}
                                    <tr className="bg-status-warning-bg">
                                        <td className="px-4 py-3 text-right font-bold text-text-primary border-b border-border-default">الرصيد المستحق</td>
                                        <td className="px-4 py-3 text-center font-bold text-text-primary border-b border-border-default">
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
                                            ? 'bg-status-warning-bg border-status-warning-border text-status-warning-text'
                                            : warning.type === 'error'
                                                ? 'bg-status-danger-bg border-status-danger-border text-status-danger-text'
                                                : 'bg-status-info-bg border-status-info-border text-blue-800'
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
                                    <p className="font-bold text-text-primary text-lg">تحذير هام</p>
                                    <p className="text-text-primary mt-1">{preview.action_description}</p>
                                    <ul className="mt-2 space-y-1 text-text-primary list-disc mr-5">
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
