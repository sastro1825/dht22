// FILE: pages/api/sensor.js
// API endpoint untuk DHT22 - Suhu & Kelembapan

let latestData = {
  suhu: '-',
  kelembapan: '-',
  ip: '-',
  rssi: '-',
  timestamp: null,
  uptime: 0
};

// Simpan 50 log terbaru
const maxLogs = 50;
let errorLogs = [];
let successLogs = [];

export default function handler(req, res) {
  // Set CORS headers untuk ESP32
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Handle POST request dari ESP32
  if (req.method === 'POST') {
    try {
      const { suhu, kelembapan, ip, rssi, timestamp, uptime } = req.body;
      
      const now = new Date();
      const jakartaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
      
      // Update latest data
      latestData = {
        suhu: suhu || '-',
        kelembapan: kelembapan || '-',
        ip: ip || '-',
        rssi: rssi || '-',
        timestamp: timestamp || jakartaTime.toISOString(),
        uptime: uptime || 0,
        receivedAt: jakartaTime.toISOString()
      };
      
      // Log sukses
      successLogs.unshift({
        time: jakartaTime.toLocaleString('id-ID', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        message: `Data diterima: Suhu=${suhu}°C, Kelembapan=${kelembapan}%`,
        type: 'success',
        data: latestData
      });
      
      // Batasi ukuran log
      if (successLogs.length > maxLogs) {
        successLogs = successLogs.slice(0, maxLogs);
      }
      
      console.log('✅ Data received from ESP32:', latestData);
      
      res.status(200).json({
        success: true,
        message: 'Data berhasil diterima',
        data: latestData,
        serverTime: jakartaTime.toISOString()
      });
      
    } catch (error) {
      console.error('❌ Error processing data:', error);
      
      const now = new Date();
      const jakartaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
      
      // Log error
      errorLogs.unshift({
        time: jakartaTime.toLocaleString('id-ID', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        message: `Error: ${error.message}`,
        type: 'error',
        stack: error.stack
      });
      
      if (errorLogs.length > maxLogs) {
        errorLogs = errorLogs.slice(0, maxLogs);
      }
      
      res.status(500).json({
        success: false,
        message: 'Error memproses data',
        error: error.message
      });
    }
  } 
  
  // Handle GET request untuk dashboard
  else if (req.method === 'GET') {
    const { action } = req.query;
    
    const now = new Date();
    const jakartaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    
    // Endpoint untuk logs
    if (action === 'logs') {
      const dataTime = latestData.timestamp ? new Date(latestData.timestamp) : null;
      const isStale = !dataTime || (jakartaTime - dataTime) > 30000; // 30 detik
      
      res.status(200).json({
        success: true,
        latestData: latestData,
        isStale: isStale,
        logs: {
          success: successLogs.slice(0, 20), // 20 log sukses terbaru
          error: errorLogs.slice(0, 20), // 20 error terbaru
          total: {
            success: successLogs.length,
            error: errorLogs.length
          }
        },
        serverTime: jakartaTime.toISOString()
      });
    } 
    
    // Endpoint untuk data biasa
    else {
      const dataTime = latestData.timestamp ? new Date(latestData.timestamp) : null;
      const isStale = !dataTime || (jakartaTime - dataTime) > 30000;
      
      res.status(200).json({
        success: true,
        data: latestData,
        isStale: isStale,
        message: isStale ? 'Data mungkin sudah kadaluarsa (>30 detik)' : 'Data terbaru',
        serverTime: jakartaTime.toISOString()
      });
    }
  } 
  
  // Method tidak didukung
  else {
    res.status(405).json({
      success: false,
      message: 'Method tidak didukung. Gunakan GET atau POST.'
    });
  }
}