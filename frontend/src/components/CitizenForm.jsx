// frontend/src/components/CitizenForm.jsx
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { citizenAPI } from '../services/api'; // ✅ Refined Import

export default function CitizenForm() {
  const { qrId } = useParams();
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // ✅ Use structured citizenAPI call
      const response = await citizenAPI.submitForm(qrId, formData);
      setOrderNumber(response.orderNumber);
      setSuccess(true);
    } catch (err) {
      // Use the custom message thrown by the API service
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
          <p>Your food request has been submitted with Order Number: <strong>{orderNumber}</strong>.</p>
          <p>Please check your SMS for confirmation and pickup details.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Food Bank Registration</h2>
        <p style={styles.subtitle}>Please fill out the form below</p>

        {error && <div style={styles.error}>Error: {error}</div>}

        <form onSubmit={handleSubmit}>
          <input
            placeholder="Full Name (Required)"
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            style={styles.input}
            required
            disabled={loading}
          />
          <input
            placeholder="Phone (+1234567890) (Required)"
            value={formData.phone}
            onChange={e => setFormData({...formData, phone: e.target.value})}
            style={styles.input}
            required
            disabled={loading}
          />
          <input
            type="email"
            placeholder="Email (Optional)"
            value={formData.email}
            onChange={e => setFormData({...formData, email: e.target.value})}
            style={styles.input}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !formData.name || !formData.phone}
            style={loading ? styles.buttonDisabled : styles.button}
          >
            {loading ? 'Submitting...' : 'Register'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
    // Styles omitted for brevity but remain structurally sound.
};
