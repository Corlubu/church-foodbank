// frontend/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useMemo, useState, useEffect } from 'react';

// Pages
import Login from './pages/Login';
import AdminHome from './pages/AdminHome';
import StaffScan from './pages/StaffScan';
import StaffDashboard from './pages/StaffDashboard';
import CitizenSubmit from './pages/CitizenSubmit';
import ReportTable from './components/ReportTable';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';

// ==============================
// Auth Context (Recommended Addition)
// ==============================
import { AuthProvider, useAuth } from './context/AuthContext';

// ==============================
// Protected Route Wrapper (Improved)
// ==============================
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, isValidToken } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return <LoadingSpinner message="Verifying access..." />;
  }

  // Check if user is authenticated and has required role
  const isAuthorized = user && allowedRoles.includes(user.role) && isValidToken();

  if (!isAuthorized) {
    // Redirect to login with return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
};

// ==============================
// Public Route Wrapper
// ==============================
const PublicRoute = ({ children }) => {
  const { user, isValidToken } = useAuth();
  const location = useLocation();

  // If user is already authenticated, redirect to appropriate dashboard
  if (user && isValidToken()) {
    const from = location.state?.from?.pathname || 
      (user.role === 'admin' ? '/admin' : '/staff/scan');
    return <Navigate to={from} replace />;
  }

  return children;
};

// ==============================
// Main App Component
// ==============================
function AppContent() {
  const { user, loading, isValidToken } = useAuth();

  // Show loading spinner during initial auth check
  if (loading) {
    return <LoadingSpinner message="Loading application..." />;
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } 
        />
        
        <Route 
          path="/citizen/submit/:qrId" 
          element={<CitizenSubmit />} 
        />

        {/* Protected Admin Routes */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminHome />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/admin/report" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ReportTable />
            </ProtectedRoute>
          } 
        />

        {/* Protected Staff Routes */}
        <Route 
          path="/staff" 
          element={
            <ProtectedRoute allowedRoles={['staff', 'admin']}>
              <StaffDashboard />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/staff/scan" 
          element={
            <ProtectedRoute allowedRoles={['staff', 'admin']}>
              <StaffScan />
            </ProtectedRoute>
          } 
        />

        {/* Default Redirect */}
        <Route 
          path="/" 
          element={
            user && isValidToken() ? (
              <Navigate to={user.role === 'admin' ? '/admin' : '/staff/scan'} replace />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />

        {/* 404 Page */}
        <Route 
          path="*" 
          element={
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <h2>404 - Page Not Found</h2>
              <p>The page you're looking for doesn't exist.</p>
              <Navigate to="/" replace />
            </div>
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}

// ==============================
// Main App Wrapper
// ==============================
function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
