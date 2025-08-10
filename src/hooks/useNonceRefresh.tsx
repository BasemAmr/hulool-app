import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { fetchNonce } from '../queries/authQueries';

const NONCE_REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes in milliseconds
const NONCE_REFRESH_THRESHOLD = 25 * 60 * 1000; // 25 minutes - refresh 5 minutes before expiry

export const useNonceRefresh = () => {
  const { token, setNonce, status, lastNonceRefresh } = useAuthStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);

  const refreshNonce = useCallback(async () => {
    if (!token || status !== 'authenticated' || isRefreshingRef.current) {
      return;
    }

    try {
      isRefreshingRef.current = true;
      console.log('Refreshing nonce...');
      const nonceData = await fetchNonce(token);
      setNonce(nonceData.nonce);
      console.log('Nonce refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh nonce:', error);
      // Optionally, you could implement a retry mechanism here
      // or trigger a re-authentication flow if the refresh fails
    } finally {
      isRefreshingRef.current = false;
    }
  }, [token, status, setNonce]);

  // Check if nonce needs immediate refresh based on last refresh time
  const needsImmediateRefresh = useCallback(() => {
    if (!lastNonceRefresh) return true; // Never refreshed
    const timeSinceRefresh = Date.now() - lastNonceRefresh;
    return timeSinceRefresh >= NONCE_REFRESH_THRESHOLD;
  }, [lastNonceRefresh]);

  useEffect(() => {
    // Only start the refresh mechanism if user is authenticated
    if (status === 'authenticated' && token) {
      // Check if we need immediate refresh
      if (needsImmediateRefresh()) {
        refreshNonce();
      }
      
      // Set up interval for periodic refresh
      intervalRef.current = setInterval(refreshNonce, NONCE_REFRESH_INTERVAL);
      
      console.log('Nonce refresh interval started (30 minutes)');
    } else {
      // Clear interval if user is not authenticated
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        console.log('Nonce refresh interval cleared');
      }
    }

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [status, token, refreshNonce, needsImmediateRefresh]); // Re-run when authentication status or token changes

  // Manual refresh function that can be called from components
  const manualRefresh = useCallback(() => {
    refreshNonce();
  }, [refreshNonce]);

  return { manualRefresh };
};
