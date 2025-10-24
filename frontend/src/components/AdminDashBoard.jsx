// frontend/src/components/AdminDashBoard.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../services/api'; // Import new API object
import { useAuth } from '../context/AuthContext'; // Import useAuth
import { QRCodeCanvas } from 'qrcode.react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth(); // Use the logout function from context
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    available_bags: '',
    start_time: '',
    end_time: '',
    hours_valid: '24',
  });
  const [qrData, setQrData] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleCreateNew = () => {
    setShowCreateForm(true);
  };

  const handleViewReport = () => {
    navigate('/admin/report');
  };

  // Updated logout handler
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const downloadQR = () => {
    if (!qrData?.qrUrl) return;

    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    const pngUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = pngUrl;
    link.download = `foodbank_qr_${new Date().toISOString().slice(0, 10)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {

      // Use the clean payload
      const response = await api.post('/admin/food-window', payload);
      
      // Create food window first
      const windowRes = await adminAPI.createFoodWindow({
        available_bags: parseInt(formData.available_bags),
        start_time: formData.start_time,
        end_time: formData.end_time,
      });

      // Then generate QR code
      const qrRes = await adminAPI.createQR({
        food_window_id: windowRes.id,
        hours_valid: parseInt(formData.hours_valid),
      });

      setQrData(qrRes);
      setMessage('✅ Food window created and QR generated!');
      setFormData({
        available_bags: '',
        start_time: '',
        end_time: '',
        hours_valid: '24',
      });
    } catch (err) {
      setError(err.message || 'Failed to create food window');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <img src="/cch.png" alt="CCH Logo" style={styles.logo} />
        <h1 style={styles.title}>CCH Pantry Admin</h1>
      </header>

      <div style={styles.main}>
        {/* Action Buttons */}
        <div style={styles.actionCard}>
          <h2>Admin Actions</h2>
          <div style={styles.buttonGroup}>
            <button onClick={handleCreateNew} style={styles.actionButton}>
              ➕ Create New Food Window
            </button>
            <button
              onClick={handleViewReport}
              style={{ ...styles.actionButton, backgroundColor: '#27ae60' }}
            >
              📊 Generate Citizen Report
            </button>
            <button onClick={handleLogout} style={styles.logoutButton}>
              🔙 Logout
            </button>
          </div>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <div style={styles.formCard}>
            <div style={styles.formHeader}>
              <h2>Create New Food Distribution</h2>
              <button
                onClick={() => setShowCreateForm(false)}
                style={styles.closeButton}
              >
                ✕ Close
              </button>
            </div>

            {error && <div style={styles.error}>{error}</div>}
            {message && <div style={styles.success}>{message}</div>}

            <form onSubmit={handleSubmit}>
              {/* Form inputs... (no change) */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Bags Available:</label>
                <input
                  type="number"
                  min="1"
                  value={formData.available_bags}
                  onChange={(e) => setFormData({ ...formData, available_bags: e.target.value })}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Start Time:</label>
                <input
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>End Time:</label>
                <input
                  type="datetime-local"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>QR Valid For (hours):</label>
                <input
                  type="number"
                  min="1"
                  max="168"
                  value={formData.hours_valid}
                  onChange={(e) => setFormData({ ...formData, hours_valid: e.target.value })}
                  style={styles.input}
                />
              </div>

              <button type="submit" style={styles.submitButton}>
                Create & Generate QR
              </button>
            </form>
          </div>
        )}

        {/* QR Code Display */}
        {qrData && (
          <div style={styles.qrCard}>
            <h3>Generated QR Code</h3>
            <p>Valid until: {new Date(qrData.expiresAt).toLocaleString()}</p>

            <div style={styles.qrDisplay}>
              <QRCodeCanvas value={qrData.qrUrl} size={256} level="M" />
            </div>

            <div style={styles.qrButtons}>
              <button onClick={downloadQR} style={styles.downloadButton}>
                📥 Download QR
              </button>
              <button
                onClick={() => navigate('/admin/report')}
                style={{ ...styles.downloadButton, backgroundColor: '#8e44ad' }}
              >
                📊 View Full Report
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Styles (no change)
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f7fa',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '2rem',
    backgroundColor: 'white',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  logo: {
    display: 'block',
    margin: '0 auto 1rem',
    maxWidth: '300px'
  },
  title: {
    margin: 0,
    color: '#2c3e50'
  },
  main: {
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
    maxWidth: '800px',
    margin: '0 auto',
  },
  actionCard: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    textAlign: 'center',
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginTop: '1.5rem',
  },
  actionButton: {
    padding: '1rem',
    fontSize: '1.1rem',
    color: 'white',
    backgroundColor: '#3498db',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  logoutButton: {
    padding: '1rem',
    fontSize: '1.1rem',
    backgroundColor: '#e74c3c',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  formCard: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  },
  formHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: '#7f8c8d',
    padding: '0.25rem',
  },
  formGroup: {
    marginBottom: '1.25rem',
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '1rem',
  },
  submitButton: {
    width: '100%',
    padding: '0.85rem',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '1rem',
  },
  error: {
    padding: '0.75rem',
    backgroundColor: '#ffebee',
    color: '#c62828',
    borderRadius: '6px',
    marginBottom: '1rem',
    textAlign: 'center',
  },
  success: {
    padding: '0.75rem',
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
    borderRadius: '6px',
    marginBottom: '1rem',
    textAlign: 'center',
  },
  qrCard: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    textAlign: 'center',
  },
  qrDisplay: {
    margin: '1.5rem 0',
    display: 'flex',
    justifyContent: 'center',
  },
  qrButtons: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
  },
  downloadButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
};
