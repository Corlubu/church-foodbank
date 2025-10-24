// frontend/src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';

// Create Auth Context
const AuthContext = createContext();

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper function to set auth state and storage
  const setAuthState = (userData, token) => {
    if (userData && token) {
      const fullUserData = { ...userData, token };
      localStorage.setItem('token', token);
      localStorage.setItem('role', userData.role);
      localStorage.setItem('userData', JSON.stringify(fullUserData));
      setUser(fullUserData);
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('userData');
      setUser(null);
    }
  };

  // Check authentication status on app start
  useEffect(() => {
    checkAuth();
  }, []);

  // Verify token with backend
  const checkAuth = async () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('token');

    if (token && !isTokenExpired(token)) {
      try {
        // Token exists and isn't expired, verify it with backend
        const response = await authAPI.verifyToken();
        setAuthState(response.user, token);
      } catch (verifyError) {
        console.warn('Token verification failed:', verifyError.message);
        // Token is invalid
        setAuthState(null, null);
      }
    } else {
      // No token or it's expired
      setAuthState(null, null);
    }
    setLoading(false);
  };

  // Check if token is expired (client-side only)
  const isTokenExpired = (token) => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  };

  // Check if current token is valid
  const isValidToken = () => {
    const token = localStorage.getItem('token');
    if (!token) return false;
    return !isTokenExpired(token);
  };

  // Login function
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authAPI.login(email, password);
      
      if (response.token && response.user) {
        setAuthState(response.user, response.token);
        return { success: true, user: response.user };
      }
      
      throw new Error('Invalid response from server');
      
    } catch (error) {
      const errorMessage = error.message || 'Login failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    // Optimistically log out on the client
    const token = localStorage.getItem('token');
    setAuthState(null, null);
    setError(null);

    // Attempt to log out from backend
    if (token) {
      try {
        await authAPI.logout();
      } catch (error) {
        console.error('Logout API call failed:', error.message);
      }
    }
  };

  // Clear error
  const clearError = () => {
    setError(null);
  };

  // Update user data (e.g., profile update)
  const updateUser = (updatedData) => {
    setUser(prevUser => {
      const newUser = { ...prevUser, ...updatedData };
      localStorage.setItem('userData', JSON.stringify(newUser));
      return newUser;
    });
  };

  // Context value
  const value = {
    user,
    loading,
    error,
    login,
    logout,
    isValidToken,
    clearError,
    updateUser,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
