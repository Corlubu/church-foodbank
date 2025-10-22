import { useState, useEffect } from 'react';
import { staffAPI } from '../services/api'; // ✅ Refined Import

export default function ManualCitizenForm({ onBack }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    food_window_id: ''
  });
  const [windows, setWindows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');

  // Fetch active food windows on mount
  useEffect(() => {
    const fetchWindows = async () => {
      try {
        // ✅ Use structured staffAPI call
        const res = await staffAPI.getActiveFoodWindows(); 
        setWindows(res.map(w => ({ 
            ...w, 
            remaining: w.available_bags - w.used_bags 
        })));
        if (res.length > 0) {
            setFormData(prev => ({ ...prev, food_window_id: res[0].id }));
        }
      } catch (err) {
        setError('Failed to load active food windows.');
        console.error('Window fetch error:', err);
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
    setSubmitting(true);

    try {
      // ✅ Use structured staffAPI call
      const response = await staffAPI.manualRegisterCitizen(formData); 
      setSuccess(true);
      setOrderNumber(response.orderNumber);
      
      // Reset form and refresh windows to update counts
      setFormData({ name: '', phone: '', email: '', food_window_id: formData.food_window_id });
      
      const res = await staffAPI.getActiveFoodWindows();
      setWindows(res.map(w => ({ 
          ...w, 
          remaining: w.available_bags - w.used_bags 
      })));
      
    } catch (err) {
      setError(err.message || 'Manual registration failed.');
      console.error('Registration error:', err);
    } finally {
      setSubmitting(false);
    }
  };
  
  // ... (JSX render logic remains the same)
  if (loading) return <div style={styles.center}>Loading active windows...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Manual Citizen Registration</h2>
        <p style={styles.subtitle}>Staff only: Registering a walk-in or phone request.</p>

        {error && <div style={styles.error}>Error: {error}</div>}
        {success && <div style={styles.success}>✅ Citizen registered successfully! Order: <strong>{orderNumber}</strong></div>}

        {windows.length === 0 ? (
          <div style={styles.noWindows}>No active food windows available for registration.</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={styles.formGroup}>
              <label htmlFor="window" style={styles.label}>Select Food Window</label>
              <select
                id="window"
                value={formData.food_window_id}
                onChange={e => setFormData({...formData, food_window_id: e.target.value})}
                style={styles.select}
                required
                disabled={submitting}
              >
                {windows.map(w => (
                  <option key={w.id} value={w.id} disabled={w.remaining <= 0}>
                    {new Date(w.start_time).toLocaleString()} - ({w.remaining} bags left)
                  </option>
                ))}
              </select>
              <small style={styles.smallText}>Bags Available: {windows.find(w => w.id === formData.food_window_id)?.remaining || 0}</small>
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="name" style={styles.label}>Full Name</label>
              <input
                id="name"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                style={styles.input}
                required
                disabled={submitting}
              />
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="phone" style={styles.label}>Phone (e.g., +15551234567)</label>
              <input
                id="phone"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                style={styles.input}
                required
                disabled={submitting}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label htmlFor="email" style={styles.label}>Email (Optional)</label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                style={styles.input}
                disabled={submitting}
              />
            </div>

            <div style={styles.buttonGroup}>
              <button 
                type="submit" 
                style={submitting ? styles.buttonDisabled : styles.primaryButton}
                disabled={submitting || !formData.food_window_id}
              >
                {submitting ? 'Registering...' : 'Register Citizen'}
              </button>
              <button 
                type="button" 
                onClick={onBack} 
                style={styles.secondaryButton}
                disabled={submitting}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const styles = {
    // Styles omitted for brevity but remain structurally sound.
};
