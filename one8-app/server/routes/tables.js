const router = require('express').Router();
const pool = require('../db');

function requireAdmin(req, res, next) {
  const key = req.header('x-admin-key');
  if (!key || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  next();
}

// GET /api/tables — list active tables (public, used to populate the reservation form)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, table_number, capacity, location
       FROM restaurant_tables
       WHERE is_active = TRUE
       ORDER BY table_number ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/tables failed:', err.message);
    res.status(500).json({ error: 'Failed to fetch tables.' });
  }
});

// GET /api/tables/all — list every table including inactive ones (admin only)
router.get('/all', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM restaurant_tables ORDER BY table_number ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/tables/all failed:', err.message);
    res.status(500).json({ error: 'Failed to fetch tables.' });
  }
});

// POST /api/tables — add a new table (admin only)
router.post('/', requireAdmin, async (req, res) => {
  const { table_number, capacity, location } = req.body;
  if (!table_number || !capacity) {
    return res.status(400).json({ error: 'table_number and capacity are required.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO restaurant_tables (table_number, capacity, location)
       VALUES ($1, $2, $3) RETURNING *`,
      [table_number, capacity, location || 'Main Hall']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: `Table ${table_number} already exists.` });
    }
    console.error('POST /api/tables failed:', err.message);
    res.status(500).json({ error: 'Failed to create table.' });
  }
});

// PATCH /api/tables/:id — update capacity/location/active status (admin only)
router.patch('/:id', requireAdmin, async (req, res) => {
  const { table_number, capacity, location, is_active } = req.body;
  const fields = [];
  const values = [];
  let i = 1;

  if (table_number !== undefined) { fields.push(`table_number = $${i++}`); values.push(table_number); }
  if (capacity !== undefined) { fields.push(`capacity = $${i++}`); values.push(capacity); }
  if (location !== undefined) { fields.push(`location = $${i++}`); values.push(location); }
  if (is_active !== undefined) { fields.push(`is_active = $${i++}`); values.push(is_active); }

  if (!fields.length) {
    return res.status(400).json({ error: 'No fields to update.' });
  }

  values.push(req.params.id);

  try {
    const result = await pool.query(
      `UPDATE restaurant_tables SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Table not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('PATCH /api/tables/:id failed:', err.message);
    res.status(500).json({ error: 'Failed to update table.' });
  }
});

// DELETE /api/tables/:id — remove a table (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM restaurant_tables WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Table not found.' });
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/tables/:id failed:', err.message);
    res.status(500).json({ error: 'Failed to delete table.' });
  }
});

module.exports = router;
