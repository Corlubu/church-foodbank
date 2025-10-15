// frontend/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

// Pages
import Login from './pages/Login';
import AdminHome from './pages/AdminHome';
import StaffScan from './pages/StaffScan';
import StaffDashboard from './pages/StaffDashboard';
import CitizenSubmit from './pages/CitizenSubmit';
import ReportTable from './components/ReportTable';
// ==============================
// Protected Route Wrapper
// ==============================
const ProtectedRoute = ({ children, allowedRoles }) => {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    if (token && allowedRoles.includes(role)) {
      setIsAuthorized(true);
    } else {
      setIsAuthorized(false);
    }
    setLoading(false);
  }, [allowedRoles]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.2rem',
        color: '#3498db'
      }}>
        Verifying access...
      </div>
    );
  }

  if (!isAuthorized) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// ==============================
// Main App Component
// ==============================
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route 
          path="/citizen/submit/:qrId" 
          element={<CitizenSubmit />} 
        />

        {/* Protected Routes */}
        <Route 
          path="/admin/*" 
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
        <Route 
          path="/staff/*" 
          element={
            <ProtectedRoute allowedRoles={['staff']}>
              <StaffDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Default Redirects */}
        <Route 
          path="/" 
          element={
            // Redirect based on stored role
            localStorage.getItem('role') === 'admin' ? 
              <Navigate to="/admin" replace /> :
            localStorage.getItem('role') === 'staff' ? 
              <Navigate to="/staff/scan" replace /> :
              <Navigate to="/login" replace />
          } 
        />

        {/* 404 Catch-All */}
        <Route 
          path="*" 
          element={<Navigate to="/" replace />} 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;