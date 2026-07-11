import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Phone, KeyRound, Lock, ShieldCheck, Check } from 'lucide-react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { loginWithShortPassword } from '@/features/auth/api/authQueries';
import { useVerifyPhone, useRecoverPassword } from '@/features/employees/api/userQueries';
import PinSetupForm from '@/features/employees/components/PinSetupForm';

type RecoveryStep = 'phone' | 'recovery-code' | 'new-password' | 'pin' | 'success';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Forgot password recovery state
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<RecoveryStep>('phone');
  const [recoveryPhone, setRecoveryPhone] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryPin, setRecoveryPin] = useState('');
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [verifiedEmployeeName, setVerifiedEmployeeName] = useState('');

  const navigate = useNavigate();
  const { t } = useTranslation();
  const loginAction = useAuthStore((state) => state.login);
  const status = useAuthStore((state) => state.status);

  const verifyPhoneMutation = useVerifyPhone();
  const recoverPasswordMutation = useRecoverPassword();

  // Redirect if already authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      navigate('/dashboard', { replace: true });
    }
  }, [status, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { app_password, user } = await loginWithShortPassword(username, password);
      loginAction(user.username, app_password, user);
      navigate('/dashboard');
    } catch (err: any) {
      if (err.response?.data?.code === 'invalid_credentials') {
        setError('اسم المستخدم أو كلمة المرور غير صحيحة');
      } else {
        setError(t('login.errorInvalid'));
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Recovery: Step 1 - Verify phone number
  const handleVerifyPhone = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);

    if (!recoveryPhone.trim()) {
      setRecoveryError('الرجاء إدخال رقم الجوال');
      return;
    }

    try {
      const result = await verifyPhoneMutation.mutateAsync({ phone: recoveryPhone });
      setVerifiedEmployeeName(result.data?.employee_name || '');
      setRecoveryStep('recovery-code');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setRecoveryError(typeof msg === 'string' ? msg : 'رقم الجوال غير مسجل في النظام');
    }
  }, [recoveryPhone, verifyPhoneMutation]);

  // Recovery: Step 2 - Enter recovery code (just advance, validation happens on submit)
  const handleRecoveryCodeNext = useCallback(() => {
    setRecoveryError(null);
    if (!recoveryCode.trim()) {
      setRecoveryError('الرجاء إدخال رمز الاسترجاع');
      return;
    }
    if (!/^[A-Z0-9]{4}-\d{4}$/.test(recoveryCode.trim())) {
      setRecoveryError('صيغة الرمز غير صحيحة (مثال: ABCD-1234)');
      return;
    }
    setRecoveryStep('new-password');
  }, [recoveryCode]);

  // Recovery: Step 3 - Enter new password
  const handleNewPasswordNext = useCallback(() => {
    setRecoveryError(null);
    if (newPassword.length < 4) {
      setRecoveryError('كلمة المرور يجب أن تكون 4 أحرف على الأقل');
      return;
    }
    if (newPassword !== confirmPassword) {
      setRecoveryError('كلمات المرور غير متطابقة');
      return;
    }
    setRecoveryStep('pin');
  }, [newPassword, confirmPassword]);

  // Recovery: Step 4 - Enter PIN and submit
  const handleRecoverySubmit = useCallback(async () => {
    setRecoveryError(null);
    if (recoveryPin.length !== 4 || !/^\d{4}$/.test(recoveryPin)) {
      setRecoveryError('رمز PIN يجب أن يكون 4 أرقام');
      return;
    }

    try {
      await recoverPasswordMutation.mutateAsync({
        phone: recoveryPhone,
        recovery_code: recoveryCode.trim(),
        new_password: newPassword,
        pin: recoveryPin,
      });
      setRecoveryStep('success');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setRecoveryError(typeof msg === 'string' ? msg : 'فشلت عملية إعادة التعيين. تحقق من البيانات المدخلة');
    }
  }, [recoveryPhone, recoveryCode, newPassword, recoveryPin, recoverPasswordMutation]);

  const handleBackToLogin = () => {
    setShowRecovery(false);
    setRecoveryStep('phone');
    setRecoveryPhone('');
    setRecoveryCode('');
    setNewPassword('');
    setConfirmPassword('');
    setRecoveryPin('');
    setRecoveryError(null);
    setVerifiedEmployeeName('');
  };

  const handleBackOneStep = () => {
    setRecoveryError(null);
    switch (recoveryStep) {
      case 'recovery-code':
        setRecoveryStep('phone');
        break;
      case 'new-password':
        setRecoveryStep('recovery-code');
        break;
      case 'pin':
        setRecoveryStep('new-password');
        break;
    }
  };

  const stepLabels = ['الجوال', 'الرمز', 'كلمة المرور', 'PIN'];
  const stepIcons = [Phone, KeyRound, Lock, ShieldCheck];

  return (
    <div className="flex items-center justify-center min-h-screen bg-secondary">
      <div className="w-11/12 sm:w-2/3 md:w-1/2 lg:w-1/3">
        <div className="bg-card rounded-xl shadow-2xl">
          <div className="p-6 lg:p-10">
            {!showRecovery ? (
              <>
                {/* LOGIN FORM */}
                <div className="text-center mb-6">
                  <h2 className="text-primary text-3xl font-bold tracking-wide">HULOOL</h2>
                  <h5 className="font-medium text-text-secondary mt-2">{t('login.title')}</h5>
                </div>

                <form onSubmit={handleLogin}>
                  {error && <div className="rounded-lg border border-status-danger-border bg-status-danger-bg p-2 mb-4 text-center text-sm text-status-danger-text">{error}</div>}

                  <div className="mb-4">
                    <label htmlFor="username" className="block text-sm font-semibold text-text-primary mb-1.5">{t('login.usernameLabel')}</label>
                    <input
                      type="text"
                      id="username"
                      className="base-input"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      disabled={isLoading}
                      autoComplete="username"
                      placeholder="اسم المستخدم أو رقم الجوال"
                    />
                  </div>

                  <div className="mb-4">
                    <label htmlFor="password" className="block text-sm font-semibold text-text-primary mb-1.5">{t('login.passwordLabel')}</label>
                    <input
                      type="password"
                      id="password"
                      className="base-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      autoComplete="current-password"
                      placeholder="أدخل كلمة المرور"
                    />
                  </div>

                  <div className="grid">
                    <button type="submit" className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold text-base hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={isLoading}>
                      {isLoading ? t('login.authenticatingText') : t('login.buttonText')}
                    </button>
                  </div>
                </form>

                {/* Forgot Password Link */}
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    className="text-primary hover:text-primary/80 text-sm bg-transparent border-0 cursor-pointer p-0"
                    onClick={() => setShowRecovery(true)}
                  >
                    نسيت كلمة المرور؟
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* RECOVERY FLOW */}
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-text-primary">إعادة تعيين كلمة المرور</h2>
                  {verifiedEmployeeName && recoveryStep !== 'phone' && (
                    <p className="text-sm text-text-secondary mt-1">{verifiedEmployeeName}</p>
                  )}
                </div>

                {/* Step Indicator */}
                {recoveryStep !== 'success' && (
                  <div className="flex items-center justify-center gap-1 mb-6">
                    {stepLabels.map((label, idx) => {
                      const Icon = stepIcons[idx];
                      const stepKeys: RecoveryStep[] = ['phone', 'recovery-code', 'new-password', 'pin'];
                      const currentIdx = stepKeys.indexOf(recoveryStep);
                      const isCompleted = idx < currentIdx;
                      const isCurrent = idx === currentIdx;

                      return (
                        <div key={label} className="flex items-center">
                          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                            isCompleted ? 'bg-status-success-bg text-status-success-text' :
                            isCurrent ? 'bg-primary/10 text-primary' :
                            'bg-muted/50 text-text-secondary'
                          }`}>
                            {isCompleted ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                            <span className="hidden sm:inline">{label}</span>
                          </div>
                          {idx < 3 && (
                            <div className={`w-4 h-px mx-0.5 ${idx < currentIdx ? 'bg-status-success-text' : 'bg-border'}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {recoveryError && (
                  <div className="rounded-lg border border-status-danger-border bg-status-danger-bg p-2 mb-4 text-center text-sm text-status-danger-text">
                    {recoveryError}
                  </div>
                )}

                {/* Step: Phone */}
                {recoveryStep === 'phone' && (
                  <form onSubmit={handleVerifyPhone}>
                    <p className="text-text-secondary text-xs mb-3">
                      أدخل رقم الجوال المسجل في النظام للتحقق من هويتك
                    </p>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-text-primary mb-1.5">رقم الجوال</label>
                      <input
                        type="tel"
                        className="base-input"
                        value={recoveryPhone}
                        onChange={(e) => setRecoveryPhone(e.target.value)}
                        placeholder="05XXXXXXXX"
                        dir="ltr"
                        disabled={verifyPhoneMutation.isPending}
                        autoComplete="tel"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold w-full hover:bg-primary/90 transition-colors disabled:opacity-50"
                      disabled={verifyPhoneMutation.isPending}
                    >
                      {verifyPhoneMutation.isPending ? 'جاري التحقق...' : 'تحقق'}
                    </button>
                  </form>
                )}

                {/* Step: Recovery Code */}
                {recoveryStep === 'recovery-code' && (
                  <div>
                    <p className="text-text-secondary text-xs mb-3">
                      أدخل أحد رموز الاسترجاع (مثال: ABCD-1234)
                    </p>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-text-primary mb-1.5">رمز الاسترجاع</label>
                      <input
                        type="text"
                        className="base-input font-mono"
                        value={recoveryCode}
                        onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                        placeholder="ABCD-1234"
                        dir="ltr"
                        maxLength={9}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="px-4 py-2.5 bg-secondary text-secondary-foreground border border-border rounded-lg text-sm font-semibold hover:bg-secondary/80 transition-colors"
                        onClick={handleBackOneStep}
                      >
                        <ArrowRight className="h-4 w-4 inline" /> رجوع
                      </button>
                      <button
                        type="button"
                        className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                        onClick={handleRecoveryCodeNext}
                      >
                        التالي
                      </button>
                    </div>
                  </div>
                )}

                {/* Step: New Password */}
                {recoveryStep === 'new-password' && (
                  <div>
                    <p className="text-text-secondary text-xs mb-3">
                      أدخل كلمة المرور الجديدة
                    </p>
                    <div className="space-y-3 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1.5">كلمة المرور الجديدة</label>
                        <input
                          type="password"
                          className="base-input"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="4 أحرف على الأقل"
                          autoComplete="new-password"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1.5">تأكيد كلمة المرور</label>
                        <input
                          type="password"
                          className="base-input"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="أعد إدخال كلمة المرور"
                          autoComplete="new-password"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="px-4 py-2.5 bg-secondary text-secondary-foreground border border-border rounded-lg text-sm font-semibold hover:bg-secondary/80 transition-colors"
                        onClick={handleBackOneStep}
                      >
                        <ArrowRight className="h-4 w-4 inline" /> رجوع
                      </button>
                      <button
                        type="button"
                        className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                        onClick={handleNewPasswordNext}
                      >
                        التالي
                      </button>
                    </div>
                  </div>
                )}

                {/* Step: PIN */}
                {recoveryStep === 'pin' && (
                  <div>
                    <p className="text-text-secondary text-xs mb-3">
                      أدخل رمز PIN للتأكيد
                    </p>
                    <div className="mb-4">
                      <PinSetupForm
                        label="رمز PIN"
                        value={recoveryPin}
                        onChange={setRecoveryPin}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="px-4 py-2.5 bg-secondary text-secondary-foreground border border-border rounded-lg text-sm font-semibold hover:bg-secondary/80 transition-colors"
                        onClick={handleBackOneStep}
                      >
                        <ArrowRight className="h-4 w-4 inline" /> رجوع
                      </button>
                      <button
                        type="button"
                        className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                        onClick={handleRecoverySubmit}
                        disabled={recoverPasswordMutation.isPending}
                      >
                        {recoverPasswordMutation.isPending ? 'جاري التحديث...' : 'إعادة تعيين كلمة المرور'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Step: Success */}
                {recoveryStep === 'success' && (
                  <div className="text-center py-4">
                    <div className="flex justify-center mb-4">
                      <div className="w-16 h-16 rounded-full bg-status-success-bg flex items-center justify-center">
                        <Check className="h-8 w-8 text-status-success-text" />
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-text-primary mb-2">
                      تم إعادة تعيين كلمة المرور بنجاح!
                    </h3>
                    <p className="text-sm text-text-secondary mb-4">
                      يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة
                    </p>
                    <button
                      type="button"
                      className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
                      onClick={handleBackToLogin}
                    >
                      العودة لتسجيل الدخول
                    </button>
                  </div>
                )}

                {/* Back to Login */}
                {recoveryStep !== 'success' && (
                  <div className="mt-4 text-center">
                    <button
                      type="button"
                      className="text-text-secondary hover:text-text-primary text-xs bg-transparent border-0 cursor-pointer p-0"
                      onClick={handleBackToLogin}
                    >
                      العودة لتسجيل الدخول
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
