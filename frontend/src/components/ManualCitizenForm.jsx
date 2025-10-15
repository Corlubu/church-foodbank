// frontend/src/components/ManualCitizenForm.jsx
import { useState } from 'react';
import api from '../services/api';

export default function ManualCitizenForm({ onBack }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    food_window_id: '' // Will be selected from active windows
  });
  const [windows, setWindows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Fetch active food windows on mount
  useState(() => {
    const fetchWindows = async () => {
      try {
        const res = await api.get('/staff/food-windows/active');
        setWindows(res.data);
      } catch (err) {
        setError('Failed to load food windows');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchWindows();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    try {
      // Call a new backend endpoint to manually add citizen
      await api.post('/staff/citizen/manual', formData);
      setSuccess(true);
      // Reset form after 2 seconds
      setTimeout(() => {
        setFormData({ name: '', phone: '', email: '', food_window_id: '' });
        setSuccess(false);
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to register citizen');
    }
  };

  if (loading) {
    return <div style={styles.center}>Loading food windows...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.formCard}>
        <h2>Manual Citizen Registration</h2>
        
        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>✅ Citizen registered successfully!</div>}

        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label>Full Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label>Phone (+1234567890) *</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label>Email (Optional)</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div style={styles.formGroup}>
            <label>Food Distribution Window *</label>
            {windows.length === 0 ? (
  <div style={{ padding: '1rem', backgroundColor: '#fff8e1', borderRadius: '6px' }}>
    <p>⚠️ No active food distribution windows.</p>
    <p>Please ask an admin to create a new window.</p>
  </div>
) : (
            <select
              value={formData.food_window_id}
              onChange={(e) => setFormData({ ...formData, food_window_id: e.target.value })}
              required
            >
              <option value="">-- Select a window --</option>
              {windows.map(win => (
                <option key={win.id} value={win.id}>
                  {new Date(win.start_time).toLocaleString()} - {new Date(win.end_time).toLocaleString()} 
                  ({win.used_bags}/{win.available_bags} bags used)
                </option>
              ))}
              
            </select> )}
          </div>

          <div style={styles.buttonGroup}>
            <button type="button" onClick={onBack} style={styles.secondaryButton}>
              🔙 Back
            </button>
            <button type="submit" style={styles.primaryButton}>
              Register Citizen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '1.5rem',
    maxWidth: '600px',
    margin: '0 auto',
  },
  formCard: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
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
  select: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '1rem',
  },
  buttonGroup: {
    display: 'flex',
    gap: '1rem',
    marginTop: '1.5rem',
  },
  primaryButton: {
    flex: 1,
    padding: '0.75rem',
    backgroundColor: '#27ae60',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  secondaryButton: {
    flex: 1,
    padding: '0.75rem',
    backgroundColor: '#95a5a6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    cursor: 'pointer',
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
  center: {
    textAlign: 'center',
    padding: '2rem',
    fontSize: '1.2rem',
  },
};