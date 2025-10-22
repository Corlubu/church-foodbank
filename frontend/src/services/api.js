// frontend/src/services/api.js

import axios from 'axios';

// Get base URL from environment variable, fall back to localhost for development
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  // withCredentials is not typically needed with JWT in localStorage, 
  // but keeping it won't hurt if you plan to use httpOnly cookies later.
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

// Response interceptor to handle common errors (e.g., expired token)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401: Unauthorized (token expired/invalid)
    if (error.response?.status === 401 && !error.config.url.includes('/auth/login')) {
      console.error('Token expired or unauthorized access. Redirecting to login.');
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      // Use window.location.href to force a full refresh and clear state
      window.location.href = '/login'; 
    }
    return Promise.reject(error);
  }
);

// --- API Methods ---

export const authAPI = {
  // Login user
  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  },

  // Logout (optional: could call a backend endpoint to revoke token)
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    // Client-side logout is sufficient for stateless JWT
  }
};

// Admin API methods
export const adminAPI = {
  // Placeholder for a GET request to the admin dashboard
  getDashboardData: async () => {
    try {
      const response = await api.get('/admin/dashboard');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch dashboard data');
    }
  },

  // Fetch Excel report (The backend route for this is not fully clear, assuming /admin/report/excel)
  downloadReport: async (foodWindowId) => {
    try {
      const response = await api.get(`/admin/report/excel?foodWindowId=${foodWindowId}`, {
        responseType: 'blob' // Important for file downloads
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to download report');
    }
  },
  
  // Get all food windows (for admin views)
  getAllFoodWindows: async () => {
    try {
      const response = await api.get('/admin/food-windows');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch food windows');
    }
  },

  // Create a new food window
  createFoodWindow: async (data) => {
    try {
      const response = await api.post('/admin/food-window', data);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to create food window');
    }
  },
  
  // Toggle food window active status
  toggleFoodWindowActive: async (id, is_active) => {
    try {
      const response = await api.patch(`/admin/food-window/${id}/active`, { is_active });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to update food window status');
    }
  }
};

// Staff API methods
export const staffAPI = {
  /**
   * CORRECTED: Use GET request to match the backend /staff/lookup/:qrId route.
   * Fetches citizen data based on QR ID.
   */
  lookupCitizenByQR: async (qrId) => {
    try {
      // Use URL parameter for GET request
      const response = await api.get(`/staff/lookup/${qrId}`); 
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'QR lookup failed');
    }
  },
  
  // Manual registration by staff
  manualRegisterCitizen: async (formData) => {
    try {
      const response = await api.post('/staff/citizen/manual', formData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Manual registration failed');
    }
  },
  
  // Get active food windows (for manual registration form)
  getActiveFoodWindows: async () => {
    try {
      const response = await api.get('/staff/food-windows/active');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch active windows');
    }
  },
  
  // Confirm pickup
  confirmPickup: async (citizenId) => {
    try {
      const response = await api.post(`/staff/citizen/${citizenId}/pickup`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Pickup confirmation failed');
    }
  }
};

// Citizen (Public) API methods
export const citizenAPI = {
  // Submit form via QR code link
  submitForm: async (qrId, formData) => {
    try {
      const response = await api.post(`/citizen/submit/${qrId}`, formData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Submission failed. Check phone number and quota.');
    }
  },

  // Check order status
  checkOrderStatus: async (orderNumber) => {
    try {
      const response = await api.get(`/citizen/order/${orderNumber}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Order not found');
    }
  }
};

export default api;
