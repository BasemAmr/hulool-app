import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, User, Lock } from 'lucide-react';
import { useToast } from '@/shared/hooks/useToast';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useUpdateMyProfile, useSetMyPassword } from '@/features/employees/api/userQueries';
import Button from '@/shared/ui/primitives/Button';

const EmployeeSettingsPage = () => {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);

    // Profile update state
    const [username, setUsername] = useState(user?.username || '');
    const [displayName, setDisplayName] = useState(user?.display_name || '');

    // Password change state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');

    const updateProfileMutation = useUpdateMyProfile();
    const setPasswordMutation = useSetMyPassword();

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();

        // Check if username is being changed
        const usernameChanged = username !== user?.username;

        try {
            await updateProfileMutation.mutateAsync({ username, display_name: displayName });

            if (usernameChanged) {
                // Username changed - must logout as the auth token is now invalid
                showToast({ type: 'success', title: 'تم تغيير اسم المستخدم بنجاح. يجب إعادة تسجيل الدخول.' });
                // Delay logout to show the success message
                setTimeout(() => {
                    logout();
                    window.location.href = '/login';
                }, 1500);
            } else {
                showToast({ type: 'success', title: 'تم تحديث الملف الشخصي بنجاح' });
            }
        } catch (error: any) {
            showToast({
                type: 'error',
                title: 'فشل التحديث',
                message: error.response?.data?.message || 'حدث خطأ أثناء تحديث الملف الشخصي'
            });
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');

        if (newPassword.length < 4) {
            setPasswordError('كلمة المرور يجب أن تكون 4 أحرف على الأقل');
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordError('كلمات المرور غير متطابقة');
            return;
        }

        try {
            await setPasswordMutation.mutateAsync({
                current_password: currentPassword,
                new_password: newPassword
            });

            showToast({ type: 'success', title: 'تم تغيير كلمة المرور بنجاح' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            showToast({
                type: 'error',
                title: 'فشل تغيير كلمة المرور',
                message: error.response?.data?.message || 'تحقق من كلمة المرور الحالية'
            });
        }
    };

    return (
        <div className="min-h-screen p-6">
            <div className="mb-6">
                <div className="flex items-center gap-3">
                    <Settings className="text-primary" size={28} />
                    <h1 className="text-3xl font-bold text-text-primary">إعدادات الموظف</h1>
                </div>
            </div>

            <div className="space-y-6">
                {/* Profile Settings */}
                <div className="rounded-lg border bg-card p-6">
                    <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
                        <User size={20} />
                        معلومات الملف الشخصي
                    </h2>

                    <form onSubmit={handleProfileUpdate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-1">
                                اسم المستخدم (للدخول)
                            </label>
                            <input
                                type="text"
                                className="base-input"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                disabled={updateProfileMutation.isPending}
                            />
                            <p className="text-xs text-text-secondary mt-1">
                                يستخدم لتسجيل الدخول إلى النظام
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-1">
                                الاسم المعروض
                            </label>
                            <input
                                type="text"
                                className="base-input"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                required
                                disabled={updateProfileMutation.isPending}
                            />
                            <p className="text-xs text-text-secondary mt-1">
                                يظهر في النظام والإشعارات
                            </p>
                        </div>

                        <Button
                            type="submit"
                            isLoading={updateProfileMutation.isPending}
                        >
                            حفظ التغييرات
                        </Button>
                    </form>
                </div>

                {/* Password Change */}
                <div className="rounded-lg border bg-card p-6">
                    <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
                        <Lock size={20} />
                        تغيير كلمة المرور
                    </h2>

                    <form onSubmit={handlePasswordChange} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-1">
                                كلمة المرور الحالية
                            </label>
                            <input
                                type="password"
                                className="base-input"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required
                                disabled={setPasswordMutation.isPending}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-1">
                                كلمة المرور الجديدة
                            </label>
                            <input
                                type="password"
                                className="base-input"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                disabled={setPasswordMutation.isPending}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-1">
                                تأكيد كلمة المرور الجديدة
                            </label>
                            <input
                                type="password"
                                className={`base-input ${passwordError ? 'border-status-danger-border' : ''}`}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                disabled={setPasswordMutation.isPending}
                            />
                            {passwordError && (
                                <p className="text-xs text-status-danger-text mt-1">{passwordError}</p>
                            )}
                        </div>

                        <Button
                            type="submit"
                            isLoading={setPasswordMutation.isPending}
                        >
                            تغيير كلمة المرور
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EmployeeSettingsPage;
