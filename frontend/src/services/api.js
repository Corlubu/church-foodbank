// frontend/src/services/api.js
import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 (Unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // This is a critical failure (invalid token/session)
      // Clear all auth data and force a reload to the login page.
      // This is the simplest way to ensure app-wide state is reset.
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('userData');
      
      // Check if we are already on the login page to avoid a loop
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// --- Auth API methods ---
// These are kept because AuthContext.jsx depends on them.
// We assume the backend /auth/ routes exist.
export const authAPI = {
  // Verify token with backend
  verifyToken: async () => {
    try {
      // NOTE: Your backend did not provide an /auth/verify route.
      // I am assuming it exists based on your code.
      // A common pattern is to hit a 'me' or 'profile' route.
      const response = await api.get('/auth/verify');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Token verification failed');
    }
  },

  // Login user
  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  },

  // Logout user (backend call only)
  logout: async () => {
    try {
      // The context will handle clearing localStorage
      await api.post('/auth/logout');
    } catch (error) {
      // Fail silently, as the user is already logged out on the client
      console.error('Backend logout error:', error.message);
    }
  },
};

// The main axios instance is exported for use in other services/pages
export default api;
