// frontend/src/pages/StaffDashboard.jsx
import { useState } from 'react'; // ✅ ESSENTIAL
import { useNavigate } from 'react-router-dom';
import QRScanner from '../components/QRScanner'; 
import ManualCitizenForm from '../components/ManualCitizenForm';

export default function StaffDashboard() {
  const navigate = useNavigate();
  const [view, setView] = useState('menu'); // ✅ Now useState is defined

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  if (view === 'scan') {
    return (
      <div>
        <div style={styles.header}>
          <button onClick={() => setView('menu')} style={styles.backButton}>
            🔙 Back to Menu
          </button>
          <h2>QR Scanner</h2>
        </div>
        <QRScanner onBack={() => setView('menu')} />
      </div>
    );
  }

  if (view === 'manual') {
    return (
      <div>
        <div style={styles.header}>          
          <h2>Manual Registration</h2>
        </div>
        <ManualCitizenForm onBack={() => setView('menu')} />
      </div>
    );
  }

  // Main Menu View
  return (
    <div style={styles.card}>
    <header style={{
        ...styles.header,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
        }}>
        <img 
          className={styles.Logo} 
          src="/cch.png" 
          alt="CCH Logo" 
          style={{ display: 'block', margin: '0 auto 1rem', maxWidth: '300px' }} 
        />    
        <h1 style={styles.title}>Staff Admin</h1> 
      </header>
      <div style={styles.card}>
        <h2>Choose an Action</h2>
        <div style={styles.buttonGroup}>
          <button
            onClick={() => setView('scan')}
            style={{ ...styles.actionButton, backgroundColor: '#3498db' }}
          >
            📱 Scan QR Code
          </button>
          <button
            onClick={() => setView('manual')}
            style={{ ...styles.actionButton, backgroundColor: '#27ae60' }}
          >
            ➕ Manually Add Citizen
          </button>
          <button onClick={handleLogout} style={styles.logoutButton}>
          Logout
        </button>
        </div>
        <p style={styles.info}>
          • Use <strong>Scan QR Code</strong> when citizen has a registration QR.<br />
          • Use <strong>Manually Add</strong> for walk-in registrations.
        </p>

      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f7fa',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    backgroundColor: 'white',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  card: {
    maxWidth: '600px',
    margin: '2rem auto',
    padding: '2rem',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    textAlign: 'center',
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    margin: '1.5rem 0',
  },
  actionButton: {
    padding: '1.25rem',
    fontSize: '1.25rem',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'transform 0.2s',
  },
  info: {
    marginTop: '1.5rem',
    color: '#7f8c8d',
    lineHeight: 1.6,
  },
  backButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#95a5a6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  logoutButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#e74c3c',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
};