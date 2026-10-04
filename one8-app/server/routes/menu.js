const router = require('express').Router();
const pool = require('../db');

function requireAdmin(req, res, next) {
  const key = req.header('x-admin-key');
  if (!key || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  next();
}

// GET /api/menu — list available menu items (public)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, description, price, image_url, category
       FROM menu_items
       WHERE is_available = TRUE
       ORDER BY display_order ASC, id ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/menu failed:', err.message);
    res.status(500).json({ error: 'Failed to fetch menu.' });
  }
});

// GET /api/menu/all — list every item including unavailable ones (admin only)
router.get('/all', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM menu_items ORDER BY display_order ASC, id ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/menu/all failed:', err.message);
    res.status(500).json({ error: 'Failed to fetch menu.' });
  }
});

// POST /api/menu — add a new dish (admin only)
router.post('/', requireAdmin, async (req, res) => {
  const { name, description, price, image_url, category, display_order } = req.body;
  if (!name || price === undefined) {
    return res.status(400).json({ error: 'name and price are required.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO menu_items (name, description, price, image_url, category, display_order)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, description || null, price, image_url || null, category || 'main', display_order || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /api/menu failed:', err.message);
    res.status(500).json({ error: 'Failed to create menu item.' });
  }
});

// PATCH /api/menu/:id — update any field, most importantly price (admin only)
router.patch('/:id', requireAdmin, async (req, res) => {
  const { name, description, price, image_url, category, display_order, is_available } = req.body;
  const fields = [];
  const values = [];
  let i = 1;

  if (name !== undefined) { fields.push(`name = $${i++}`); values.push(name); }
  if (description !== undefined) { fields.push(`description = $${i++}`); values.push(description); }
  if (price !== undefined) {
    if (Number.isNaN(Number(price)) || Number(price) < 0) {
      return res.status(400).json({ error: 'price must be a non-negative number.' });
    }
    fields.push(`price = $${i++}`); values.push(price);
  }
  if (image_url !== undefined) { fields.push(`image_url = $${i++}`); values.push(image_url); }
  if (category !== undefined) { fields.push(`category = $${i++}`); values.push(category); }
  if (display_order !== undefined) { fields.push(`display_order = $${i++}`); values.push(display_order); }
  if (is_available !== undefined) { fields.push(`is_available = $${i++}`); values.push(is_available); }

  if (!fields.length) {
    return res.status(400).json({ error: 'No fields to update.' });
  }

  values.push(req.params.id);

  try {
    const result = await pool.query(
      `UPDATE menu_items SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Menu item not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('PATCH /api/menu/:id failed:', err.message);
    res.status(500).json({ error: 'Failed to update menu item.' });
  }
});

// DELETE /api/menu/:id — remove a dish (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM menu_items WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Menu item not found.' });
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/menu/:id failed:', err.message);
    res.status(500).json({ error: 'Failed to delete menu item.' });
  }
});

module.exports = router;
