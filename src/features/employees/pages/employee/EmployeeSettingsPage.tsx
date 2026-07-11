import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, User, Lock, ShieldCheck, KeyRound } from 'lucide-react';
import { useToast } from '@/shared/hooks/useToast';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useUpdateMyProfile, useSetMyPassword, useSetupPin } from '@/features/employees/api/userQueries';
import Button from '@/shared/ui/primitives/Button';
import PinSetupForm from '@/features/employees/components/PinSetupForm';
import RecoveryCodesModal from '@/features/employees/modals/RecoveryCodesModal';
import type { EmployeeAccount } from '@/api/types';

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

    // PIN change state
    const [showPinForm, setShowPinForm] = useState(false);
    const [currentPin, setCurrentPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [pinError, setPinError] = useState('');

    // Recovery codes modal state
    const [showRecoveryModal, setShowRecoveryModal] = useState(false);

    const updateProfileMutation = useUpdateMyProfile();
    const setPasswordMutation = useSetMyPassword();
    const setupPinMutation = useSetupPin();

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

    const handlePinChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setPinError('');

        if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
            setPinError('رمز PIN يجب أن يكون 4 أرقام');
            return;
        }

        if (newPin !== confirmPin) {
            setPinError('رمز PIN غير متطابق');
            return;
        }

        try {
            await setupPinMutation.mutateAsync({
                pin: newPin,
                ...(user?.pin_set && currentPin ? { current_pin: currentPin } : {}),
            });

            showToast({ type: 'success', title: 'تم تحديث رمز PIN بنجاح' });
            setShowPinForm(false);
            setCurrentPin('');
            setNewPin('');
            setConfirmPin('');
        } catch (error: any) {
            showToast({
                type: 'error',
                title: 'فشل تحديث رمز PIN',
                message: error.response?.data?.message || 'تحقق من رمز PIN الحالي'
            });
        }
    };

    // Build a minimal EmployeeAccount for the modal (only needs display_name and phone)
    const employeeForModal: EmployeeAccount = {
        id: user?.id || 0,
        user_id: user?.id || 0,
        display_name: user?.display_name || '',
        phone: user?.phone || '',
        type: 'employee',
        is_active: true,
        employee_id: user?.employee_id || null,
        commission_rate: user?.commission_rate || null,
        created_at: null,
        pin_set: user?.pin_set,
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

                {/* PIN Settings */}
                <div className="rounded-lg border bg-card p-6">
                    <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
                        <ShieldCheck size={20} />
                        رمز PIN
                    </h2>

                    {!showPinForm ? (
                        <div className="space-y-3">
                            <p className="text-sm text-text-secondary">
                                {user?.pin_set
                                    ? 'تم إعداد رمز PIN. يمكنك تغييره من هنا.'
                                    : 'لم يتم إعداد رمز PIN بعد. يُنصح بإعداده لحماية حسابك.'}
                            </p>
                            <Button
                                variant="outline-primary"
                                onClick={() => setShowPinForm(true)}
                            >
                                <ShieldCheck className="h-4 w-4" />
                                {user?.pin_set ? 'تغيير رمز PIN' : 'إعداد رمز PIN'}
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handlePinChange} className="space-y-4">
                            {user?.pin_set && (
                                <PinSetupForm
                                    label="رمز PIN الحالي"
                                    value={currentPin}
                                    onChange={setCurrentPin}
                                    disabled={setupPinMutation.isPending}
                                />
                            )}

                            <PinSetupForm
                                label={user?.pin_set ? 'رمز PIN الجديد' : 'رمز PIN'}
                                value={newPin}
                                onChange={setNewPin}
                                disabled={setupPinMutation.isPending}
                            />

                            <PinSetupForm
                                label="تأكيد رمز PIN"
                                value={confirmPin}
                                onChange={setConfirmPin}
                                error={pinError}
                                disabled={setupPinMutation.isPending}
                            />

                            <div className="flex gap-2">
                                <Button
                                    type="submit"
                                    isLoading={setupPinMutation.isPending}
                                >
                                    حفظ رمز PIN
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline-info"
                                    onClick={() => {
                                        setShowPinForm(false);
                                        setCurrentPin('');
                                        setNewPin('');
                                        setConfirmPin('');
                                        setPinError('');
                                    }}
                                    disabled={setupPinMutation.isPending}
                                >
                                    إلغاء
                                </Button>
                            </div>
                        </form>
                    )}
                </div>

                {/* Recovery Codes Section */}
                <div className="rounded-lg border bg-card p-6">
                    <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
                        <KeyRound size={20} />
                        رموز الاسترجاع
                    </h2>

                    <p className="text-sm text-text-secondary mb-4">
                        رموز الاسترجاع تُستخدم لإعادة تعيين كلمة المرور في حال نسيانها.
                        احتفظ بها في مكان آمن.
                    </p>

                    <div className="flex gap-2">
                        <Button
                            variant="outline-primary"
                            onClick={() => setShowRecoveryModal(true)}
                        >
                            <KeyRound className="h-4 w-4" />
                            عرض رموز الاسترجاع
                        </Button>
                    </div>
                </div>
            </div>

            {/* Recovery Codes Modal */}
            {showRecoveryModal && user && (
                <RecoveryCodesModal
                    employee={employeeForModal}
                    isOpen={showRecoveryModal}
                    onClose={() => setShowRecoveryModal(false)}
                    isAdmin={false}
                />
            )}
        </div>
    );
};

export default EmployeeSettingsPage;
