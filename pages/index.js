import { useState, useEffect } from 'react';

export default function Dashboard() {
  const [allData, setAllData] = useState([]);
  const [displayData, setDisplayData] = useState([]);
  const [latestData, setLatestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  
  // System logs
  const [systemLogs, setSystemLogs] = useState({ success: [], error: [] });
  const [showLogs, setShowLogs] = useState(false);
  const [logLoading, setLogLoading] = useState(false);
  
  // Filter states
  const [filterDate, setFilterDate] = useState('');
  const [filterStartTime, setFilterStartTime] = useState('');
  const [filterEndTime, setFilterEndTime] = useState('');

  // GANTI DENGAN SPREADSHEET ID ANDA
  const SPREADSHEET_ID = '1yS76TOxi8-37w-FSTtAVpu7IXma_-m2yPUYpN97MMlw';
  const SHEET_NAME = 'Sheet1';
  
  // GANTI DENGAN URL VERCEL ANDA SETELAH DEPLOY
const VERCEL_API = 'https://dht22dho.vercel.app/api/sensor';

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Refresh setiap 5 detik
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    applyFilters();
  }, [allData, filterDate, filterStartTime, filterEndTime]);

  const parseDate = (dateStr) => {
    if (!dateStr || dateStr === '-') return null;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const year = parseInt(parts[2]);
      return new Date(year, month, day);
    }
    return null;
  };

  const parseTime = (timeStr) => {
    if (!timeStr || timeStr === '-') return null;
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
      const hours = parseInt(parts[0]);
      const minutes = parseInt(parts[1]);
      const seconds = parts.length > 2 ? parseInt(parts[2]) : 0;
      return hours * 3600 + minutes * 60 + seconds;
    }
    return null;
  };

  const applyFilters = () => {
    let filtered = [...allData];

    if (filterDate) {
      filtered = filtered.filter(row => {
        const rowDate = parseDate(row.tanggal);
        const filterDateObj = new Date(filterDate);
        
        if (!rowDate) return false;
        
        return rowDate.getDate() === filterDateObj.getDate() &&
               rowDate.getMonth() === filterDateObj.getMonth() &&
               rowDate.getFullYear() === filterDateObj.getFullYear();
      });
    }

    if (filterStartTime || filterEndTime) {
      filtered = filtered.filter(row => {
        const rowTime = parseTime(row.waktu);
        if (rowTime === null) return false;

        const startSeconds = filterStartTime ? parseTime(filterStartTime + ':00') : 0;
        const endSeconds = filterEndTime ? parseTime(filterEndTime + ':59') : 86399;

        return rowTime >= startSeconds && rowTime <= endSeconds;
      });
    }

    const limitedData = filtered.slice(0, 10);
    setDisplayData(limitedData);
  };

  const clearFilters = () => {
    setFilterDate('');
    setFilterStartTime('');
    setFilterEndTime('');
  };

  const fetchSystemLogs = async () => {
    try {
      setLogLoading(true);
      const response = await fetch(`${VERCEL_API}?action=logs`);
      const data = await response.json();
      
      if (data.success && data.logs) {
        setSystemLogs(data.logs);
      }
      setLogLoading(false);
    } catch (err) {
      console.error('Error fetching logs:', err);
      setLogLoading(false);
    }
  };

  const toggleLogs = () => {
    if (!showLogs) {
      fetchSystemLogs();
    }
    setShowLogs(!showLogs);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}`;
      
      const response = await fetch(url);
      const text = await response.text();
      const json = JSON.parse(text.substring(47).slice(0, -2));
      
      if (json.table.rows && json.table.rows.length > 0) {
        const formattedData = json.table.rows.slice(1).reverse().map((row, index) => {
          // Mapping Sheet1: A=Tanggal, B=Waktu, C=Suhu, D=Kelembapan, E=IP, F=RSSI
          const dateCell = row.c[0];
          const timeCell = row.c[1];
          const tempCell = row.c[2];
          const humidCell = row.c[3];
          const ipCell = row.c[4];
          const rssiCell = row.c[5];
          
          return {
            id: index,
            tanggal: dateCell ? (dateCell.f || dateCell.v || '-') : '-',
            waktu: timeCell ? (timeCell.f || timeCell.v || '-') : '-',
            suhu: tempCell?.v || '-',
            kelembapan: humidCell?.v || '-',
            ip: ipCell?.v || '-',
            rssi: rssiCell?.v || '-'
          };
        });
        
        setAllData(formattedData);
        setLatestData(formattedData[0] || null);
        setLastUpdate(new Date().toLocaleString('id-ID'));
      } else {
        setAllData([]);
        setLatestData(null);
      }
      
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Gagal mengambil data dari Sheet1. Pastikan spreadsheet sudah di-publish.');
      setLoading(false);
    }
  };

  const getSignalStatus = (rssi) => {
    if (rssi === '-') return { text: 'Tidak Terhubung', color: '#dc3545', icon: '📡' };
    const value = parseInt(rssi);
    if (value > -50) return { text: 'Excellent', color: '#28a745', icon: '📶' };
    if (value > -60) return { text: 'Good', color: '#28a745', icon: '📶' };
    if (value > -70) return { text: 'Fair', color: '#ffc107', icon: '📶' };
    return { text: 'Weak', color: '#fd7e14', icon: '📶' };
  };

  return (
    <div className="container">
      <div className="header">
        <h1>🌡️ Monitoring DHT22 - Kos Ridho</h1>
        <p className="subtitle">Sistem Pemantauan Suhu & Kelembapan Real-time</p>
      </div>

      {/* Status WiFi ESP32 */}
      {latestData && (
        <div className="wifi-status">
          <div className="wifi-info">
            <span className="wifi-icon">{getSignalStatus(latestData.rssi).icon}</span>
            <div>
              <div className="wifi-label">Status ESP32</div>
              <div className="wifi-value">
                {latestData.ip !== '-' ? (
                  <>
                    <span style={{color: '#28a745'}}>● Terhubung</span>
                    <span className="wifi-detail">IP: {latestData.ip}</span>
                  </>
                ) : (
                  <span style={{color: '#dc3545'}}>● Terputus</span>
                )}
              </div>
            </div>
          </div>
          <div className="wifi-signal">
            <div className="signal-label">Sinyal WiFi</div>
            <div className="signal-value" style={{color: getSignalStatus(latestData.rssi).color}}>
              {latestData.rssi !== '-' ? `${latestData.rssi} dBm` : 'N/A'}
              <span className="signal-status">{getSignalStatus(latestData.rssi).text}</span>
            </div>
          </div>
        </div>
      )}

      {/* Card Data Terkini */}
      <div className="current-data">
        <h2>📊 Data Terkini (Update Setiap 5 Detik)</h2>
        {latestData ? (
          <div className="cards">
            <div className="card temperature">
              <div className="card-icon">🌡️</div>
              <div className="card-content">
                <div className="card-label">Suhu</div>
                <div className="card-value">{latestData.suhu}°C</div>
              </div>
            </div>
            
            <div className="card humidity">
              <div className="card-icon">💧</div>
              <div className="card-content">
                <div className="card-label">Kelembapan</div>
                <div className="card-value">{latestData.kelembapan}%</div>
              </div>
            </div>
            
            <div className="card time">
              <div className="card-icon">🕐</div>
              <div className="card-content">
                <div className="card-label">Waktu Update</div>
                <div className="card-value small">{latestData.waktu}</div>
                <div className="card-date">{latestData.tanggal}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="no-data-card">
            <p>⏳ Menunggu data dari sensor DHT22...</p>
          </div>
        )}
      </div>

      {/* Filter Section */}
      <div className="filter-section">
        <div className="filter-header">
          <h3>🔍 Filter Data</h3>
          <button onClick={toggleLogs} className="log-btn">
            {showLogs ? '❌ Tutup Log' : '📋 Lihat System Log'}
          </button>
        </div>
        <div className="filter-controls">
          <div className="filter-group">
            <label>Tanggal:</label>
            <input 
              type="date" 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="filter-input"
            />
          </div>
          
          <div className="filter-group">
            <label>Waktu Mulai:</label>
            <input 
              type="time" 
              value={filterStartTime}
              onChange={(e) => setFilterStartTime(e.target.value)}
              className="filter-input"
            />
          </div>
          
          <div className="filter-group">
            <label>Waktu Akhir:</label>
            <input 
              type="time" 
              value={filterEndTime}
              onChange={(e) => setFilterEndTime(e.target.value)}
              className="filter-input"
            />
          </div>
          
          <button onClick={clearFilters} className="clear-btn">
            ✖️ Hapus Filter
          </button>
        </div>
        
        {(filterDate || filterStartTime || filterEndTime) && (
          <div className="filter-info">
            📊 Menampilkan {displayData.length} dari {allData.length} data
          </div>
        )}
      </div>

      {/* System Logs */}
      {showLogs && (
        <div className="logs-section">
          <div className="logs-header">
            <h3>📋 System Logs (Real-time)</h3>
            <button onClick={fetchSystemLogs} className="refresh-log-btn" disabled={logLoading}>
              {logLoading ? '⏳ Loading...' : '🔄 Refresh Logs'}
            </button>
          </div>

          <div className="logs-stats">
            <div className="stat-item success">
              <span className="stat-icon">✅</span>
              <div>
                <div className="stat-label">Sukses</div>
                <div className="stat-value">{systemLogs.total?.success || 0}</div>
              </div>
            </div>
            <div className="stat-item error">
              <span className="stat-icon">❌</span>
              <div>
                <div className="stat-label">Error</div>
                <div className="stat-value">{systemLogs.total?.error || 0}</div>
              </div>
            </div>
          </div>

          <div className="logs-container">
            {systemLogs.error && systemLogs.error.length > 0 && (
              <div className="log-group">
                <h4>❌ Error Logs</h4>
                <div className="log-list">
                  {systemLogs.error.map((log, index) => (
                    <div key={index} className="log-item error-log">
                      <div className="log-time">{log.time}</div>
                      <div className="log-message">{log.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {systemLogs.success && systemLogs.success.length > 0 && (
              <div className="log-group">
                <h4>✅ Success Logs (20 Terbaru)</h4>
                <div className="log-list">
                  {systemLogs.success.map((log, index) => (
                    <div key={index} className="log-item success-log">
                      <div className="log-time">{log.time}</div>
                      <div className="log-message">{log.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {systemLogs.success?.length === 0 && systemLogs.error?.length === 0 && (
              <div className="no-logs">
                📝 Belum ada log. Data akan muncul saat ESP32 mengirim data.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabel Riwayat */}
      <div className="history-section">
        <div className="section-header">
          <h2>📜 10 Data Terbaru (Sheet1)</h2>
          <button onClick={fetchData} className="refresh-btn" disabled={loading}>
            {loading ? '⏳ Loading...' : '🔄 Refresh'}
          </button>
        </div>
        
        {lastUpdate && (
          <p className="last-update">Terakhir diperbarui: {lastUpdate}</p>
        )}

        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        {loading && allData.length === 0 ? (
          <div className="loading">Memuat data dari Sheet1...</div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Tanggal</th>
                  <th>Waktu</th>
                  <th>Suhu (°C)</th>
                  <th>Kelembapan (%)</th>
                  <th>IP Address</th>
                  <th>RSSI (dBm)</th>
                </tr>
              </thead>
              <tbody>
                {displayData.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="no-data">
                      {(filterDate || filterStartTime || filterEndTime) 
                        ? '🔍 Tidak ada data yang sesuai dengan filter'
                        : 'Belum ada data tersimpan di Sheet1'}
                    </td>
                  </tr>
                ) : (
                  displayData.map((row, index) => (
                    <tr key={row.id}>
                      <td>{index + 1}</td>
                      <td>{row.tanggal}</td>
                      <td>{row.waktu}</td>
                      <td className="temp-value">{row.suhu}</td>
                      <td className="humid-value">{row.kelembapan}</td>
                      <td className="ip-value">{row.ip}</td>
                      <td className="rssi-value">{row.rssi}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <footer className="footer">
        <p>💡 Dashboard refresh otomatis setiap 5 detik | Data dari Sheet1</p>
        <p className="footer-small">Spreadsheet ID: {SPREADSHEET_ID}</p>
      </footer>

      <style jsx>{`
        .container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
        }
        .header {
          text-align: center;
          color: white;
          margin-bottom: 30px;
          padding: 30px 0;
        }
        .header h1 {
          font-size: 2.5rem;
          margin: 0;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
        }
        .subtitle {
          font-size: 1.1rem;
          opacity: 0.9;
          margin-top: 10px;
        }
        .wifi-status {
          background: white;
          border-radius: 15px;
          padding: 20px 30px;
          margin-bottom: 20px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 20px;
        }
        .wifi-info {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        .wifi-icon {
          font-size: 2.5rem;
        }
        .wifi-label, .signal-label {
          font-size: 0.85rem;
          color: #666;
          margin-bottom: 5px;
        }
        .wifi-value, .signal-value {
          font-size: 1.1rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 15px;
        }
        .wifi-detail {
          font-size: 0.9rem;
          color: #666;
          font-weight: normal;
        }
        .signal-status {
          font-size: 0.85rem;
          opacity: 0.8;
        }
        .current-data, .filter-section, .logs-section, .history-section {
          background: white;
          border-radius: 15px;
          padding: 30px;
          margin-bottom: 30px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        .current-data h2 {
          margin-top: 0;
          color: #333;
          font-size: 1.5rem;
          margin-bottom: 20px;
        }
        .no-data-card {
          text-align: center;
          padding: 40px;
          color: #666;
          background: #f8f9fa;
          border-radius: 12px;
        }
        .cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
        }
        .card {
          padding: 25px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 20px;
          transition: transform 0.2s;
        }
        .card:hover {
          transform: translateY(-5px);
        }
        .card.temperature {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .card.humidity {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          color: white;
        }
        .card.time {
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
          color: white;
        }
        .card-icon {
          font-size: 3rem;
        }
        .card-content {
          flex: 1;
        }
        .card-label {
          font-size: 0.9rem;
          opacity: 0.9;
          margin-bottom: 5px;
        }
        .card-value {
          font-size: 2rem;
          font-weight: bold;
        }
        .card-value.small {
          font-size: 1.5rem;
        }
        .card-date {
          font-size: 0.9rem;
          opacity: 0.8;
          margin-top: 5px;
        }
        .filter-header, .logs-header, .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 15px;
        }
        h3, h2 {
          margin: 0;
          color: #333;
        }
        .log-btn, .refresh-log-btn, .refresh-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s;
        }
        .log-btn:hover, .refresh-log-btn:hover:not(:disabled), .refresh-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }
        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .logs-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 20px;
        }
        .stat-item {
          padding: 15px 20px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          gap: 15px;
        }
        .stat-item.success {
          background: linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%);
        }
        .stat-item.error {
          background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
        }
        .stat-icon {
          font-size: 2rem;
        }
        .stat-label {
          font-size: 0.85rem;
          color: #333;
          opacity: 0.8;
        }
        .stat-value {
          font-size: 1.8rem;
          font-weight: bold;
          color: #333;
        }
        .log-list {
          max-height: 400px;
          overflow-y: auto;
          background: #f8f9fa;
          border-radius: 8px;
          padding: 15px;
        }
        .log-item {
          padding: 12px 15px;
          margin-bottom: 10px;
          border-radius: 6px;
          border-left: 4px solid;
        }
        .success-log {
          background: #d4edda;
          border-left-color: #28a745;
        }
        .error-log {
          background: #f8d7da;
          border-left-color: #dc3545;
        }
        .log-time {
          font-size: 0.8rem;
          color: #666;
          margin-bottom: 5px;
          font-weight: 600;
        }
        .log-message {
          font-size: 0.9rem;
          color: #333;
        }
        .no-logs {
          text-align: center;
          padding: 40px;
          color: #666;
          background: #f8f9fa;
          border-radius: 8px;
        }
        .filter-controls {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          align-items: end;
        }
        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .filter-group label {
          font-size: 0.9rem;
          color: #555;
          font-weight: 600;
        }
        .filter-input {
          padding: 10px 12px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 1rem;
        }
        .filter-input:focus {
          outline: none;
          border-color: #667eea;
        }
        .clear-btn {
          background: #f5576c;
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s;
        }
        .clear-btn:hover {
          background: #e04657;
        }
        .filter-info {
          margin-top: 15px;
          padding: 12px 15px;
          background: #f0f7ff;
          border-left: 4px solid #667eea;
          border-radius: 6px;
          color: #333;
        }
        .last-update {
          color: #666;
          font-size: 0.9rem;
          margin-bottom: 20px;
        }
        .error-message {
          background: #fee;
          border: 1px solid #fcc;
          color: #c33;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        .loading {
          text-align: center;
          padding: 40px;
          color: #666;
        }
        .table-container {
          overflow-x: auto;
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
        }
        .data-table th {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 15px;
          text-align: left;
          font-weight: 600;
        }
        .data-table td {
          padding: 15px;
          border-bottom: 1px solid #eee;
        }
        .data-table tr:hover {
          background: #f8f9fa;
        }
        .temp-value {
          color: #667eea;
          font-weight: 600;
        }
        .humid-value {
          color: #f5576c;
          font-weight: 600;
        }
        .ip-value {
          color: #764ba2;
          font-size: 0.9rem;
        }
        .rssi-value {
          color: #38f9d7;
          font-weight: 600;
        }
        .no-data {
          text-align: center;
          color: #999;
          padding: 40px !important;
        }
        .footer {
          text-align: center;
          color: white;
          padding: 20px;
          opacity: 0.8;
        }
        .footer p {
          margin: 5px 0;
        }
        .footer-small {
          font-size: 0.85rem;
        }
        @media (max-width: 768px) {
          .container {
            padding: 15px;
          }
          .header h1 {
            font-size: 1.8rem;
          }
          .cards {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}