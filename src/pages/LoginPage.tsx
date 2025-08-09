import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { fetchNonce, fetchUser } from '../queries/authQueries';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { t } = useTranslation();
  const loginAction = useAuthStore((state) => state.login);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const token = btoa(`${username}:${password}`);

    try {
      // Step 1: Get the nonce.
      const nonceData = await fetchNonce(token);
      
      // Step 2: Get the user data, passing the token and nonce directly.
      const userData = await fetchUser(token, nonceData.nonce);

      // Step 3: If both succeed, commit everything to the store at once.
      loginAction(token, userData, nonceData.nonce);
      
      navigate('/dashboard');

    } catch (err) {
      setError(t('login.errorInvalid'));
      console.error(err);
    } finally {
      setIsLoading(false);
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
                />
              </div>

              <div className="d-grid">
                <button type="submit" className="btn btn-primary btn-lg" disabled={isLoading}>
                  {isLoading ? t('login.authenticatingText') : t('login.buttonText')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;