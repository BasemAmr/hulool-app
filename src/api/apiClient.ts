import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/wp-json/tm/v1',
});

let isRefreshingNonce = false;
let failedQueue: Array<{ resolve: (value?: any) => void; reject: (reason?: any) => void }> = [];

const processQueue = (error: any = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

apiClient.interceptors.request.use(
  (config) => {
    const { token, nonce } = useAuthStore.getState();
    if (token) {
      config.headers['Authorization'] = `Basic ${token}`;
    }
    if (nonce) {
      config.headers['X-WP-Nonce'] = nonce;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 403 && !originalRequest._retry) {
      const isNonceError = error.response?.data?.code === 'rest_cookie_invalid_nonce' ||
                          error.response?.data?.message?.toLowerCase().includes('nonce');
      if (isNonceError) {
        originalRequest._retry = true;
        if (isRefreshingNonce) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then(() => apiClient(originalRequest)).catch(err => Promise.reject(err));
        }
        isRefreshingNonce = true;
        try {
          const { token } = useAuthStore.getState();
          if (!token) throw new Error('No authentication token available');
          const { data } = await axios.post(`/auth/nonce`, {}, {
            headers: { 'Authorization': `Basic ${token}` }
          });
          if (data.success && data.data.nonce) {
            useAuthStore.getState().setNonce(data.data.nonce);
            processQueue();
            return apiClient(originalRequest);
          }
        } catch (refreshError) {
          processQueue(refreshError);
          return Promise.reject(refreshError);
        } finally {
          isRefreshingNonce = false;
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
