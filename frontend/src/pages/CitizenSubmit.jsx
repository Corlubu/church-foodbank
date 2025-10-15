import { useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

export default function CitizenSubmit() {
  const { qrId } = useParams();
  const [data, setData] = useState({ name: '', phone: '', email: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/citizen/submit/${qrId}`, data);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Submission failed');
    }
  };

  if (success) return <div style={{ padding: '2rem', textAlign: 'center' }}>✅ Thank you! Check your SMS for your order number.</div>;

  return (
    <div style={{ maxWidth: '500px', margin: '2rem auto', padding: '1rem' }}>
      <h2>Food Bank Registration</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <input
          required
          placeholder="Full Name"
          value={data.name}
          onChange={e => setData({...data, name: e.target.value})}
          style={{ width: '100%', padding: '0.5rem', margin: '0.5rem 0' }}
        />
        <input
          required
          placeholder="Phone (+1234567890)"
          value={data.phone}
          onChange={e => setData({...data, phone: e.target.value})}
          style={{ width: '100%', padding: '0.5rem', margin: '0.5rem 0' }}
        />
        <input
          type="email"
          placeholder="Email (optional)"
          value={data.email}
          onChange={e => setData({...data, email: e.target.value})}
          style={{ width: '100%', padding: '0.5rem', margin: '0.5rem 0' }}
        />
        <button
          type="submit"
          style={{ width: '100%', padding: '0.75rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Submit Request
        </button>
      </form>
    </div>
  );
}
