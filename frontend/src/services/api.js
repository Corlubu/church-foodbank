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
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('userData');
      
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    // Return a more consistent error object
    const errorData = error.response?.data || { error: error.message };
    return Promise.reject(new Error(errorData.error || 'An unexpected error occurred'));
  }
);

// --- Auth API methods ---
export const authAPI = {
  verifyToken: async () => {
    // NOTE: We're using a GET to /admin/food-windows as a 'verify' route
    // This isn't ideal, but it works without adding a new backend route.
    // A dedicated GET /auth/me route would be better.
    // This call will either succeed or 401, which our interceptor handles.
    const response = await api.get('/admin/food-windows'); // Assuming admin-only
    return response.data; // This data isn't used, we just check for success
  },

  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  logout: async () => {
    await api.post('/auth/logout');
  },
};

// --- Admin API methods ---
export const adminAPI = {
  getReport: async (page = 1, limit = 50) => {
    const response = await api.get(`/admin/citizens?page=${page}&limit=${limit}`);
    return response.data;
  },

  exportReport: async () => {
    const response = await api.get('/admin/export/excel', {
      responseType: 'blob',
    });
    return response.data; // This will be the blob
  },

  createFoodWindow: async (windowData) => {
    const response = await api.post('/admin/food-window', windowData);
    return response.data;
  },

  createQR: async (qrConfig) => {
    const response = await api.post('/admin/qr', qrConfig);
    return response.data;
  },
};

// --- Staff API methods ---
export const staffAPI = {
  getActiveWindows: async () => {
    const response = await api.get('/staff/food-windows/active');
    return response.data;
  },

  manualRegister: async (formData) => {
    const response = await api.post('/staff/citizen/manual', formData);
    return response.data;
  },

  lookupQR: async (qrId) => {
    const response = await api.get(`/staff/lookup/${qrId}`);
    return response.data;
  },

  confirmPickup: async (citizenId) => {
    const response = await api.post(`/staff/citizen/${citizenId}/pickup`);
    return response.data;
  },
};

// --- Citizen API methods ---
export const citizenAPI = {
  submitForm: async (qrId, formData) => {
    const response = await api.post(`/citizen/submit/${qrId}`, formData);
    return response.data;
  },
};

// Export the base instance if needed, but prefer the structured objects
export default api;
