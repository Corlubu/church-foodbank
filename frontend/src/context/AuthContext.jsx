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

  // Check authentication status on app start
  useEffect(() => {
    checkAuth();
  }, []);

  // Verify token with backend
  const checkAuth = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const role = localStorage.getItem('role');
      const userData = localStorage.getItem('userData');
      
      if (token && role) {
        // If we have user data in localStorage, use it immediately
        if (userData) {
          setUser(JSON.parse(userData));
        }
        
        // Verify with backend
        try {
          const response = await authAPI.verifyToken();
          const fullUserData = {
            role,
            ...response.user,
            token
          };
          
          setUser(fullUserData);
          // Update localStorage with fresh user data
          localStorage.setItem('userData', JSON.stringify(fullUserData));
        } catch (verifyError) {
          console.warn('Token verification failed:', verifyError);
          // Token is invalid, logout user
          logout();
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setError('Authentication check failed');
      logout();
    } finally {
      setLoading(false);
    }
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
        const { token, user } = response;
        
        // Store in localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('role', user.role);
        localStorage.setItem('userData', JSON.stringify(user));
        
        // Set user in state
        setUser(user);
        
        return { success: true, user };
      }
      
      throw new Error('Invalid response from server');
      
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Login failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Call logout API if user was logged in
      if (user) {
        await authAPI.logout();
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      // Always clear local storage and state
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('userData');
      setUser(null);
      setError(null);
    }
  };

  // Clear error
  const clearError = () => {
    setError(null);
  };

  // Update user data
  const updateUser = (updatedUserData) => {
    setUser(prevUser => {
      const newUser = { ...prevUser, ...updatedUserData };
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
