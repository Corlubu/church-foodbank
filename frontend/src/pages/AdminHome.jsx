// frontend/src/pages/AdminHome.jsx
import { useEffect, useState } from 'react';
import { useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import AdminDashboard from '../components/AdminDashBoard';
import ReportTable from '../components/ReportTable';

export default function AdminHome() {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check auth on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    if (!token || role !== 'admin') {
      navigate('/login');
    } else {
      setIsAuthorized(true);
    }
    setLoading(false);
  }, [navigate]);

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
    return null; // Will redirect via useEffect
  }

  return (
    <div>
      <Routes>
        {/* Default admin route */}
        <Route index element={<AdminDashboard />} />
        
        {/* Report sub-route */}
        <Route path="report" element={<ReportTable />} />
        
        {/* Catch-all: redirect to dashboard */}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </div>
  );
}
