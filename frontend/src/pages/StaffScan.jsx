import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BarcodeScannerComponent from '../components/QRScanner';

export default function StaffScan() {
  const navigate = useNavigate();

  // Optional: Redirect if not logged in (ProtectedRoute already handles this)
  useEffect(() => {
    if (!localStorage.getItem('token') || localStorage.getItem('role') !== 'staff') {
      navigate('/login');
    }
  }, [navigate]);

  return (
    <div>
      <h1 style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#3498db', color: 'white' }}>
        Staff QR Scanner
      </h1>
      <BarcodeScannerComponent />
    </div>
  );
}