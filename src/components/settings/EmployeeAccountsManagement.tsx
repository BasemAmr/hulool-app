import { useState } from 'react';
import { Trash2, Save, X, Eye } from 'lucide-react';
import Button from '../ui/Button';
import {
    useEmployeesList,
    useCreateEmployee,
    useUpdateUserProfile,
    useDeleteEmployee,
    useCurrentUserCapabilities
} from '../../queries/userQueries';
import type { CreateEmployeeAccountRequest, EmployeeAccount } from '../../api/types';
import { useToast } from '@/hooks/useToast';
import { useModalStore } from '../../stores/modalStore';
import { useAuthStore } from '../../stores/authStore';

const EmployeeAccountsManagement = () => {
    // Track which employee ID AND which field is being edited
    const [editingField, setEditingField] = useState<{ id: number; field: 'username' | 'display_name' | 'email' } | null>(null);
    const [editValue, setEditValue] = useState('');

    const { success, error: showError } = useToast();
    const { data: capabilities } = useCurrentUserCapabilities();
    const { data: employees, isLoading, error: loadError } = useEmployeesList();
    const createEmployee = useCreateEmployee();
    const updateUserProfile = useUpdateUserProfile();
    const deleteEmployee = useDeleteEmployee();
    const { openModal, closeModal } = useModalStore();
    const { user: currentUser, logout } = useAuthStore();

    // Check permissions
    const hasPermission = capabilities?.tm_manage_users || capabilities?.manage_options;

    const handleCreateEmployee = async (data: CreateEmployeeAccountRequest) => {
        try {
            const credentials = await createEmployee.mutateAsync(data);
            closeModal(); // Close create modal
            // Open credentials modal
            openModal('employeeCredentials', { credentials });
            success('تم إنشاء الموظف بنجاح');
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || 'فشل في إنشاء الموظف';
            showError(errorMessage);

            // Check for specific errors
            if (errorMessage.toLowerCase().includes('username')) {
                showError('اسم المستخدم موجود بالفعل');
            } else if (errorMessage.toLowerCase().includes('email')) {
                showError('البريد الإلكتروني موجود بالفعل');
            }
        }
    };

    const startEditing = (id: number, field: 'username' | 'display_name' | 'email', currentValue: string) => {
        setEditingField({ id, field });
        setEditValue(currentValue);
    };

    const cancelEditing = () => {
        setEditingField(null);
        setEditValue('');
    };

    const saveEdit = async () => {
        if (!editingField) return;

        // Check if editing own username - will require re-login
        const isEditingOwnUsername = editingField.field === 'username' &&
            currentUser?.id === editingField.id;

        try {
            await updateUserProfile.mutateAsync({
                userId: editingField.id,
                [editingField.field]: editValue,
            });

            setEditingField(null);
            setEditValue('');

            if (isEditingOwnUsername) {
                // Username changed - must logout as the auth token is now invalid
                success('تم تغيير اسم المستخدم بنجاح. يجب إعادة تسجيل الدخول.');
                // Delay logout to show the success message
                setTimeout(() => {
                    logout();
                    window.location.href = '/login';
                }, 1500);
            } else {
                success('تم تحديث الموظف بنجاح');
            }
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || 'فشل في تحديث الموظف';
            showError(errorMessage);
        }
    };

    const handleDeleteClick = (employee: EmployeeAccount) => {
        // Open preview modal instead of direct delete confirmation
        openModal('employeeDeletionPreview', {
            employee,
            onConfirmDelete: async () => {
                await deleteEmployee.mutateAsync({ userId: employee.id });
                success('تم إلغاء تفعيل حساب الموظف بنجاح');
            },
        });
    };

    const handleViewCredentials = (employee: EmployeeAccount) => {
        openModal('employeeCredentials', {
            credentials: {
                id: employee.id,
                username: employee.username,
                display_name: employee.display_name,
                email: employee.email,
                password: '****************', // Hidden for security
                app_password: '****************' // Hidden for security
            }
        });
    };

    if (!hasPermission) {
        return (
            <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 font-semibold">
                    ليس لديك صلاحية لإدارة حسابات الموظفين.
                </p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-muted rounded w-1/3"></div>
                    <div className="h-64 bg-muted rounded"></div>
                </div>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 font-semibold mb-2">فشل في تحميل الموظفين</p>
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
                <div className="p-12 text-center bg-muted/30 rounded-lg border border-dashed border-border">
                    <p className="text-foreground/60 text-lg mb-4">لا يوجد موظفين. قم بإنشاء أول موظف.</p>
                    <Button
                        variant="primary"
                        onClick={() => openModal('createEmployee', {
                            onSubmit: handleCreateEmployee,
                            isLoading: createEmployee.isPending,
                        })}
                    >
                        إنشاء موظف جديد
                    </Button>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead className="bg-gray-100 sticky top-0">
                            <tr>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-foreground border-b border-border">
                                    اسم المستخدم
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-foreground border-b border-border">
                                    الاسم المعروض
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-foreground border-b border-border">
                                    البريد الإلكتروني
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-foreground border-b border-border">
                                    نسبة العمولة
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-foreground border-b border-border">
                                    تاريخ الإنشاء
                                </th>
                                <th className="px-4 py-3 text-center text-sm font-semibold text-foreground border-b border-border">
                                    الإجراءات
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map((employee) => (
                                <tr key={employee.id} className="hover:bg-gray-50 transition-colors">
                                    {/* Username - Editable */}
                                    <td className="px-4 py-3 text-sm border-b border-border">
                                        {editingField?.id === employee.id && editingField?.field === 'username' ? (
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
                                                onClick={() => startEditing(employee.id, 'username', employee.username)}
                                                className="text-primary hover:underline cursor-pointer text-right"
                                            >
                                                {employee.username}
                                            </button>
                                        )}
                                    </td>

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

                                    {/* Email - Editable */}
                                    <td className="px-4 py-3 text-sm border-b border-border">
                                        {editingField?.id === employee.id && editingField?.field === 'email' ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="email"
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
                                                onClick={() => startEditing(employee.id, 'email', employee.email)}
                                                className="text-primary hover:underline cursor-pointer text-right w-full"
                                            >
                                                {employee.email}
                                            </button>
                                        )}
                                    </td>

                                    {/* Commission Rate */}
                                    <td className="px-4 py-3 text-sm text-foreground/70 border-b border-border text-right">
                                        {employee.commission_rate ? `${employee.commission_rate}%` : 'غير محدد'}
                                    </td>

                                    {/* Created Date */}
                                    <td className="px-4 py-3 text-sm text-foreground/70 border-b border-border text-right">
                                        {employee.created_at ? new Date(employee.created_at).toLocaleDateString('ar-SA') : 'غير محدد'}
                                    </td>

                                    {/* Actions */}
                                    <td className="px-4 py-3 text-sm border-b border-border">
                                        <div className="flex items-center justify-center gap-2">
                                            <Button
                                                variant="outline-secondary"
                                                size="sm"
                                                onClick={() => handleViewCredentials(employee)}
                                                title="عرض بيانات الموظف"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>

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
        </div>
    );
};

export default EmployeeAccountsManagement;
