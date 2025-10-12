import { useState } from 'react';
import Button from '../ui/Button';

interface PasswordResetFormProps {
  onSubmit: (password: string) => Promise<void>;
  isLoading: boolean;
}

const PasswordResetForm = ({ onSubmit, isLoading }: PasswordResetFormProps) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    try {
      await onSubmit(password);
      // Clear form on success
      setPassword('');
      setConfirm('');
    } catch (err) {
      setError('Failed to update password. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="d-flex align-items-end gap-2 mt-2">
      <div className="flex-grow-1">
        <label className="form-label form-label-sm">New Password</label>
        <input
          type="password"
          className="form-control form-control-sm"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter new password"
          disabled={isLoading}
        />
      </div>
      <div className="flex-grow-1">
        <label className="form-label form-label-sm">Confirm Password</label>
        <input
          type="password"
          className={`form-control form-control-sm ${error ? 'is-invalid' : ''}`}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirm new password"
          disabled={isLoading}
        />
        {error && <div className="invalid-feedback">{error}</div>}
      </div>
      <Button type="submit" size="sm" isLoading={isLoading}>
        Set Password
      </Button>
    </form>
  );
};

export default PasswordResetForm;
