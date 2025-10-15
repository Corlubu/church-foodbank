// frontend/src/components/ReportTable.jsx
import { useState, useEffect } from 'react';
import api from '../services/api';

export default function ReportTable() {
  const [citizens, setCitizens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      const res = await api.get('/admin/citizens?page=1&limit=1000');
      setCitizens(res.data.citizens || []);
    } catch (err) {
      setError('Failed to load report');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/admin/export/excel', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'foodbank_report.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Failed to export Excel file');
      console.error(err);
    }
  };

  if (loading) return <div style={styles.center}>Loading report...</div>;
  if (error) return <div style={{ ...styles.center, color: 'red' }}>{error}</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Food Bank Report</h2>
        <button onClick={handleExport} style={styles.exportButton}>
          📥 Export to Excel
        </button>
      </div>

      {citizens.length === 0 ? (
        <p style={styles.noData}>No registrations found.</p>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Order #</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {citizens.map((citizen) => (
                <tr key={citizen.id}>
                  <td>{citizen.name}</td>
                  <td>{citizen.phone}</td>
                  <td>{citizen.email || '—'}</td>
                  <td>{citizen.order_number}</td>
                  <td>{new Date(citizen.submitted_at).toLocaleDateString()}</td>
                  <td>
                    <span style={{
                      color: citizen.pickup_confirmed ? '#27ae60' : '#e74c3c',
                      fontWeight: 'bold'
                    }}>
                      {citizen.pickup_confirmed ? 'Picked Up' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '1.5rem',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  center: {
    textAlign: 'center',
    padding: '2rem',
    fontSize: '1.2rem',
  },
  noData: {
    textAlign: 'center',
    padding: '2rem',
    color: '#7f8c8d',
  },
  exportButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#27ae60',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 'bold',
  },
  tableContainer: {
    overflowX: 'auto',
    borderRadius: '8px',
    border: '1px solid #ddd',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '800px',
  },
  th: {
    backgroundColor: '#3498db',
    color: 'white',
    padding: '1rem',
    textAlign: 'left',
  },
  td: {
    padding: '0.75rem',
    borderBottom: '1px solid #eee',
  },
  tr: {
    '&:hover': {
      backgroundColor: '#f9f9f9',
    },
  },
};