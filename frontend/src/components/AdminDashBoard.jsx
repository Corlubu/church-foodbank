import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { QRCodeCanvas } from 'qrcode.react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  
  // 🔑 NEW: State to control form visibility
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleCreateNew = () => {
    setShowCreateForm(true); // ✅ Show form when button clicked
  };

  const handleViewReport = () => {
    navigate('/admin/report');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };
  const downloadQR = () => {
    if (!qrData?.qrUrl) return;

  // Create a temporary canvas
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    const pngUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = pngUrl;
    link.download = `foodbank_qr_${new Date().toISOString().slice(0, 10)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Form state
  const [formData, setFormData] = useState({
    available_bags: '',
    start_time: '',
    end_time: '',
    hours_valid: '24'
  });
    const [qrData, setQrData] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      const windowRes = await api.post('/admin/food-window', {
        available_bags: parseInt(formData.available_bags),
        start_time: formData.start_time,
        end_time: formData.end_time
      });
      
      const qrRes = await api.post('/admin/qr', {
        food_window_id: windowRes.data.id,
        hours_valid: parseInt(formData.hours_valid)
      });
      setQrData(qrRes.data);
      setMessage('✅ Food window created and QR generated!');
      setFormData({ available_bags: '', start_time: '', end_time: '', hours_valid: '24' });
      
      // Optional: Hide form after success
      // setShowCreateForm(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create food window');
    }    
  };

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
            <button onClick={handleViewReport} style={{ ...styles.actionButton, backgroundColor: '#27ae60' }}>
              📊 Generate Citizen Report
            </button>
             <button onClick={handleLogout} style={styles.logoutButton}>
                🔙 Logout
              </button>
          </div>
        </div>

        {/* ✅ Conditionally render form ONLY when showCreateForm is true */}
        {showCreateForm && (
          <div style={styles.formCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
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
              <div style={styles.formGroup}>
                <label>Bags Available:</label>
                <input
                  type="number"
                  min="1"
                  value={formData.available_bags}
                  onChange={(e) => setFormData({ ...formData, available_bags: e.target.value })}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label>Start Time:</label>
                <input
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label>End Time:</label>
                <input
                  type="datetime-local"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label>QR Valid For (hours):</label>
                <input
                  type="number"
                  min="1"
                  max="168"
                  value={formData.hours_valid}
                  onChange={(e) => setFormData({ ...formData, hours_valid: e.target.value })}
                />
              </div>

              <button type="submit" style={styles.submitButton}>
                Create & Generate QR
              </button>
            </form>
          </div>
        )}
        {qrData && (
          <div style={styles.qrCard}>
            <h3>Generated QR Code</h3>
            <p>Valid until: {new Date(qrData.expiresAt).toLocaleString()}</p>
            
            {/* ✅ REAL QR CODE IMAGE */}
            <div style={styles.qrDisplay}>
              <QRCodeCanvas
                value={qrData.qrUrl}
                size={256}
                level={"M"}                
              />
            </div>
            
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
        )}
      </div>
    </div>
  );
}

// Styles (with new closeButton)
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
  formCard: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
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
  logoutButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#e74c3c',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
};