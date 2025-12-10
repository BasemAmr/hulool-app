import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { loginWithShortPassword } from '../queries/authQueries';
import { useResetPasswordForgot } from '../queries/userQueries';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Password reset state
  const [showResetForm, setShowResetForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  const navigate = useNavigate();
  const { t } = useTranslation();
  const loginAction = useAuthStore((state) => state.login);
  const status = useAuthStore((state) => state.status);
  const resetPasswordMutation = useResetPasswordForgot();

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

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetSuccess(false);

    // Validate
    if (newPassword.length < 4) {
      setResetError('Password must be at least 4 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match.');
      return;
    }
    if (!username) {
      setResetError('Please enter your username.');
      return;
    }

    try {
      // Call forgot password endpoint (no authentication required)
      await resetPasswordMutation.mutateAsync({ username, new_password: newPassword });
      
      setResetSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      
      // Auto-hide success message and form after 3 seconds
      setTimeout(() => {
        setShowResetForm(false);
        setResetSuccess(false);
      }, 3000);

    } catch (err: any) {
      setResetError(err.response?.data?.message || 'Failed to reset password. Please verify your username.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-secondary">
      <div className="w-11/12 sm:w-2/3 md:w-1/2 lg:w-1/3">
        <div className="bg-card rounded-xl shadow-2xl">
          <div className="p-6 lg:p-10">
            <div className="text-center mb-6">
              <h2 className="text-primary text-3xl font-bold tracking-wide">HULOOL</h2>
              <h5 className="font-normal text-muted-foreground mt-2">{t('login.title')}</h5>
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
                <small className="text-muted-foreground text-xs mt-1 block">Use your short password OR WordPress password</small>
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
                  <h6 className="mb-2 text-sm font-semibold">Reset Your Password</h6>
                  <p className="text-muted-foreground text-xs mb-3">
                    Enter your username or email above, then set a new password below.
                  </p>
                  
                  {resetSuccess && (
                    <div className="rounded-lg border border-green-600 bg-green-50 p-2 mb-2 text-xs text-green-700">
                      Password updated successfully!
                    </div>
                  )}
                  
                  {resetError && (
                    <div className="rounded-lg border border-destructive bg-destructive/10 p-2 mb-2 text-xs text-destructive">
                      {resetError}
                    </div>
                  )}
                  
                  <form onSubmit={handlePasswordReset}>
                    <div className="mb-2">
                      <input
                        type="password"
                        className="base-input text-sm py-1.5"
                        placeholder="New Password (min 4 chars)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={resetPasswordMutation.isPending}
                      />
                    </div>
                    <div className="mb-2">
                      <input
                        type="password"
                        className="base-input text-sm py-1.5"
                        placeholder="Confirm New Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={resetPasswordMutation.isPending}
                      />
                    </div>
                    <button 
                      type="submit" 
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold w-full hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={resetPasswordMutation.isPending}
                    >
                      {resetPasswordMutation.isPending ? 'Updating...' : 'Update Password'}
                    </button>
                  </form>
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