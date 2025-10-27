import { useState } from 'react';
import  { BarcodeScanner }   from 'react-qr-barcode-scanner';
import api from '../services/api';

export default function QRScanner() {
  const [scannedData, setScannedData] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Handle successful scan
  const handleScan = async (result) => {
    if (!result?.text || isLoading) return;

    setIsLoading(true);
    setError('');
    setScannedData(null);

    try {
      // Parse the scanned text (should be a URL like: http://.../citizen/submit/abc-123)
      let qrId = null;

      try {
        const url = new URL(result.text);
        const pathParts = url.pathname.split('/');
        qrId = pathParts[pathParts.length - 1];
      } catch (urlErr) {
        // If not a URL, treat the whole text as qrId (fallback)
        qrId = result.text.trim();
      }

      if (!qrId || qrId.length < 5) {
        throw new Error('Invalid QR code format');
      }

      // Call backend to look up citizen by QR ID
      const response = await api.get(`/staff/lookup/${qrId}`);
      setScannedData(response.data);
    } catch (err) {
      setError('No valid citizen found for this QR code. Please scan again.');
      console.error('Scan lookup error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle camera or permission errors
  const handleError = (err) => {
    console.error('QR Scanner error:', err);
    setError('Camera access denied or unavailable. Please allow camera permission and ensure your device has a camera.');
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Scan Citizen QR Code</h2>

      {/* Scanner Box */}
      <div style={styles.scannerContainer}>
        <BarcodeScannerComponent
          onScan={handleScan}
          onError={handleError}
          // Optional: prefer rear camera on mobile
          constraints={{ facingMode: 'environment' }}
          // Optional: customize scan region
          scanRegion={{
            x: 0.1,
            y: 0.1,
            width: 0.8,
            height: 0.8,
          }}
        />
      </div>

      {/* Status Messages */}
      {error && <div style={styles.errorBox}>{error}</div>}
      {isLoading && <div style={styles.loading}>Looking up citizen...</div>}

      {/* Citizen Data Display */}
      {scannedData && (
        <div style={styles.resultCard}>
          <h3>✅ Citizen Found</h3>
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
      )}
    </div>
  );
}

// Inline styles for simplicity
const styles = {
  container: {
    padding: '1.5rem',
    maxWidth: '700px',
    margin: '0 auto',
  },
  title: {
    textAlign: 'center',
    color: '#2c3e50',
    marginBottom: '1.5rem',
    fontSize: '1.8rem',
  },
  scannerContainer: {
    width: '100%',
    height: '400px',
    border: '2px solid #3498db',
    borderRadius: '12px',
    overflow: 'hidden',
    position: 'relative',
    marginBottom: '1.5rem',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
  errorBox: {
    padding: '0.85rem',
    backgroundColor: '#ffebee',
    color: '#c62828',
    borderRadius: '8px',
    textAlign: 'center',
    marginBottom: '1.25rem',
    fontSize: '1.05rem',
  },
  loading: {
    textAlign: 'center',
    padding: '0.85rem',
    color: '#2980b9',
    fontWeight: 'bold',
    fontSize: '1.1rem',
  },
  resultCard: {
    backgroundColor: '#e8f4fc',
    border: '1px solid #3498db',
    borderRadius: '10px',
    padding: '1.5rem',
    marginTop: '1.5rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
};
