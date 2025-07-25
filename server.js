const express = require('express');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'eve_pf',
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000,
};

const pool = mysql.createPool(dbConfig);

app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/simples/system/:mapId/:systemId', async (req, res) => {
  const { mapId, systemId } = req.params;
  
  if (!mapId || !systemId) {
    return res.status(400).json({
      error: 'Both mapId and systemId are required',
      message: 'Please provide valid mapId and systemId parameters'
    });
  }

  // Validate mapId and systemId
  const mapIdNum = parseInt(mapId, 10);
  const systemIdNum = parseInt(systemId, 10);

  if (isNaN(mapIdNum) || isNaN(systemIdNum)) {
      return res.status(400).json({ error: 'Invalid mapId or systemId format' });
  }  

  try {
    const query = `
      SELECT s.* 
      FROM \`system\` s
      INNER JOIN \`map\` m ON m.id = s.mapId
      WHERE m.mapId = ? AND s.systemId = ?
    `;
    
    const [rows] = await pool.execute(query, [mapId, systemId]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: `No system found with mapId: ${mapId} and systemId: ${systemId}`
      });
    }
    
    res.json({
      success: true,
      data: rows[0],
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve system data'
    });
  }
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'Endpoint not found'
  });
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});

app.listen(port, '0.0.0.0', () => {
  console.log(`API server running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
  console.log(`API endpoint: http://localhost:${port}/simples/system/{mapId}/{systemId}`);
});