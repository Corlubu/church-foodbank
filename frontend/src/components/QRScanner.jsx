import { useState, useCallback } from 'react';
import api from '../services/api';

export default function QRScanner() {
  const [scannedData, setScannedData] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Handle manual QR input
  const handleManualInput = useCallback(async (qrId) => {
    if (!qrId || isLoading) return;

    setIsLoading(true);
    setError('');
    setScannedData(null);

    try {
      const response = await api.get(`/staff/lookup/${qrId}`);
      setScannedData(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'No valid citizen found for this QR code.');
      console.error('QR lookup error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  // For file-based QR scanning (simplified version)
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      // In a real app, you would use a QR decoding library here
      console.log('File content:', e.target.result);
      setError('File scanning requires a QR decoding library. Please use manual input.');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Citizen QR Lookup</h2>

      {/* Manual Input Section */}
      <div style={styles.inputSection}>
        <h3>Enter QR Code ID Manually</h3>
        <div style={styles.inputGroup}>
          <input
            type="text"
            placeholder="Enter QR code ID (e.g., abc-123-def)"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleManualInput(e.target.value);
              }
            }}
            style={styles.textInput}
          />
          <button 
            onClick={() => {
              const input = document.querySelector('input[type="text"]');
              handleManualInput(input.value);
            }}
            style={styles.scanButton}
            disabled={isLoading}
          >
            {isLoading ? 'Looking up...' : 'Lookup'}
          </button>
        </div>
      </div>

      {/* File Upload Section */}
      <div style={styles.uploadSection}>
        <h3>Or Upload QR Code Image</h3>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          style={styles.fileInput}
        />
        <p style={styles.helperText}>Supported formats: PNG, JPG, JPEG</p>
      </div>

      {/* Status Messages */}
      {error && <div style={styles.errorBox}>{error}</div>}
      {isLoading && <div style={styles.loading}>Looking up citizen information...</div>}

      {/* Citizen Data Display */}
      {scannedData && (
        <div style={styles.resultCard}>
          <h3>✅ Citizen Found</h3>
          <div style={styles.citizenInfo}>
            <p><strong>Name:</strong> {scannedData.name}</p>
            <p><strong>Phone:</strong> {scannedData.phone}</p>
            <p><strong>Order #:</strong> {scannedData.order_number}</p>
            <p><strong>Submitted:</strong> {new Date(scannedData.submitted_at).toLocaleString()}</p>
            <p><strong>Status:</strong> 
              <span style={{
                color: scannedData.pickup_confirmed ? '#27ae60' : '#e74c3c',
                fontWeight: 'bold',
                marginLeft: '0.5rem'
              }}>
                {scannedData.pickup_confirmed ? 'Picked Up' : 'Pending'}
              </span>
            </p>
          </div>
          
          {!scannedData.pickup_confirmed && (
            <button 
              style={styles.confirmButton}
              onClick={async () => {
                try {
                  await api.post(`/staff/citizen/${scannedData.id}/pickup`);
                  setScannedData({ ...scannedData, pickup_confirmed: true });
                } catch (err) {
                  setError('Failed to confirm pickup');
                }
              }}
            >
              ✅ Confirm Pickup
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '1.5rem',
    maxWidth: '600px',
    margin: '0 auto',
  },
  title: {
    textAlign: 'center',
    color: '#2c3e50',
    marginBottom: '2rem',
    fontSize: '1.8rem',
  },
  inputSection: {
    marginBottom: '2rem',
  },
  inputGroup: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '1rem',
  },
  textInput: {
    flex: 1,
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '1rem',
  },
  scanButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  uploadSection: {
    marginBottom: '2rem',
    padding: '1.5rem',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
  },
  fileInput: {
    width: '100%',
    margin: '0.5rem 0',
  },
  helperText: {
    fontSize: '0.9rem',
    color: '#666',
    margin: '0.5rem 0 0 0',
  },
  errorBox: {
    padding: '0.85rem',
    backgroundColor: '#ffebee',
    color: '#c62828',
    borderRadius: '8px',
    textAlign: 'center',
    marginBottom: '1.25rem',
  },
  loading: {
    textAlign: 'center',
    padding: '0.85rem',
    color: '#2980b9',
    fontWeight: 'bold',
  },
  resultCard: {
    backgroundColor: '#e8f4fc',
    border: '1px solid #3498db',
    borderRadius: '10px',
    padding: '1.5rem',
    marginTop: '1.5rem',
  },
  citizenInfo: {
    textAlign: 'left',
    marginBottom: '1rem',
  },
  confirmButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#27ae60',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
};
