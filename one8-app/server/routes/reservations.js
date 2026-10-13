const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const pool = require('../db');
const { generateReference } = require('../helpers');

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

function requireAdmin(req, res, next) {
  const key = req.header('x-admin-key');
  if (!key || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  next();
}

// Limit reservation submissions to reduce spam/abuse
const reservationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many reservation attempts. Please try again later.' },
});

// POST /api/reservations — create a reservation / table booking (public)
router.post('/', reservationLimiter, async (req, res) => {
  const { name, email, phone, date, time, guests, table_id, message } = req.body;

  if (!name || !email || !date) {
    return res.status(400).json({ error: 'Name, email, and date are required.' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    return res.status(400).json({ error: 'Please enter a valid date.' });
  }
  const guestCount = guests ? parseInt(guests, 10) : 2;
  if (Number.isNaN(guestCount) || guestCount < 1 || guestCount > 50) {
    return res.status(400).json({ error: 'Guests must be a number between 1 and 50.' });
  }

  let tableId = null;
  if (table_id) {
    const tableCheck = await pool.query(
      'SELECT id, capacity FROM restaurant_tables WHERE id = $1 AND is_active = TRUE',
      [table_id]
    );
    if (!tableCheck.rows.length) {
      return res.status(400).json({ error: 'Selected table is not available.' });
    }
    tableId = tableCheck.rows[0].id;
  }

  try {
    let reservation;
    for (let attempt = 0; attempt < 5 && !reservation; attempt++) {
      try {
        const result = await pool.query(
          `INSERT INTO reservations (reference, name, email, phone, reservation_date, reservation_time, guests, table_id, message)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING reference, name, email, to_char(reservation_date, 'YYYY-MM-DD') AS reservation_date,
                     reservation_time, guests, table_id, status`,
          [generateReference('R'), name, email, phone || null, date, time || null, guestCount, tableId, message || null]
        );
        reservation = result.rows[0];
      } catch (e) {
        if (e.code !== '23505') throw e; // retry only on reference collision
      }
    }
    if (!reservation) throw new Error('Could not generate a unique reference.');
    res.status(201).json({ success: true, reservation });
  } catch (err) {
    console.error('POST /api/reservations failed:', err.message);
    res.status(500).json({ error: 'Failed to create reservation. Please try again.' });
  }
});

// GET /api/reservations — list reservations, with table details (admin only)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, to_char(r.reservation_date, 'YYYY-MM-DD') AS reservation_date, t.table_number, t.location AS table_location
       FROM reservations r
       LEFT JOIN restaurant_tables t ON t.id = r.table_id
       ORDER BY r.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/reservations failed:', err.message);
    res.status(500).json({ error: 'Failed to fetch reservations.' });
  }
});

// PATCH /api/reservations/:id — update status and/or assign a table (admin only)
router.patch('/:id', requireAdmin, async (req, res) => {
  const { status, table_id } = req.body;
  const fields = [];
  const values = [];
  let i = 1;

  if (status !== undefined) {
    if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'status must be pending, confirmed, or cancelled.' });
    }
    fields.push(`status = $${i++}`);
    values.push(status);
    fields.push(status === 'cancelled' ? 'cancelled_at = now()' : 'cancelled_at = NULL');
  }

  if (table_id !== undefined) {
    fields.push(`table_id = $${i++}`);
    values.push(table_id || null);
  }

  if (!fields.length) {
    return res.status(400).json({ error: 'No fields to update.' });
  }

  values.push(req.params.id);

  try {
    const result = await pool.query(
      `UPDATE reservations SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reservation not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('PATCH /api/reservations/:id failed:', err.message);
    res.status(500).json({ error: 'Failed to update reservation.' });
  }
});

module.exports = router;
