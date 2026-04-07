import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/features/auth/store/authStore';
import { loginWithShortPassword } from '@/features/auth/api/authQueries';
import { useRequestPasswordReset, useConfirmPasswordReset } from '@/features/employees/api/userQueries';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Password reset state
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [resetStep, setResetStep] = useState<'request' | 'confirm'>('request');
  const [showResetForm, setShowResetForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  const navigate = useNavigate();
  const { t } = useTranslation();
  const loginAction = useAuthStore((state) => state.login);
  const status = useAuthStore((state) => state.status);
  const requestResetMutation = useRequestPasswordReset();
  const confirmResetMutation = useConfirmPasswordReset();

  // Redirect if already authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      navigate('/dashboard', { replace: true });
    }
  }, [status, navigate]);

  // Check URL for reset token on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('reset_token');
    if (token) {
      setResetToken(token);
      setResetStep('confirm');
      setShowResetForm(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Validate that password looks like a short password (not an app password)
      // if (password.includes(' ') && password.length > 20) {
      //   setError('Please enter your short password, not the WordPress application password.');
      //   setIsLoading(false);
      //   return;
      // }

      // Step 1: Call the new custom login endpoint
      const { app_password, user } = await loginWithShortPassword(username, password);

      // Step 2: Use the returned app_password and user data to log in
      loginAction(username, app_password, user);

      navigate('/dashboard');

    } catch (err: any) {
      // Provide more specific error messages
      if (err.response?.data?.code === 'invalid_credentials') {
        setError('Invalid username/email or password.');
      } else {
        setError(t('login.errorInvalid'));
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);

    if (!username) {
      setResetError('الرجاء إدخال اسم المستخدم أو البريد الإلكتروني');
      return;
    }

    try {
      await requestResetMutation.mutateAsync({ username });
      setResetSuccess(true);
      setResetError(null);
    } catch (err: any) {
      setResetError(err.response?.data?.message || 'فشل إرسال البريد الإلكتروني');
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);

    if (newPassword.length < 4) {
      setResetError('كلمة المرور يجب أن تكون 4 أحرف على الأقل');
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetError('كلمات المرور غير متطابقة');
      return;
    }

    try {
      await confirmResetMutation.mutateAsync({
        token: resetToken!,
        new_password: newPassword
      });

      setResetSuccess(true);
      setResetError(null);

      // Clear form and redirect after 2 seconds
      setTimeout(() => {
        setShowResetForm(false);
        setResetToken(null);
        setNewPassword('');
        setConfirmPassword('');
        window.history.replaceState({}, '', '/login');
      }, 2000);
    } catch (err: any) {
      setResetError(err.response?.data?.message || 'رابط غير صالح أو منتهي الصلاحية');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-secondary">
      <div className="w-11/12 sm:w-2/3 md:w-1/2 lg:w-1/3">
        <div className="bg-card rounded-xl shadow-2xl">
          <div className="p-6 lg:p-10">
            <div className="text-center mb-6">
              <h2 className="text-primary text-3xl font-bold tracking-wide">HULOOL</h2>
              <h5 className="font-medium text-text-secondary mt-2">{t('login.title')}</h5>
            </div>

            <form onSubmit={handleLogin}>
              {error && <div className="rounded-lg border border-destructive bg-destructive/10 p-2 mb-4 text-center text-sm text-destructive">{error}</div>}

              <div className="mb-4">
                <label htmlFor="username" className="block text-sm font-semibold text-foreground mb-1.5">{t('login.usernameLabel')}</label>
                <input
                  type="text"
                  id="username"
                  className="base-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="username"
                  placeholder="Username or email"
                />
              </div>

              <div className="mb-6">
                <label htmlFor="password" className="block text-sm font-semibold text-foreground mb-1.5">{t('login.passwordLabel')}</label>
                <input
                  type="password"
                  id="password"
                  className="base-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                />
                <small className="text-text-secondary text-xs mt-1 block">Use your short password OR WordPress password</small>
              </div>

              <div className="grid">
                <button type="submit" className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold text-base hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={isLoading}>
                  {isLoading ? t('login.authenticatingText') : t('login.buttonText')}
                </button>
              </div>
            </form>

            {/* Compact Password Reset Section */}
            <div className="mt-4">
              <button
                type="button"
                className="text-primary hover:text-primary/80 text-sm no-underline w-full p-0 bg-transparent border-0 cursor-pointer"
                onClick={() => setShowResetForm(!showResetForm)}
              >
                {showResetForm ? 'Cancel Password Reset' : 'Change Password?'}
              </button>

              {showResetForm && (
                <div className="mt-4 p-4 border border-border rounded-lg bg-secondary/50">
                  {resetStep === 'request' ? (
                    // REQUEST STEP: Send email
                    <>
                      <h6 className="mb-2 text-sm font-semibold">إعادة تعيين كلمة المرور</h6>
                      <p className="text-text-secondary text-xs mb-3">
                        أدخل اسم المستخدم أو البريد الإلكتروني وسنرسل لك رابط إعادة التعيين
                      </p>

                      {resetSuccess && (
                        <div className="rounded-lg border border-status-success-border bg-status-success-bg p-2 mb-2 text-xs text-status-success-text">
                          تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني
                        </div>
                      )}

                      {resetError && (
                        <div className="rounded-lg border border-destructive bg-destructive/10 p-2 mb-2 text-xs text-destructive">
                          {resetError}
                        </div>
                      )}

                      <form onSubmit={handleRequestReset}>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold w-full hover:bg-primary/90 transition-colors disabled:opacity-50"
                          disabled={requestResetMutation.isPending}
                        >
                          {requestResetMutation.isPending ? 'جاري الإرسال...' : 'إرسال رابط إعادة التعيين'}
                        </button>
                      </form>
                    </>
                  ) : (
                    // CONFIRM STEP: Set new password with token
                    <>
                      <h6 className="mb-2 text-sm font-semibold">تعيين كلمة مرور جديدة</h6>

                      {resetSuccess && (
                        <div className="rounded-lg border border-status-success-border bg-status-success-bg p-2 mb-2 text-xs text-status-success-text">
                          تم تغيير كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول
                        </div>
                      )}

                      {resetError && (
                        <div className="rounded-lg border border-destructive bg-destructive/10 p-2 mb-2 text-xs text-destructive">
                          {resetError}
                        </div>
                      )}

                      <form onSubmit={handleConfirmReset}>
                        <div className="mb-2">
                          <input
                            type="password"
                            className="base-input text-sm py-1.5"
                            placeholder="كلمة المرور الجديدة (4 أحرف على الأقل)"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            disabled={confirmResetMutation.isPending}
                          />
                        </div>
                        <div className="mb-2">
                          <input
                            type="password"
                            className="base-input text-sm py-1.5"
                            placeholder="تأكيد كلمة المرور"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={confirmResetMutation.isPending}
                          />
                        </div>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-action-primary text-primary-foreground rounded-lg text-sm font-semibold w-full hover:bg-primary/90 transition-colors disabled:opacity-50"
                          disabled={confirmResetMutation.isPending}
                        >
                          {confirmResetMutation.isPending ? 'جاري التحديث...' : 'تعيين كلمة المرور'}
                        </button>
                      </form>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;