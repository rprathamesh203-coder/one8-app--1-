const router = require('express').Router();
const pool = require('../db');
const { requireAdmin } = require('../helpers');

// GET /api/halls — list active halls (public)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, description, capacity, price, image_url
       FROM halls WHERE is_active = TRUE
       ORDER BY display_order ASC, id ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/halls failed:', err.message);
    res.status(500).json({ error: 'Failed to fetch halls.' });
  }
});

// GET /api/halls/all — every hall including inactive (admin)
router.get('/all', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM halls ORDER BY display_order ASC, id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/halls/all failed:', err.message);
    res.status(500).json({ error: 'Failed to fetch halls.' });
  }
});

// GET /api/halls/:id/availability?date=YYYY-MM-DD — time ranges already taken (public)
router.get('/:id/availability', async (req, res) => {
  const { date } = req.query;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) {
    return res.status(400).json({ error: 'date must be YYYY-MM-DD.' });
  }
  try {
    const result = await pool.query(
      `SELECT to_char(start_time, 'HH24:MI') AS start_time, to_char(end_time, 'HH24:MI') AS end_time
       FROM hall_bookings
       WHERE hall_id = $1 AND event_date = $2 AND status <> 'cancelled'
       ORDER BY start_time`,
      [req.params.id, date]
    );
    res.json({ booked: result.rows });
  } catch (err) {
    console.error('GET /api/halls/:id/availability failed:', err.message);
    res.status(500).json({ error: 'Failed to check availability.' });
  }
});

// POST /api/halls — add a hall (admin)
router.post('/', requireAdmin, async (req, res) => {
  const { name, description, capacity, price, image_url, display_order } = req.body;
  if (!name || !capacity) {
    return res.status(400).json({ error: 'name and capacity are required.' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO halls (name, description, capacity, price, image_url, display_order)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, description || null, capacity, price || 0, image_url || null, display_order || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /api/halls failed:', err.message);
    res.status(500).json({ error: 'Failed to create hall.' });
  }
});

// PATCH /api/halls/:id — update any field (admin)
router.patch('/:id', requireAdmin, async (req, res) => {
  const allowed = ['name', 'description', 'capacity', 'price', 'image_url', 'display_order', 'is_active'];
  const fields = [];
  const values = [];
  let i = 1;
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      fields.push(`${key} = $${i++}`);
      values.push(req.body[key]);
    }
  }
  if (!fields.length) return res.status(400).json({ error: 'No fields to update.' });
  values.push(req.params.id);

  try {
    const result = await pool.query(
      `UPDATE halls SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Hall not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('PATCH /api/halls/:id failed:', err.message);
    res.status(500).json({ error: 'Failed to update hall.' });
  }
});

// DELETE /api/halls/:id — remove a hall (admin). Halls with bookings must be deactivated instead.
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM halls WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Hall not found.' });
    res.json({ success: true });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({ error: 'This hall has bookings. Untick "Active" to hide it instead of deleting.' });
    }
    console.error('DELETE /api/halls/:id failed:', err.message);
    res.status(500).json({ error: 'Failed to delete hall.' });
  }
});

module.exports = router;
