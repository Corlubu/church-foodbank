// frontend/src/services/api.js
import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  withCredentials: true, // Important for cookies if using them
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

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API methods
export const authAPI = {
  // Verify token with backend
  verifyToken: async () => {
    try {
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

  // Logout user
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('role');
    }
  },

  // Refresh token (if implementing token refresh)
  refreshToken: async () => {
    try {
      const response = await api.post('/auth/refresh');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Token refresh failed');
    }
  }
};

// Admin API methods
export const adminAPI = {
  getDashboardData: async () => {
    try {
      const response = await api.get('/admin/dashboard');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch dashboard data');
    }
  },

  getReports: async () => {
    try {
      const response = await api.get('/admin/reports');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch reports');
    }
  }
};

// Staff API methods
export const staffAPI = {
  scanQRCode: async (qrId) => {
    try {
      const response = await api.post('/staff/scan', { qrId });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Scan failed');
    }
  },

  getStaffDashboard: async () => {
    try {
      const response = await api.get('/staff/dashboard');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch staff data');
    }
  }
};

// Citizen API methods
export const citizenAPI = {
  submitForm: async (qrId, formData) => {
    try {
      const response = await api.post(`/citizen/submit/${qrId}`, formData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Submission failed');
    }
  }
};

export default api;
