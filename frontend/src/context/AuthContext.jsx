// frontend/src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const role = localStorage.getItem('role');
      const userData = localStorage.getItem('userData');
      
      if (token && role) {
        if (!isTokenExpired(token)) {
          if (userData) {
            setUser(JSON.parse(userData));
          }
          
          try {
            const response = await authAPI.verifyToken();
            const fullUserData = {
              role,
              ...response.user,
              token
            };
            
            setUser(fullUserData);
            localStorage.setItem('userData', JSON.stringify(fullUserData));
          } catch (verifyError) {
            console.warn('Token verification failed:', verifyError);
            logout();
          }
        } else {
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

  const isTokenExpired = (token) => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  };

  const isValidToken = () => {
    const token = localStorage.getItem('token');
    if (!token) return false;
    return !isTokenExpired(token);
  };

  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authAPI.login(email, password);
      
      if (response.token && response.user) {
        const { token, user } = response;
        
        localStorage.setItem('token', token);
        localStorage.setItem('role', user.role);
        localStorage.setItem('userData', JSON.stringify(user));
        
        setUser(user);
        
        return { success: true, user };
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

  const logout = async () => {
    try {
      if (user) {
        await authAPI.logout();
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('userData');
      setUser(null);
      setError(null);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const updateUser = (updatedUserData) => {
    setUser(prevUser => {
      const newUser = { ...prevUser, ...updatedUserData };
      localStorage.setItem('userData', JSON.stringify(newUser));
      return newUser;
    });
  };

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
