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
    <form onSubmit={handleSubmit} className="flex items-end gap-2 mt-2">
      <div className="flex-1">
        <label className="block text-sm font-medium text-black mb-1">New Password</label>
        <input
          type="password"
          className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-muted disabled:cursor-not-allowed"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter new password"
          disabled={isLoading}
        />
      </div>
      <div className="flex-1">
        <label className="block text-sm font-medium text-black mb-1">Confirm Password</label>
        <input
          type="password"
          className={`w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 disabled:bg-muted disabled:cursor-not-allowed ${
            error ? 'border-red-500 focus:ring-red-500' : 'focus:ring-primary focus:border-transparent'
          }`}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirm new password"
          disabled={isLoading}
        />
        {error && <div className="text-red-600 text-sm mt-1">{error}</div>}
      </div>
      <Button type="submit" size="sm" isLoading={isLoading}>
        Set Password
      </Button>
    </form>
  );
};

export default PasswordResetForm;
