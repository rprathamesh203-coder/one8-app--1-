// Guest-facing "manage my booking" endpoints: look up a booking by reference + email, and cancel it.
const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const pool = require('../db');
const { TODAY_SQL } = require('../helpers');

// Reference + email is the "password" here, so throttle guessing attempts.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' },
});

// Finds a booking only when reference AND email both match. Never returns email/phone.
async function findBooking(reference, email) {
  const ref = String(reference || '').trim().toUpperCase();
  const mail = String(email || '').trim().toLowerCase();
  if (!ref || !mail) return null;

  if (ref.startsWith('R-')) {
    const r = await pool.query(
      `SELECT r.id, r.reference, r.status, r.guests, r.name,
              to_char(r.reservation_date, 'YYYY-MM-DD') AS date,
              to_char(r.reservation_time, 'HH24:MI') AS start_time,
              NULL AS end_time,
              CASE WHEN t.id IS NULL THEN NULL ELSE 'Table ' || t.table_number || ' (' || t.location || ')' END AS place,
              (r.reservation_date < ${TODAY_SQL}) AS is_past
       FROM reservations r LEFT JOIN restaurant_tables t ON t.id = r.table_id
       WHERE r.reference = $1 AND lower(r.email) = $2`,
      [ref, mail]
    );
    return r.rows[0] ? { type: 'table', table: 'reservations', ...r.rows[0] } : null;
  }
  if (ref.startsWith('H-')) {
    const r = await pool.query(
      `SELECT b.id, b.reference, b.status, b.guests, b.name, b.event_type,
              to_char(b.event_date, 'YYYY-MM-DD') AS date,
              to_char(b.start_time, 'HH24:MI') AS start_time,
              to_char(b.end_time, 'HH24:MI') AS end_time,
              h.name AS place,
              (b.event_date < ${TODAY_SQL}) AS is_past
       FROM hall_bookings b JOIN halls h ON h.id = b.hall_id
       WHERE b.reference = $1 AND lower(b.email) = $2`,
      [ref, mail]
    );
    return r.rows[0] ? { type: 'hall', table: 'hall_bookings', ...r.rows[0] } : null;
  }
  return null;
}

function publicView(b) {
  const { table, id, ...rest } = b;
  return rest;
}

// POST /api/bookings/lookup { reference, email }
router.post('/lookup', limiter, async (req, res) => {
  try {
    const booking = await findBooking(req.body.reference, req.body.email);
    if (!booking) return res.status(404).json({ error: 'No booking found with that reference and email.' });
    res.json(publicView(booking));
  } catch (err) {
    console.error('POST /api/bookings/lookup failed:', err.message);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// POST /api/bookings/cancel { reference, email }
router.post('/cancel', limiter, async (req, res) => {
  try {
    const booking = await findBooking(req.body.reference, req.body.email);
    if (!booking) return res.status(404).json({ error: 'No booking found with that reference and email.' });
    if (booking.status === 'cancelled') {
      return res.status(409).json({ error: 'This booking is already cancelled.' });
    }
    if (booking.is_past) {
      return res.status(400).json({ error: 'This booking date has passed and can no longer be cancelled.' });
    }
    // booking.table comes from a fixed whitelist above, never from user input
    await pool.query(
      `UPDATE ${booking.table} SET status = 'cancelled', cancelled_at = now() WHERE id = $1`,
      [booking.id]
    );
    res.json({ success: true, booking: publicView({ ...booking, status: 'cancelled' }) });
  } catch (err) {
    console.error('POST /api/bookings/cancel failed:', err.message);
    res.status(500).json({ error: 'Failed to cancel booking. Please try again.' });
  }
});

module.exports = router;
