import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/wp-json/tm/v1',
});

// Request Interceptor: Injects auth headers before each request is sent
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

export default apiClient;