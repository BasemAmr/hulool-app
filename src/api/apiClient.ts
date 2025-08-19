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
    // Remove or comment out the X-Frontend-Source header to avoid CORS issues
    // if (config.headers['X-Frontend-Source']) {
    //   // The header is already set by the calling function
    // } else {
    //   config.headers['X-Frontend-Source'] = 'Unknown';
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle nonce-related errors
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Check if the error is related to invalid nonce
    if (error.response?.status === 403 && 
        error.response?.data?.message?.includes('nonce')) {
      console.warn('Nonce validation failed, may need refresh');
      // The nonce refresh mechanism will handle this automatically
      // on the next scheduled refresh
    }
    return Promise.reject(error);
  }
);

export default apiClient;