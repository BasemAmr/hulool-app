import { useAuthStore } from '../../stores/authStore';

interface NonceStatusProps {
  className?: string;
}

export const NonceStatus = ({ className = '' }: NonceStatusProps) => {
  const { lastNonceRefresh, nonce } = useAuthStore();

  if (!nonce) return null;

  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleTimeString();
  };

  const getTimeAgo = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    const minutes = Math.floor((Date.now() - timestamp) / (1000 * 60));
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 minute ago';
    return `${minutes} minutes ago`;
  };

  return (
    <div className={`text-xs text-gray-500 ${className}`}>
      <div>Nonce: {nonce.substring(0, 8)}...</div>
      <div>Last refresh: {formatTime(lastNonceRefresh)}</div>
      <div>({getTimeAgo(lastNonceRefresh)})</div>
    </div>
  );
};
