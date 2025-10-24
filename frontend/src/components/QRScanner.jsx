// frontend/src/components/CitizenLookup.jsx
import { useState, useEffect } from 'react';
import { staffAPI } from '../services/api'; // Import new API object

export default function CitizenLookup({ initialQrId = '' }) {
  const [scannedData, setScannedData] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [manualQrId, setManualQrId] = useState('');

  // When the prop from the scanner changes, trigger a lookup
  useEffect(() => {
    if (initialQrId) {
      setManualQrId(initialQrId); // Sync the input field
      handleLookup(initialQrId);
    }
  }, [initialQrId]);

  const handleLookup = async (qrId) => {
    if (!qrId || isLoading) return;

    setIsLoading(true);
    setError('');
    setScannedData(null);

    try {
      const data = await staffAPI.lookupQR(qrId);
      // The backend returns window info + list of citizens
      // We need to find the citizen associated with *this* lookup
      //
      // NOTE: The backend logic in staff.js GET /lookup/:qrId returns
      // *all* citizens in the window, not just one.
      // This is a potential bug/feature in the backend.
      // For now, we'll display the *window* info and list *all* citizens.
      
      // Let's adjust state to hold the window and the citizens array
      setScannedData(data); 

    } catch (err) {
      setError(err.message || 'No valid citizen found for this QR code.');
      console.error('QR lookup error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmPickup = async (citizenId) => {
    try {
      await staffAPI.confirmPickup(citizenId);
      // Refresh the data to show the new status
      handleLookup(manualQrId || initialQrId);
    } catch (err) {
      setError('Failed to confirm pickup');
    }
  };


  return (
    <div style={styles.container}>
      {/* Manual Input Section */}
      <div style={styles.inputSection}>
        <h3>Or Enter QR Code ID Manually</h3>
        <div style={styles.inputGroup}>
          <input
            type="text"
            placeholder="Enter QR code ID"
            value={manualQrId}
            onChange={(e) => setManualQrId(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleLookup(e.target.value);
              }
            }}
            style={styles.textInput}
          />
          <button
            onClick={() => handleLookup(manualQrId)}
            style={styles.scanButton}
            disabled={isLoading}
          >
            {isLoading ? 'Looking up...' : 'Lookup'}
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {error && <div style={styles.errorBox}>{error}</div>}
      {isLoading && (
        <div style={styles.loading}>Looking up citizen information...</div>
      )}

      {/* Citizen Data Display */}
      {scannedData && (
        <div style={styles.resultCard}>
          <h3>
            ✅ Window Found: {new Date(scannedData.food_window.start_time).toLocaleDateString()}
          </h3>
          <p>
            <strong>Status:</strong> {scannedData.food_window.used_bags} / {scannedData.food_window.available_bags} bags claimed
          </p>
          <hr style={styles.hr} />
          <h4>Registered Citizens</h4>
          {scannedData.citizens.length === 0 ? (
            <p>No citizens have registered for this window yet.</p>
          ) : (
            <ul style={styles.citizenList}>
              {scannedData.citizens.map(citizen => (
                <li key={citizen.id} style={styles.citizenItem}>
                  <div style={styles.citizenInfo}>
                    <p><strong>Name:</strong> {citizen.name}</p>
                    <p><strong>Phone:</strong> {citizen.phone}</p>
                    <p><strong>Order #:</strong> {citizen.order_number}</p>
                    <p>
                      <strong>Status:</strong>
                      <span style={{
                        color: citizen.pickup_confirmed ? '#27ae60' : '#e74c3c',
                        fontWeight: 'bold',
                        marginLeft: '0.5rem'
                      }}>
                        {citizen.pickup_confirmed ? 'Picked Up' : 'Pending'}
                      </span>
                    </p>
                  </div>
                  {!citizen.pickup_confirmed && (
                    <button
                      style={styles.confirmButton}
                      onClick={() => handleConfirmPickup(citizen.id)}
                    >
                      ✅ Confirm Pickup
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// Styles (adjusted)
const styles = {
  container: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  },
  inputSection: {
    marginBottom: '1.5rem',
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
  hr: {
    border: 'none',
    borderTop: '1px solid #bde0fe',
    margin: '1rem 0',
  },
  citizenList: {
    listStyle: 'none',
    padding: 0,
  },
  citizenItem: {
    backgroundColor: '#fff',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
  },
  citizenInfo: {
    textAlign: 'left',
  },
  citizenInfo_p: {
    margin: '0.25rem 0',
  },
  confirmButton: {
    padding: '0.75rem 1rem',
    backgroundColor: '#27ae60',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
  },
};
