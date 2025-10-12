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
    <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
      <div className="col-11 col-sm-8 col-md-6 col-lg-4">
        <div className="card shadow-hulool">
          <div className="card-body p-4 p-lg-5">
            <div className="text-center mb-4">
              <h2 className="text-gold" style={{ letterSpacing: '1px' }}>HULOOL</h2>
              <h5 className="fw-normal text-gray-600">{t('login.title')}</h5>
            </div>

            <form onSubmit={handleLogin}>
              {error && <div className="alert alert-danger p-2 mb-3 text-center">{error}</div>}
              
              <div className="mb-3">
                <label htmlFor="username" className="form-label">{t('login.usernameLabel')}</label>
                <input
                  type="text"
                  id="username"
                  className="form-control"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="username"
                  placeholder="Username or email"
                />
              </div>

              <div className="mb-4">
                <label htmlFor="password" className="form-label">{t('login.passwordLabel')}</label>
                <input
                  type="password"
                  id="password"
                  className="form-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                />
                <small className="text-muted">Use your short password OR WordPress password</small>
              </div>

              <div className="d-grid">
                <button type="submit" className="btn btn-primary btn-lg" disabled={isLoading}>
                  {isLoading ? t('login.authenticatingText') : t('login.buttonText')}
                </button>
              </div>
            </form>

            {/* Compact Password Reset Section */}
            <div className="mt-3">
              <button 
                type="button"
                className="btn btn-link btn-sm text-decoration-none w-100 p-0"
                onClick={() => setShowResetForm(!showResetForm)}
              >
                {showResetForm ? 'Cancel Password Reset' : 'Change Password?'}
              </button>

              {showResetForm && (
                <div className="mt-3 p-3 border rounded bg-light">
                  <h6 className="mb-2" style={{ fontSize: '0.875rem' }}>Reset Your Password</h6>
                  <p className="text-muted small mb-3">
                    Enter your username or email above, then set a new password below.
                  </p>
                  
                  {resetSuccess && (
                    <div className="alert alert-success alert-sm p-2 mb-2" style={{ fontSize: '0.875rem' }}>
                      Password updated successfully!
                    </div>
                  )}
                  
                  {resetError && (
                    <div className="alert alert-danger alert-sm p-2 mb-2" style={{ fontSize: '0.875rem' }}>
                      {resetError}
                    </div>
                  )}
                  
                  <form onSubmit={handlePasswordReset}>
                    <div className="mb-2">
                      <input
                        type="password"
                        className="form-control form-control-sm"
                        placeholder="New Password (min 4 chars)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={resetPasswordMutation.isPending}
                      />
                    </div>
                    <div className="mb-2">
                      <input
                        type="password"
                        className="form-control form-control-sm"
                        placeholder="Confirm New Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={resetPasswordMutation.isPending}
                      />
                    </div>
                    <button 
                      type="submit" 
                      className="btn btn-sm btn-success w-100"
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