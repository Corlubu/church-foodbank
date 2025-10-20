// frontend/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import Login from './pages/Login';
import AdminHome from './pages/AdminHome';
import StaffScan from './pages/StaffScan';
import StaffDashboard from './pages/StaffDashboard';
import CitizenSubmit from './pages/CitizenSubmit';
import ReportTable from './components/ReportTable';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, isValidToken } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <LoadingSpinner 
        message="Verifying access..." 
        fullScreen 
        variant="ring"
      />
    );
  }

  const isAuthorized = user && allowedRoles.includes(user.role) && isValidToken();

  if (!isAuthorized) {
    // Redirect to login with return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <ErrorBoundary>{children}</ErrorBoundary>;
};

// Public Route Component (redirects to dashboard if already authenticated)
const PublicRoute = ({ children }) => {
  const { user, loading, isValidToken } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner message="Loading..." />;
  }

  if (user && isValidToken()) {
    const from = location.state?.from?.pathname || 
      (user.role === 'admin' ? '/admin' : '/staff/scan');
    return <Navigate to={from} replace />;
  }

  return children;
};

// Main App Component
function AppContent() {
  const { loading } = useAuth();

  if (loading) {
    return <LoadingSpinner message="Loading application..." fullScreen />;
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
          element={<Navigate to="/login" replace />}
        />

        {/* 404 Catch All */}
        <Route 
          path="*" 
          element={
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-2xl font-bold mb-4">404 - Page Not Found</h1>
                <p className="mb-4">The page you're looking for doesn't exist.</p>
                <Navigate to="/" replace />
              </div>
            </div>
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}

// App Wrapper with AuthProvider
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
