import { useState } from 'react';
import { Trash2, Save, X, Key, RotateCcw, Shield, ArrowLeftRight } from 'lucide-react';
import Button from '@/shared/ui/primitives/Button';
import {
    useEmployeesList,
    useCreateEmployee,
    useUpdateUserProfile,
    useDeleteEmployee,
    useCurrentUserCapabilities,
    useAdminResetPassword,
} from '@/features/employees/api/userQueries';
import RecoveryCodesModal from '@/features/employees/modals/RecoveryCodesModal';
import type { CreateEmployeeAccountRequest, EmployeeAccount } from '@/api/types';
import { useToast } from '@/shared/hooks/useToast';
import { useModalStore } from '@/shared/stores/modalStore';
import { useAuthStore } from '@/features/auth/store/authStore';

const TYPE_LABELS: Record<string, string> = {
    admin: 'مدير',
    employee_admin: 'مدير موظفين',
    employee: 'موظف',
};

const TYPE_STYLES: Record<string, string> = {
    admin: 'bg-red-100 text-red-700 border-red-200',
    employee_admin: 'bg-blue-100 text-blue-700 border-blue-200',
    employee: 'bg-green-100 text-green-700 border-green-200',
};

const EmployeeAccountsManagement = () => {
    const [editingField, setEditingField] = useState<{ id: number; field: 'display_name' | 'phone' } | null>(null);
    const [editValue, setEditValue] = useState('');

    // Admin reset password dialog state
    const [resetPasswordDialog, setResetPasswordDialog] = useState<{ employee: EmployeeAccount; newPassword: string } | null>(null);

    const { success, error: showError } = useToast();
    const { data: capabilities } = useCurrentUserCapabilities();
    const { data: employees, isLoading, error: loadError } = useEmployeesList();
    const createEmployee = useCreateEmployee();
    const updateUserProfile = useUpdateUserProfile();
    const deleteEmployee = useDeleteEmployee();
    const adminResetPassword = useAdminResetPassword();
    const { openModal, closeModal } = useModalStore();
    const { user: currentUser, logout } = useAuthStore();

    // Permission checks — also accept employee type
    const hasManageOptions = capabilities?.manage_options || false;
    const isElevated = currentUser?.type === 'admin' || currentUser?.type === 'employee_admin';
    const hasTmManageEmployees = hasManageOptions || isElevated || currentUser?.capabilities?.tm_manage_users || false;

    const handleCreateEmployee = async (data: CreateEmployeeAccountRequest) => {
        try {
            const credentials = await createEmployee.mutateAsync(data);
            closeModal();
            openModal('employeeCredentials', { credentials });
            success('تم إنشاء الموظف بنجاح');
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || 'فشل في إنشاء الموظف';
            showError(errorMessage);

            if (errorMessage.toLowerCase().includes('phone')) {
                showError('رقم الجوال موجود بالفعل');
            }
        }
    };

    const startEditing = (id: number, field: 'display_name' | 'phone', currentValue: string) => {
        setEditingField({ id, field });
        setEditValue(currentValue);
    };

    const cancelEditing = () => {
        setEditingField(null);
        setEditValue('');
    };

    const saveEdit = async () => {
        if (!editingField) return;

        if (editingField.field === 'phone') {
            const digits = editValue.replace(/[^0-9]/g, '');
            if (digits.length < 7 || digits.length > 15) {
                showError('رقم الهاتف غير صالح. يجب أن يكون 7-15 رقم.');
                return;
            }
        }

        try {
            await updateUserProfile.mutateAsync({
                userId: editingField.id,
                [editingField.field]: editValue,
            });

            setEditingField(null);
            setEditValue('');
            success('تم تحديث الموظف بنجاح');
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || 'فشل في تحديث الموظف';
            showError(errorMessage);
        }
    };

    const handleDeleteClick = (employee: EmployeeAccount) => {
        openModal('employeeDeletionPreview', {
            employee,
            onConfirmDelete: async () => {
                await deleteEmployee.mutateAsync({ userId: employee.id });
                success('تم إلغاء تفعيل حساب الموظف بنجاح');
            },
        });
    };

    const [recoveryModalEmployee, setRecoveryModalEmployee] = useState<EmployeeAccount | null>(null);

    const handleOpenRecoveryCodes = (employee: EmployeeAccount) => {
        setRecoveryModalEmployee(employee);
    };

    const handleAdminResetPassword = async () => {
        if (!resetPasswordDialog) return;

        try {
            const result = await adminResetPassword.mutateAsync({
                userId: resetPasswordDialog.employee.id,
                password: resetPasswordDialog.newPassword,
            });
            setResetPasswordDialog(null);
            openModal('employeeCredentials', {
                credentials: {
                    id: resetPasswordDialog.employee.id,
                    display_name: resetPasswordDialog.employee.display_name,
                    password: resetPasswordDialog.newPassword,
                    app_password: '****************',
                    recovery_codes: result.recovery_codes,
                }
            });
            success('تم إعادة تعيين كلمة المرور بنجاح');
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || 'فشل في إعادة تعيين كلمة المرور';
            showError(errorMessage);
        }
    };

    const handleToggleTransactionPermission = async (employee: EmployeeAccount) => {
        const newValue = !employee.can_make_transactions;
        try {
            await updateUserProfile.mutateAsync({
                userId: employee.id,
                can_make_transactions: newValue,
            });
            success(newValue ? 'تم تفعيل صلاحية المعاملات' : 'تم إلغاء صلاحية المعاملات');
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || 'فشل تحديث صلاحية المعاملات';
            showError(errorMessage);
        }
    };

    if (!hasTmManageEmployees) {
        return (
            <div className="p-6 bg-status-warning-bg border border-status-warning-border rounded-lg">
                <p className="text-status-warning-text font-semibold">
                    ليس لديك صلاحية لإدارة حسابات الموظفين.
                </p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-background rounded w-1/3"></div>
                    <div className="h-64 bg-background rounded"></div>
                </div>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="p-6 bg-status-danger-bg border border-status-danger-border rounded-lg">
                <p className="text-status-danger-text font-semibold mb-2">فشل في تحميل الموظفين</p>
                <Button variant="outline-danger" onClick={() => window.location.reload()}>
                    إعادة المحاولة
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground">إدارة حسابات الموظفين</h2>
                <Button
                    variant="primary"
                    onClick={() => openModal('createEmployee', {
                        onSubmit: handleCreateEmployee,
                        isLoading: createEmployee.isPending,
                        isAdmin: hasManageOptions,
                    })}
                >
                    إنشاء موظف جديد
                </Button>
            </div>

            {/* Description */}
            <p className="text-sm text-foreground/60">
                إدارة حسابات الموظفين مع إنشاء حسابات مبسط. يتم تعيين دور المحرر الافتراضي للموظفين.
            </p>

            {/* Employee List Table */}
            {!employees || employees.length === 0 ? (
                <div className="p-12 text-center bg-background rounded-lg border border-dashed border-border">
                    <p className="text-foreground/60 text-lg mb-4">لا يوجد موظفين. قم بإنشاء أول موظف.</p>
                    <Button
                        variant="primary"
                        onClick={() => openModal('createEmployee', {
                            onSubmit: handleCreateEmployee,
                            isLoading: createEmployee.isPending,
                            isAdmin: hasManageOptions,
                        })}
                    >
                        إنشاء موظف جديد
                    </Button>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead className="bg-background sticky top-0">
                            <tr>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-foreground border-b border-border">
                                    الاسم
                                </th>
                                <th className="px-4 py-3 text-center text-sm font-semibold text-foreground border-b border-border">
                                    رقم الجوال
                                </th>
                                <th className="px-4 py-3 text-center text-sm font-semibold text-foreground border-b border-border">
                                    نوع الحساب
                                </th>
                                <th className="px-4 py-3 text-center text-sm font-semibold text-foreground border-b border-border">
                                    الحالة
                                </th>
                                <th className="px-4 py-3 text-center text-sm font-semibold text-foreground border-b border-border">
                                    صلاحية المعاملات
                                </th>
                                <th className="px-4 py-3 text-center text-sm font-semibold text-foreground border-b border-border">
                                    الإجراءات
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map((employee) => (
                                <tr key={employee.id} className="hover:bg-background transition-colors">
                                    {/* Display Name - Editable */}
                                    <td className="px-4 py-3 text-sm border-b border-border">
                                        {editingField?.id === employee.id && editingField?.field === 'display_name' ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    className="px-2 py-1 border border-border rounded text-sm flex-1"
                                                    autoFocus
                                                />
                                                <Button variant="outline-success" size="sm" onClick={saveEdit} disabled={updateUserProfile.isPending}>
                                                    <Save className="h-3 w-3" />
                                                </Button>
                                                <Button variant="outline-danger" size="sm" onClick={cancelEditing}>
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => startEditing(employee.id, 'display_name', employee.display_name)}
                                                className="text-primary hover:underline cursor-pointer text-right"
                                            >
                                                {employee.display_name}
                                            </button>
                                        )}
                                    </td>

                                    {/* Phone */}
                                    <td className="px-4 py-3 text-sm border-b border-border text-center">
                                        {editingField?.id === employee.id && editingField.field === 'phone' ? (
                                            <div className="flex items-center gap-1 justify-center">
                                                <input
                                                    type="text"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    className="w-28 px-2 py-1 text-sm border border-border rounded bg-muted/50 text-center"
                                                    autoFocus
                                                    dir="ltr"
                                                />
                                                <Button variant="outline-success" size="sm" onClick={saveEdit} disabled={updateUserProfile.isPending}>
                                                    <Save className="h-3 w-3" />
                                                </Button>
                                                <Button variant="outline-danger" size="sm" onClick={cancelEditing}>
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => startEditing(employee.id, 'phone', employee.phone || '')}
                                                className="text-primary hover:underline cursor-pointer"
                                                dir="ltr"
                                            >
                                                {employee.phone || 'غير محدد'}
                                            </button>
                                        )}
                                    </td>

                                    {/* Type Badge */}
                                    <td className="px-4 py-3 text-sm border-b border-border text-center">
                                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium border ${TYPE_STYLES[employee.type] || TYPE_STYLES.employee}`}>
                                            {TYPE_LABELS[employee.type] || employee.type}
                                        </span>
                                    </td>

                                    {/* Active Status */}
                                    <td className="px-4 py-3 text-sm border-b border-border text-center">
                                        {employee.is_active ? (
                                            <span className="inline-flex items-center gap-1 rounded-full border border-status-success-border bg-status-success-bg px-2.5 py-1 text-xs text-status-success-text">
                                                نشط
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 rounded-full border border-status-danger-border bg-status-danger-bg px-2.5 py-1 text-xs text-status-danger-text">
                                                غير نشط
                                            </span>
                                        )}
                                    </td>

                                    {/* Transaction Permission Toggle */}
                                    <td className="px-4 py-3 text-sm border-b border-border text-center">
                                        {employee.type === 'admin' || employee.type === 'employee_admin' ? (
                                            <span className="inline-flex items-center gap-1 rounded-full border border-status-success-border bg-status-success-bg px-2.5 py-1 text-xs text-status-success-text">
                                                <ArrowLeftRight className="h-3 w-3" />
                                                مسموح (مدير)
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => handleToggleTransactionPermission(employee)}
                                                disabled={updateUserProfile.isPending}
                                                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                                                    employee.can_make_transactions
                                                        ? 'border-status-success-border bg-status-success-bg text-status-success-text hover:bg-status-success-bg/80'
                                                        : 'border-status-danger-border bg-status-danger-bg text-status-danger-text hover:bg-status-danger-bg/80'
                                                }`}
                                            >
                                                <ArrowLeftRight className="h-3 w-3" />
                                                {employee.can_make_transactions ? 'مسموح' : 'غير مسموح'}
                                            </button>
                                        )}
                                    </td>

                                    {/* Actions */}
                                    <td className="px-4 py-3 text-sm border-b border-border">
                                        <div className="flex items-center justify-center gap-2">
                                            {/* Edit Button */}
                                            <Button
                                                variant="outline-secondary"
                                                size="sm"
                                                onClick={() => startEditing(employee.id, 'display_name', employee.display_name)}
                                                title="تعديل الاسم"
                                            >
                                                <Save className="h-4 w-4" />
                                            </Button>

                                            {/* Recovery Codes Button */}
                                            <Button
                                                variant="outline-primary"
                                                size="sm"
                                                onClick={() => handleOpenRecoveryCodes(employee)}
                                                title="رموز الاسترجاع"
                                            >
                                                <Key className="h-4 w-4" />
                                            </Button>

                                            {/* Admin Reset Password Button - only for manage_options */}
                                            {hasManageOptions && (
                                                <Button
                                                    variant="outline-danger"
                                                    size="sm"
                                                    onClick={() => setResetPasswordDialog({ employee, newPassword: '' })}
                                                    title="إعادة تعيين كلمة المرور"
                                                >
                                                    <RotateCcw className="h-4 w-4" />
                                                </Button>
                                            )}

                                            {/* Delete Button */}
                                            <Button
                                                variant="outline-danger"
                                                size="sm"
                                                onClick={() => handleDeleteClick(employee)}
                                                title="حذف الموظف"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Recovery Codes Modal */}
            {recoveryModalEmployee && (
                <RecoveryCodesModal
                    employee={recoveryModalEmployee}
                    isOpen={!!recoveryModalEmployee}
                    onClose={() => setRecoveryModalEmployee(null)}
                    isAdmin={hasManageOptions}
                />
            )}

            {/* Admin Reset Password Dialog */}
            {resetPasswordDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md mx-4" dir="rtl">
                        <h3 className="text-lg font-bold text-foreground mb-4">
                            إعادة تعيين كلمة المرور - {resetPasswordDialog.employee.display_name}
                        </h3>
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="block text-sm font-semibold text-foreground tracking-tight">
                                    كلمة المرور الجديدة *
                                </label>
                                <input
                                    type="password"
                                    value={resetPasswordDialog.newPassword}
                                    onChange={(e) => setResetPasswordDialog(prev => prev ? { ...prev, newPassword: e.target.value } : null)}
                                    className="base-input w-full"
                                    placeholder="أدخل كلمة المرور الجديدة"
                                    autoFocus
                                />
                            </div>
                            <p className="text-xs text-foreground/60">
                                سيتم إنشاء رموز استرجاع جديدة بعد إعادة تعيين كلمة المرور.
                            </p>
                            <div className="flex items-center justify-start gap-3 pt-4 border-t border-border">
                                <Button
                                    variant="primary"
                                    onClick={handleAdminResetPassword}
                                    isLoading={adminResetPassword.isPending}
                                    disabled={!resetPasswordDialog.newPassword}
                                >
                                    إعادة التعيين
                                </Button>
                                <Button
                                    variant="outline-info"
                                    onClick={() => setResetPasswordDialog(null)}
                                    disabled={adminResetPassword.isPending}
                                >
                                    إلغاء
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeAccountsManagement;
