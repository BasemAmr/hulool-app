import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useSetupPin } from '@/features/employees/api/userQueries';
import Logo from '@/shared/ui/primitives/Logo';
import Button from '@/shared/ui/primitives/Button';
import PinSetupForm from '@/features/employees/components/PinSetupForm';
import { ShieldCheck } from 'lucide-react';

const EmployeeOnboardingPage = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const loginAction = useAuthStore((state) => state.login);
  const setupPinMutation = useSetupPin();

  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // If user doesn't need PIN setup, redirect to dashboard
  const needsPin = !user?.pin_set;
  if (!needsPin && user) {
    navigate('/employee/dashboard', { replace: true });
    return null;
  }

  // If not authenticated, redirect to login
  if (!user) {
    navigate('/login', { replace: true });
    return null;
  }

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (pin.length !== 4) {
      setError('رمز PIN يجب أن يكون 4 أرقام');
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      setError('رمز PIN يجب أن يحتوي على أرقام فقط');
      return;
    }

    if (pin !== confirmPin) {
      setError('رمز PIN غير متطابق');
      return;
    }

    try {
      await setupPinMutation.mutateAsync({ pin });
      setIsSuccess(true);

      // Update local user state to reflect pin_set = true
      if (user) {
        loginAction(
          user.username,
          useAuthStore.getState().token ? atob(useAuthStore.getState().token!) : '',
          { ...user, pin_set: true }
        );
      }

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate('/employee/dashboard', { replace: true });
      }, 1500);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'حدث خطأ أثناء إعداد رمز PIN';
      setError(typeof msg === 'string' ? msg : 'حدث خطأ غير متوقع');
    }
  }, [pin, confirmPin, user, setupPinMutation, loginAction, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-secondary">
      <div className="w-11/12 sm:w-2/3 md:w-1/2 lg:w-1/3">
        <div className="bg-card rounded-xl shadow-2xl">
          <div className="p-6 lg:p-10">
            {/* Logo and Header */}
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <Logo />
              </div>
              <div className="flex justify-center mb-3">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <ShieldCheck className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-text-primary">مرحباً بك {user.display_name}!</h2>
              <h5 className="font-medium text-text-secondary mt-2">
                الرجاء إعداد رمز PIN
              </h5>
              <p className="text-xs text-text-secondary mt-1">
                سيُستخدم رمز PIN مع رموز الاسترجاع لإعادة تعيين كلمة المرور
              </p>
            </div>

            {/* Success Message */}
            {isSuccess ? (
              <div className="text-center p-6">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-status-success-bg flex items-center justify-center">
                    <ShieldCheck className="h-8 w-8 text-status-success-text" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-text-primary mb-2">تم إعداد رمز PIN بنجاح!</h3>
                <p className="text-sm text-text-secondary">
                  جاري التحويل إلى لوحة التحكم...
                </p>
              </div>
            ) : (
              /* PIN Setup Form */
              <form onSubmit={handleSubmit}>
                {error && (
                  <div className="rounded-lg border border-status-danger-border bg-status-danger-bg p-2 mb-4 text-center text-sm text-status-danger-text">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  <PinSetupForm
                    label="رمز PIN"
                    value={pin}
                    onChange={setPin}
                    disabled={setupPinMutation.isPending}
                  />

                  <PinSetupForm
                    label="تأكيد رمز PIN"
                    value={confirmPin}
                    onChange={setConfirmPin}
                    disabled={setupPinMutation.isPending}
                  />
                </div>

                <div className="mt-6">
                  <Button
                    type="submit"
                    className="w-full"
                    isLoading={setupPinMutation.isPending}
                    disabled={setupPinMutation.isPending}
                  >
                    تأكيد
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeOnboardingPage;
