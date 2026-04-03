require('dotenv').config();

const express = require('express');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Shared pool (created once on startup)
const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;

// Create tasks table on startup if DATABASE_URL is available
async function initDb() {
  if (!pool) {
    console.warn('DATABASE_URL is not set — skipping table initialisation');
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id          SERIAL PRIMARY KEY,
      title       TEXT        NOT NULL,
      description TEXT,
      created_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMP   NOT NULL DEFAULT NOW()
    )
  `);
  console.log('Tasks table ready');
}

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Database connection test endpoint
app.get('/db', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ status: 'error', message: 'DATABASE_URL is not set' });
  }

  try {
    const result = await pool.query('SELECT NOW() AS time');
    res.json({ status: 'ok', time: result.rows[0].time });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ── Tasks API ────────────────────────────────────────────────────────────────

// POST /tasks — create a task
app.post('/tasks', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ status: 'error', message: 'DATABASE_URL is not set' });
  }

  const { title, description } = req.body;

  if (!title) {
    return res.status(400).json({ status: 'error', message: 'title is required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO tasks (title, description)
       VALUES ($1, $2)
       RETURNING *`,
      [title, description ?? null]
    );
    res.status(201).json({ status: 'ok', task: result.rows[0] });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// GET /tasks — list all tasks
app.get('/tasks', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ status: 'error', message: 'DATABASE_URL is not set' });
  }

  try {
    const result = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC');
    res.json({ status: 'ok', tasks: result.rows });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// GET /tasks/:id — get a single task
app.get('/tasks/:id', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ status: 'error', message: 'DATABASE_URL is not set' });
  }

  try {
    const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Task not found' });
    }
    res.json({ status: 'ok', task: result.rows[0] });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// PUT /tasks/:id — update a task
app.put('/tasks/:id', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ status: 'error', message: 'DATABASE_URL is not set' });
  }

  const { title, description } = req.body;

  if (!title) {
    return res.status(400).json({ status: 'error', message: 'title is required' });
  }

  try {
    const result = await pool.query(
      `UPDATE tasks
       SET title = $1, description = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [title, description ?? null, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Task not found' });
    }
    res.json({ status: 'ok', task: result.rows[0] });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// DELETE /tasks/:id — delete a task
app.delete('/tasks/:id', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ status: 'error', message: 'DATABASE_URL is not set' });
  }

  try {
    const result = await pool.query(
      'DELETE FROM tasks WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Task not found' });
    }
    res.json({ status: 'ok', task: result.rows[0] });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});
// A simple route to test if our variables are working
app.get('/test-env', (req, res) => {
    const version = process.env.APP_VERSION;
    if (!version) {
        console.error("ERROR: APP_VERSION is missing from Railway Variables!");
        return res.status(500).send("Error: App configuration is incomplete.");
    }
    res.send(`App is running Version: ${version}`);
});
// ── Start ────────────────────────────────────────────────────────────────────

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialise database:', err.message);
    process.exit(1);
  });
