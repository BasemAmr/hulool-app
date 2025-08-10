import { useAuthStore } from '../stores/authStore';
import { fetchNonce } from '../queries/authQueries';

/**
 * Utility function to manually refresh the nonce
 * Can be used from anywhere in the application
 */
export const refreshNonceManually = async (): Promise<boolean> => {
  const { token, setNonce, status } = useAuthStore.getState();
  
  if (!token || status !== 'authenticated') {
    console.warn('Cannot refresh nonce: user not authenticated');
    return false;
  }

  try {
    console.log('Manually refreshing nonce...');
    const nonceData = await fetchNonce(token);
    setNonce(nonceData.nonce);
    console.log('Manual nonce refresh successful');
    return true;
  } catch (error) {
    console.error('Manual nonce refresh failed:', error);
    return false;
  }
};

/**
 * Get the time until the next scheduled nonce refresh
 */
export const getTimeUntilNextRefresh = (): number => {
  const { lastNonceRefresh } = useAuthStore.getState();
  
  if (!lastNonceRefresh) return 0;
  
  const REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes
  const timeSinceRefresh = Date.now() - lastNonceRefresh;
  const timeUntilNext = REFRESH_INTERVAL - timeSinceRefresh;
  
  return Math.max(0, timeUntilNext);
};

/**
 * Check if the nonce is due for refresh (older than 25 minutes)
 */
export const isNonceDueForRefresh = (): boolean => {
  const { lastNonceRefresh } = useAuthStore.getState();
  
  if (!lastNonceRefresh) return true;
  
  const REFRESH_THRESHOLD = 25 * 60 * 1000; // 25 minutes
  const timeSinceRefresh = Date.now() - lastNonceRefresh;
  
  return timeSinceRefresh >= REFRESH_THRESHOLD;
};
