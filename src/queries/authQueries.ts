import apiClient from '../api/apiClient';
import type{ ApiResponse, NonceData, User } from '../api/types';

/**
 * Fetches a fresh nonce from the server.
 * Requires a temporary Authorization header for the request itself.
 */
export const fetchNonce = async (token: string): Promise<NonceData> => {
  const { data } = await apiClient.post<ApiResponse<NonceData>>(
    '/auth/nonce',
    {},
    {
      headers: { 'Authorization': `Basic ${token}` },
    }
  );
  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch nonce.');
  }
  return data.data;
};

/**
 * Fetches the current user's data.
 * ACCEPTS token and nonce as arguments for the initial login flow.
 */
export const fetchUser = async (token: string, nonce: string): Promise<User> => {
    const { data } = await apiClient.get<ApiResponse<User>>('/auth/user', {
        // Pass headers directly for this specific call to ensure they are present.
        headers: {
            'Authorization': `Basic ${token}`,
            'X-WP-Nonce': nonce
        }
    });
    if (!data.success) {
        throw new Error(data.message || 'Failed to fetch user data.');
    }
    return data.data;
};