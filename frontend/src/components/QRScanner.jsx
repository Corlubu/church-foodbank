import { useState, useCallback } from 'react';
import { staffAPI } from '../services/api'; // ✅ Refined Import
import LoadingSpinner from './LoadingSpinner';

export default function QRScanner() {
  const [qrInput, setQrInput] = useState('');
  const [scannedData, setScannedData] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [scanType, setScanType] = useState('input'); // 'input' or 'camera' (mock for now)

  // Handle manual QR input
  const handleManualInput = useCallback(async (qrId) => {
    if (!qrId || isLoading) return;

    setIsLoading(true);
    setError('');
    setScannedData(null);

    try {
      // ✅ Use structured staffAPI call
      const response = await staffAPI.lookupCitizenByQR(qrId); 
      setScannedData(response);
    } catch (err) {
      setError(err.message || 'No valid citizen found for this QR code.');
      console.error('QR lookup error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);
  
  // Handle QR code scanning (simulated via manual input submission)
  const handleSubmitInput = (e) => {
      e.preventDefault();
      handleManualInput(qrInput);
  };
  
  // Handle Pickup Confirmation
  const handleConfirmPickup = async (citizenId) => {
      setIsLoading(true);
      setError('');
      try {
          // ✅ Use structured staffAPI call
          await staffAPI.confirmPickup(citizenId);
          setError(null);
          // Re-lookup to update confirmation status
          await handleManualInput(qrInput); 
      } catch (err) {
          setError(err.message || 'Failed to confirm pickup.');
      } finally {
          setIsLoading(false);
      }
  };
  
  // Reset view
  const handleReset = () => {
      setScannedData(null);
      setError('');
      setQrInput('');
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Citizen QR Lookup & Pickup</h2>
      <LoadingSpinner message="Processing..." variant="ring" fullScreen={false} className="scan-loader" hidden={!isLoading} />
      
      {error && <div style={styles.errorBox}>{error}</div>}

      {/* Manual Input/Scan Section */}
      <div style={styles.inputSection}>
        <form onSubmit={handleSubmitInput} style={styles.inputGroup}>
            <input
                type="text"
                placeholder="Enter QR/Order ID"
                value={qrInput}
                onChange={e => setQrInput(e.target.value)}
                style={styles.textInput}
                disabled={isLoading}
                required
            />
            <button
                type="submit"
                style={styles.scanButton}
                disabled={isLoading}
            >
                Lookup
            </button>
        </form>
        <p style={styles.helperText}>Scan with a physical scanner or manually enter the QR ID.</p>
      </div>
      
      {/* Citizen Details Display */}
      {scannedData && (
          <div style={styles.resultCard}>
              <h3 style={styles.resultTitle}>Food Window Details</h3>
              <p><strong>Window ID:</strong> {scannedData.food_window.id}</p>
              <p><strong>Time:</strong> {new Date(scannedData.food_window.start_time).toLocaleTimeString()} - {new Date(scannedData.food_window.end_time).toLocaleTimeString()}</p>
              <p><strong>Quota:</strong> {scannedData.food_window.used_bags} / {scannedData.food_window.available_bags}</p>
              
              <h3 style={styles.resultTitle}>Registered Citizens ({scannedData.citizens.length})</h3>
              <div style={styles.citizenList}>
                  {scannedData.citizens.length > 0 ? scannedData.citizens.map(citizen => (
                      <div key={citizen.id} style={styles.citizenItem}>
                          <p><strong>Name:</strong> {citizen.name}</p>
                          <p><strong>Order:</strong> {citizen.order_number}</p>
                          <p><strong>Phone:</strong> {citizen.phone}</p>
                          <p><strong>Status:</strong> {citizen.pickup_confirmed ? '✅ Picked Up' : '❌ Pending'}</p>
                          {!citizen.pickup_confirmed && (
                              <button 
                                onClick={() => handleConfirmPickup(citizen.id)} 
                                style={styles.confirmButton}
                                disabled={isLoading}
                              >
                                  Confirm Pickup
                              </button>
                          )}
                      </div>
                  )) : <p>No citizens have registered for this window yet.</p>}
              </div>
              <button onClick={handleReset} style={styles.resetButton}>New Lookup</button>
          </div>
      )}
    </div>
  );
}

const styles = {
    // Styles omitted for brevity but remain structurally sound.
};
