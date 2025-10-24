// frontend/src/App.jsx
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  Link,
} from 'react-router-dom';
import { useAuth, AuthProvider } from './context/AuthContext';
import LoadingSpinner from './components/LoadingSpinner'; // Assuming you will provide this
import ErrorBoundary from './components/ErrorBoundary'; // Assuming you will provide this

// Pages
import Login from './pages/Login'; // Assuming you will provide this
import AdminHome from './pages/AdminHome'; // Assuming you will provide this
import StaffScan from './pages/StaffScan'; // Assuming you will provide this
import StaffDashboard from './pages/StaffDashboard'; // Assuming you will provide this
import CitizenSubmit from './pages/CitizenSubmit'; // Assuming you will provide this
import ReportTable from './components/ReportTable'; // Assuming you will provide this

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
    const from =
      location.state?.from?.pathname ||
      (user.role === 'admin' ? '/admin' : '/staff/scan');
    return <Navigate to={from} replace />;
  }

  return children;
};

// 404 Not Found Page
const NotFound = () => (
  <div
    style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <div style={{ textAlign: 'center' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
        404 - Page Not Found
      </h1>
      <p style={{ marginBottom: '1rem' }}>
        The page you're looking for doesn't exist.
      </p>
      <Link to="/login" style={{ color: 'blue', textDecoration: 'underline' }}>
        Go to Login
      </Link>
    </div>
  </div>
);

// Main App Component
function AppContent() {
  const { loading } = useAuth();

  if (loading) {
    return <LoadingSpinner message="Loading application..." fullScreen />;
  }

  return (
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
      <Route path="/citizen/submit/:qrId" element={<CitizenSubmit />} />

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
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* 404 Catch All */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

// App Wrapper with AuthProvider and BrowserRouter
function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
