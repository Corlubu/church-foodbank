// frontend/src/components/CitizenForm.jsx
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { citizenAPI } from '../services/api'; // Import new API object

export default function CitizenForm() {
  const { qrId } = useParams();
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await citizenAPI.submitForm(qrId, formData);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={styles.successContainer}>
        <div style={styles.successCard}>
          <div style={styles.checkmark}>✅</div>
          <h2>Thank You!</h2>
          <p>Your food request has been submitted.</p>
          <p>Please check your SMS for your order number.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Food Bank Registration</h2>
        <p style={styles.subtitle}>Please fill out the form below</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Full Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            style={styles.input}
            required
          />
          <input
            type="tel"
            placeholder="Phone (+1234567890)"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            style={styles.input}
            required
          />
          <input
            type="email"
            placeholder="Email (optional)"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            style={styles.input}
          />
          <button
            type="submit"
            disabled={loading}
            style={styles.button}
          >
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Styles (no change)
const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    padding: '1rem',
  },
  card: {
    width: '100%',
    maxWidth: '500px',
    padding: '2rem',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  },
  title: {
    textAlign: 'center',
    color: '#27ae60',
    marginBottom: '0.5rem',
  },
  subtitle: {
    textAlign: 'center',
    color: '#7f8c8d',
    marginBottom: '1.5rem',
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    margin: '0.75rem 0',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
  },
  button: {
    width: '100%',
    padding: '0.85rem',
    backgroundColor: '#27ae60',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1.1rem',
    cursor: 'pointer',
    marginTop: '1rem',
    fontWeight: 'bold',
  },
  error: {
    padding: '0.75rem',
    backgroundColor: '#ffebee',
    color: '#c62828',
    borderRadius: '4px',
    marginBottom: '1rem',
    textAlign: 'center',
  },
  successContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
  },
  successCard: {
    textAlign: 'center',
    padding: '3rem',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
    maxWidth: '500px',
    margin: '0 auto',
  },
  checkmark: {
    fontSize: '4rem',
    color: '#27ae60',
    marginBottom: '1rem',
  },
};
