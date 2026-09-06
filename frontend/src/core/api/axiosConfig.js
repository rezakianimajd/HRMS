import axios from 'axios';
import errorBus from '../engines/errorBus';

// Relative base URL so the browser calls the same host that served the app
// (e.g. http://192.168.134.111/api) instead of localhost:8000.
const BASE_URL = process.env.REACT_APP_API_URL || '/api';

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - attach JWT token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Attach language header
    const language = localStorage.getItem('language') || 'fa';
    config.headers['Accept-Language'] = language;

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle token refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Global error surfacing (Proposal 7): non-401 failures become a snackbar.
    // quiet flag lets callers deliberately skip the global alert.
    const status = error.response?.status;
    if (status && status !== 401 && status !== 400 && !originalRequest?.quiet) {
      const data = error.response?.data;
      let msg = data?.detail || data?.message || data?.error || (Array.isArray(data) && data[0]) || `خطا در ارتباط با سرور (${status})`;
      if (typeof msg !== 'string') msg = `خطا در ارتباط با سرور (${status})`;
      errorBus.notify({ message: msg, status });
    } else if (!status) {
      errorBus.notify({ message: 'خطا در برقراری ارتباط با سرور (آفلاین هستید؟)' });
    }

    // If 401 and not already retrying, try refresh token
    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const response = await axios.post(`${BASE_URL}/auth/refresh/`, {
            refresh: refreshToken,
          });
          const { access } = response.data;
          localStorage.setItem('access_token', access);
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return axiosInstance(originalRequest);
        } catch (refreshError) {
          // Refresh failed, force logout
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;