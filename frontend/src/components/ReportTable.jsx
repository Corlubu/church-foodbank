// frontend/src/components/ReportTable.jsx
import { useState, useEffect } from 'react';
import api from '../services/api';

export default function ReportTable() {
  const [citizens, setCitizens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchReport();
  }, [currentPage]);

  const fetchReport = async () => {
    try {
      const res = await api.get(`/admin/citizens?page=${currentPage}&limit=50`);
      setCitizens(res.data.citizens || []);
      setTotalPages(res.data.pagination?.pages || 1);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load report');
      console.error('Report fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/admin/export/excel', {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `foodbank_report_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Failed to export Excel file');
      console.error('Export error:', err);
    }
  };

  if (loading) {
    return (
      <div style={styles.center}>
        <div>Loading report...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ ...styles.center, color: '#c62828' }}>
        {error}
        <button onClick={fetchReport} style={styles.retryButton}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Food Bank Report</h2>
        <button onClick={handleExport} style={styles.exportButton}>
          📥 Export to Excel
        </button>
      </div>

      {citizens.length === 0 ? (
        <div style={styles.noData}>
          <p>No registrations found.</p>
        </div>
      ) : (
        <>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Phone</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Order #</th>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {citizens.map((citizen) => (
                  <tr key={citizen.id} style={styles.tr}>
                    <td style={styles.td}>{citizen.name}</td>
                    <td style={styles.td}>{citizen.phone}</td>
                    <td style={styles.td}>{citizen.email || '—'}</td>
                    <td style={styles.td}>{citizen.order_number}</td>
                    <td style={styles.td}>{new Date(citizen.submitted_at).toLocaleDateString()}</td>
                    <td style={styles.td}>
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={styles.pagination}>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                style={styles.pageButton}
              >
                Previous
              </button>
              <span style={styles.pageInfo}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                style={styles.pageButton}
              >
                Next
              </button>
            </div>
          )}
        </>
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
    padding: '0.75rem 1.5rem',
    backgroundColor: '#27ae60',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 'bold',
  },
  retryButton: {
    marginLeft: '1rem',
    padding: '0.5rem 1rem',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  tableContainer: {
    overflowX: 'auto',
    borderRadius: '8px',
    border: '1px solid #ddd',
    marginBottom: '1rem',
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
    fontWeight: 'bold',
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
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '1rem',
    marginTop: '1rem',
  },
  pageButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  pageInfo: {
    fontWeight: 'bold',
    color: '#2c3e50',
  },
};
