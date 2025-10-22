// frontend/src/components/ReportTable.jsx
import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api'; // ✅ Refined Import

export default function ReportTable() {
  const [citizens, setCitizens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingExport, setLoadingExport] = useState(false);
  const [windows, setWindows] = useState([]);
  const [selectedWindowId, setSelectedWindowId] = useState('');

  // Combined fetch for windows and report
  useEffect(() => {
    fetchWindows();
  }, []);

  useEffect(() => {
    if (selectedWindowId) {
      fetchReport(selectedWindowId, currentPage);
    }
  }, [currentPage, selectedWindowId]);

  const fetchWindows = async () => {
    try {
      const windowRes = await adminAPI.getAllFoodWindows();
      setWindows(windowRes);
      // Automatically select the first window or a default 'all' option
      if (windowRes.length > 0) {
        setSelectedWindowId(windowRes[0].id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      setError('Failed to load food windows for report filtering.');
      console.error('Window fetch error:', err);
      setLoading(false);
    }
  };

  const fetchReport = async (windowId, page) => {
    setLoading(true);
    setError('');
    try {
      // NOTE: Assuming your backend has an endpoint for paginated reports like:
      // router.get('/admin/citizens', ...
      const res = await adminAPI.getCitizenReports(windowId, page); 
      setCitizens(res.citizens || []);
      setTotalPages(res.pagination?.pages || 1);
    } catch (err) {
      setError(err.message || 'Failed to load report data.');
      console.error('Report fetch error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleExport = async () => {
    setLoadingExport(true);
    setError('');
    try {
      // ✅ Use structured adminAPI call, pass filter ID
      const blob = await adminAPI.downloadReport(selectedWindowId); 
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const windowName = windows.find(w => w.id === selectedWindowId)?.id || 'All';
      a.download = `foodbank_report_window_${windowName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (err) {
      setError(err.message || 'Failed to export report to Excel.');
      console.error('Export error:', err);
    } finally {
      setLoadingExport(false);
    }
  };
  
  const formatDate = (isoString) => isoString ? new Date(isoString).toLocaleString() : 'N/A';

  if (loading && !citizens.length) return <div style={styles.center}><LoadingSpinner message="Loading report..." /></div>;

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Citizen Reports</h2>
      
      {/* Controls: Filter and Export */}
      <div style={styles.controls}>
          <div style={styles.filterGroup}>
              <label htmlFor="window-filter" style={{marginRight: '1rem'}}>Filter by Window:</label>
              <select
                  id="window-filter"
                  value={selectedWindowId}
                  onChange={e => {
                      setSelectedWindowId(e.target.value);
                      setCurrentPage(1); // Reset page on filter change
                  }}
                  style={styles.select}
                  disabled={loading}
              >
                  {/* Assuming 'All' filter is supported by the backend, otherwise skip */}
                  <option value="">All Windows</option>
                  {windows.map(w => (
                      <option key={w.id} value={w.id}>
                          Window #{w.id} ({formatDate(w.start_time).split(',')[0]} - {w.available_bags} bags)
                      </option>
                  ))}
              </select>
          </div>
          
          <button 
              onClick={handleExport} 
              style={loadingExport ? styles.exportButtonDisabled : styles.exportButton}
              disabled={loadingExport || citizens.length === 0}
          >
              {loadingExport ? 'Exporting...' : 'Export to Excel'}
          </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}
      
      {citizens.length === 0 && !loading && <div style={styles.noData}>No citizen data found for the selected filter.</div>}

      {citizens.length > 0 && (
        <>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Order #</th>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Phone</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Submitted At</th>
                  <th style={styles.th}>Window ID</th>
                  <th style={styles.th}>Pickup Confirmed</th>
                </tr>
              </thead>
              <tbody>
                {citizens.map((citizen) => (
                  <tr key={citizen.id} style={styles.tr}>
                    <td style={styles.td}>{citizen.order_number}</td>
                    <td style={styles.td}>{citizen.name}</td>
                    <td style={styles.td}>{citizen.phone}</td>
                    <td style={styles.td}>{citizen.email || 'N/A'}</td>
                    <td style={styles.td}>{formatDate(citizen.submitted_at)}</td>
                    <td style={styles.td}>{citizen.food_window_id}</td>
                    <td style={styles.td}>{citizen.pickup_confirmed ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          <div style={styles.pagination}>
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1 || loading}
            >
              Previous
            </button>
            <span style={{ margin: '0 1rem' }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || loading}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
// Styles omitted for brevity but remain structurally sound.
