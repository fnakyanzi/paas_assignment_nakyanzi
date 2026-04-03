require('dotenv').config();

const express = require('express');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Database connection test endpoint
app.get('/db', async (req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.status(503).json({ status: 'error', message: 'DATABASE_URL is not set' });
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const result = await pool.query('SELECT NOW() AS time');
    res.json({ status: 'ok', time: result.rows[0].time });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  } finally {
    await pool.end();
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
