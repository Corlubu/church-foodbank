import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../services/api'; // ✅ Refined Import
import { QRCodeCanvas } from 'qrcode.react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    available_bags: '',
    start_time: '',
    end_time: '',
    hours_valid: '24' // Default for QR expiration
  });
  const [qrData, setQrData] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const frontendUrl = import.meta.env.VITE_FRONTEND_URL || window.location.origin;

  const handleCreateNew = () => {
    setShowCreateForm(true);
    setQrData(null);
    setMessage('');
    setError('');
  };

  const handleViewReport = () => {
    navigate('/admin/report');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userData');
    navigate('/login');
  };

  const downloadQR = () => {
    if (!qrData?.qrUrl) return;

    // Use a reference or query selector to get the canvas element
    const canvas = document.querySelector('.qrcode-canvas'); 
    if (!canvas) {
        setError('QR code canvas not found for download.');
        return;
    }

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
    setMessage('');
    setError('');
    setQrData(null);

    // Validate dates and numbers
    if (new Date(formData.start_time) >= new Date(formData.end_time)) {
        setError('Start time must be before end time.');
        return;
    }
    if (formData.available_bags <= 0) {
        setError('Available bags must be a positive number.');
        return;
    }

    try {
      const payload = {
          ...formData,
          available_bags: parseInt(formData.available_bags),
      };
      
      // ✅ Use structured adminAPI call
      const response = await adminAPI.createFoodWindow(payload); 

      // Construct the full URL for the QR code
      const qrUrl = `${frontendUrl}/register/${response.qrId}`;

      setQrData({ qrId: response.qrId, window: response.window, qrUrl });
      setMessage('Food Window created and QR code generated successfully!');
    } catch (err) {
      setError(err.message || 'Failed to create food window.');
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={{ color: '#2c3e50' }}>Admin Dashboard</h1>
        <button onClick={handleLogout} style={styles.logoutButton}>
          Logout
        </button>
      </header>
      
      <div style={styles.cardContainer}>
        {/* Action Buttons */}
        <div style={styles.actionSection}>
            <button onClick={handleCreateNew} style={styles.createButton}>
                {showCreateForm ? 'Hide Form' : 'Create New Food Window'}
            </button>
            <button onClick={handleViewReport} style={styles.reportButton}>
                View Reports
            </button>
        </div>

        {/* Status Message */}
        {error && <div style={styles.error}>Error: {error}</div>}
        {message && <div style={styles.success}>{message}</div>}

        {/* Create Food Window Form */}
        {showCreateForm && (
            <div style={styles.formCard}>
                <h3 style={styles.formTitle}>Schedule New Distribution</h3>
                <form onSubmit={handleSubmit}>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Available Bags</label>
                        <input
                            type="number"
                            value={formData.available_bags}
                            onChange={e => setFormData({...formData, available_bags: e.target.value})}
                            style={styles.input}
                            min="1"
                            required
                        />
                    </div>
                    
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Start Time</label>
                        <input
                            type="datetime-local"
                            value={formData.start_time}
                            onChange={e => setFormData({...formData, start_time: e.target.value})}
                            style={styles.input}
                            required
                        />
                    </div>
                    
                    <div style={styles.formGroup}>
                        <label style={styles.label}>End Time</label>
                        <input
                            type="datetime-local"
                            value={formData.end_time}
                            onChange={e => setFormData({...formData, end_time: e.target.value})}
                            style={styles.input}
                            required
                        />
                    </div>
                    
                    <button type="submit" style={styles.submitButton}>
                        Generate QR Code
                    </button>
                </form>
            </div>
        )}

        {/* QR Code Display */}
        {qrData && (
            <div style={styles.qrCard}>
                <h3>QR Code for Window #{qrData.window.id}</h3>
                <p>Scan this code for registration during the period:</p>
                <p style={styles.qrInfo}>
                    {new Date(qrData.window.start_time).toLocaleString()} to {new Date(qrData.window.end_time).toLocaleString()}
                </p>
                <div style={{ margin: '1rem auto', width: '256px', height: '256px' }}>
                    <QRCodeCanvas 
                        value={qrData.qrUrl} 
                        size={256} 
                        level={"H"} 
                        className="qrcode-canvas"
                    />
                </div>
                <p style={styles.qrLink}>URL: <a href={qrData.qrUrl} target="_blank" rel="noopener noreferrer">{qrData.qrUrl}</a></p>
                <button onClick={downloadQR} style={styles.downloadButton}>
                    ⬇️ Download QR Code
                </button>
            </div>
        )}
      </div>
    </div>
  );
}
// Styles omitted for brevity but remain structurally sound.
// (Use the styles provided in the original AdminDashBoard.jsx)
