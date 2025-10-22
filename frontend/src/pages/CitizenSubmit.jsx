import { useState } from 'react';
import { useParams } from 'react-router-dom';
// Import only the specific API group
import { citizenAPI } from '../services/api'; 

export default function CitizenSubmit() {
  const { qrId } = useParams();
  const [data, setData] = useState({ name: '', phone: '', email: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      // Use the structured API call
      await citizenAPI.submitForm(qrId, data); 
      setSuccess(true);
    } catch (err) {
      // Use the error message thrown by the API service
      setError(err.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) return (
    <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#e8f5e9', borderRadius: '8px' }}>
      <h2 style={{ color: '#4caf50' }}>✅ Registration Successful!</h2>
      <p>Thank you! Check your SMS for your order number and pickup details.</p>
    </div>
  );

  return (
    <div style={{ maxWidth: '500px', margin: '2rem auto', padding: '1.5rem', border: '1px solid #ccc', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
      <h2 style={{ textAlign: 'center', color: '#3498db' }}>Food Bank Registration</h2>
      <p style={{ textAlign: 'center', color: '#777', marginBottom: '1.5rem' }}>Please enter your details to reserve your food bag.</p>
      
      {error && <p style={{ color: 'white', backgroundColor: '#e74c3c', padding: '0.75rem', borderRadius: '4px', textAlign: 'center' }}>Error: {error}</p>}
      
      <form onSubmit={handleSubmit}>
        <input
          required
          placeholder="Full Name"
          value={data.name}
          onChange={e => setData({...data, name: e.target.value})}
          disabled={loading}
          style={styles.input}
        />
        <input
          required
          placeholder="Phone (+1234567890)"
          value={data.phone}
          onChange={e => setData({...data, phone: e.target.value})}
          disabled={loading}
          style={styles.input}
        />
        <input
          type="email"
          placeholder="Email (optional)"
          value={data.email}
          onChange={e => setData({...data, email: e.target.value})}
          disabled={loading}
          style={styles.input}
        />
        <button
          type="submit"
          disabled={loading}
          style={loading ? styles.buttonDisabled : styles.button}
        >
          {loading ? 'Submitting...' : 'Register'}
        </button>
        {loading && <p style={{ textAlign: 'center', marginTop: '1rem', color: '#3498db' }}>Processing your request...</p>}
      </form>
    </div>
  );
}

const styles = {
    input: {
        width: '100%',
        padding: '0.75rem',
        margin: '0.5rem 0 1rem 0',
        border: '1px solid #ddd',
        borderRadius: '4px',
        boxSizing: 'border-box',
        fontSize: '1rem',
    },
    button: {
        width: '100%',
        padding: '1rem',
        backgroundColor: '#3498db',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '1.1rem',
        fontWeight: 'bold',
        transition: 'background-color 0.3s',
    },
    buttonDisabled: {
        width: '100%',
        padding: '1rem',
        backgroundColor: '#95a5a6',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        fontSize: '1.1rem',
        fontWeight: 'bold',
        cursor: 'not-allowed',
    }
};
