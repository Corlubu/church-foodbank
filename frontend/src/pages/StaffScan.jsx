// frontend/src/pages/StaffScan.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import  BarcodeScanner  from 'react-qr-barcode-scanner';
import CitizenLookup from '../components/CitizenLookup'; // The component we fixed
import { useAuth } from '../context/AuthContext';

export default function StaffScan() {
  const [scannedQrId, setScannedQrId] = useState('');
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleScan = (result) => {
    if (result) {
      try {
        // Extract the QR ID from the full URL
        const url = new URL(result.text);
        const pathParts = url.pathname.split('/');
        const qrId = pathParts[pathParts.length - 1];
        setScannedQrId(qrId);
      } catch (err) {
        console.error('Scanned non-URL QR:', err);
        // If it's not a URL, just pass the raw text
        setScannedQrId(result.text);
      }
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <img src="/cch.png" alt="CCH Logo" style={styles.logo} />
        <h1 style={styles.title}>CCH Pantry Staff</h1>
      </header>

      <div style={styles.actions}>
        <button
          onClick={() => navigate('/staff')}
          style={styles.actionButton}
        >
          📝 Manual Registration
        </button>
        <button onClick={logout} style={styles.logoutButton}>
          🔙 Logout
        </button>
      </div>

      <div style={styles.scannerContainer}>
        <h2 style={styles.subtitle}>Scan Citizen QR Code</h2>
        <div style={styles.scannerWrapper}>
          <QrReader
            onResult={handleScan}
            constraints={{ facingMode: 'environment' }}
            scanDelay={500}
            style={{ width: '100%' }}
          />
        </div>
        <p style={styles.scanHelper}>
          Align the QR code within the frame.
        </p>
      </div>

      <div style={styles.lookupContainer}>
        {/* Pass the scanned ID to the lookup component */}
        <CitizenLookup initialQrId={scannedQrId} />
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '700px',
    margin: '0 auto',
    padding: '1rem',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '1rem',
    backgroundColor: 'white',
  },
  logo: {
    maxWidth: '250px',
    marginBottom: '1rem',
  },
  title: {
    margin: 0,
    color: '#2c3e50',
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-around',
    gap: '1rem',
    margin: '1.5rem 0',
  },
  actionButton: {
    flex: 1,
    padding: '0.75rem',
    fontSize: '1rem',
    color: 'white',
    backgroundColor: '#3498db',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  logoutButton: {
    flex: 1,
    padding: '0.75rem',
    fontSize: '1rem',
    backgroundColor: '#e74c3c',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  scannerContainer: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  },
  subtitle: {
    textAlign: 'center',
    marginTop: 0,
    color: '#333',
  },
  scannerWrapper: {
    maxWidth: '400px',
    margin: '1rem auto',
    border: '2px solid #ddd',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  scanHelper: {
    textAlign: 'center',
    color: '#7f8c8d',
  },
  lookupContainer: {
    marginTop: '2rem',
  },
};
