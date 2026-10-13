const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const pool = require('../db');
const { requireAdmin, isValidEmail, generateReference, TODAY_SQL } = require('../helpers');

const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many booking attempts. Please try again later.' },
});

const EVENT_TYPES = ['Wedding', 'Reception', 'Birthday', 'Anniversary', 'Corporate Event', 'Party', 'Other'];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// POST /api/hall-bookings — book a hall / banquet (public)
router.post('/', bookingLimiter, async (req, res) => {
  const { hall_id, name, email, phone, event_type, date, start_time, end_time, guests, message } = req.body;

  if (!hall_id || !name || !email || !phone || !date || !start_time || !end_time || !guests) {
    return res.status(400).json({ error: 'Hall, name, email, phone, date, start/end time and guests are required.' });
  }
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(date).getTime())) {
    return res.status(400).json({ error: 'Please enter a valid date.' });
  }
  if (!TIME_RE.test(start_time) || !TIME_RE.test(end_time)) {
    return res.status(400).json({ error: 'Please enter valid start and end times.' });
  }
  if (end_time <= start_time) {
    return res.status(400).json({ error: 'End time must be after the start time.' });
  }
  const guestCount = parseInt(guests, 10);
  if (Number.isNaN(guestCount) || guestCount < 1) {
    return res.status(400).json({ error: 'Please enter a valid number of guests.' });
  }
  const eventType = EVENT_TYPES.includes(event_type) ? event_type : 'Other';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Serialise bookings per hall so two people can't grab the same slot at once
    await client.query('SELECT pg_advisory_xact_lock($1)', [Number(hall_id) || 0]);

    const hall = await client.query(
      'SELECT id, name, capacity, price FROM halls WHERE id = $1 AND is_active = TRUE',
      [hall_id]
    );
    if (!hall.rows.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Selected hall is not available.' });
    }
    if (guestCount > hall.rows[0].capacity) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `${hall.rows[0].name} holds up to ${hall.rows[0].capacity} guests.` });
    }

    const past = await client.query(`SELECT $1::date < ${TODAY_SQL} AS is_past`, [date]);
    if (past.rows[0].is_past) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Please choose a date that is today or later.' });
    }

    const clash = await client.query(
      `SELECT 1 FROM hall_bookings
       WHERE hall_id = $1 AND event_date = $2 AND status <> 'cancelled'
         AND start_time < $4::time AND end_time > $3::time
       LIMIT 1`,
      [hall_id, date, start_time, end_time]
    );
    if (clash.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'That hall is already booked for part of this time. Please pick another time or hall.' });
    }

    let booking;
    for (let attempt = 0; attempt < 5 && !booking; attempt++) {
      await client.query('SAVEPOINT ref_insert');
      try {
        const r = await client.query(
          `INSERT INTO hall_bookings
             (reference, hall_id, name, email, phone, event_type, event_date, start_time, end_time, guests, message)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           RETURNING reference, status, guests, event_type,
                     to_char(event_date, 'YYYY-MM-DD') AS event_date,
                     to_char(start_time, 'HH24:MI') AS start_time,
                     to_char(end_time, 'HH24:MI') AS end_time`,
          [generateReference('H'), hall_id, name, email, phone, eventType, date, start_time, end_time, guestCount, message || null]
        );
        booking = r.rows[0];
      } catch (e) {
        if (e.code !== '23505') throw e; // retry only on reference collision
        await client.query('ROLLBACK TO SAVEPOINT ref_insert');
      }
    }
    if (!booking) throw new Error('Could not generate a unique reference.');

    await client.query('COMMIT');
    res.status(201).json({ success: true, booking: { ...booking, hall_name: hall.rows[0].name } });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('POST /api/hall-bookings failed:', err.message);
    res.status(500).json({ error: 'Failed to create booking. Please try again.' });
  } finally {
    client.release();
  }
});

// GET /api/hall-bookings — list all bookings (admin)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, h.name AS hall_name,
              to_char(b.event_date, 'YYYY-MM-DD') AS event_date,
              to_char(b.start_time, 'HH24:MI') AS start_time,
              to_char(b.end_time, 'HH24:MI') AS end_time
       FROM hall_bookings b
       JOIN halls h ON h.id = b.hall_id
       ORDER BY b.event_date DESC, b.start_time DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/hall-bookings failed:', err.message);
    res.status(500).json({ error: 'Failed to fetch hall bookings.' });
  }
});

// PATCH /api/hall-bookings/:id — change status (admin)
router.patch('/:id', requireAdmin, async (req, res) => {
  const { status } = req.body;
  if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'status must be pending, confirmed, or cancelled.' });
  }
  try {
    // Re-activating a cancelled booking must not collide with someone who took the slot meanwhile
    if (status !== 'cancelled') {
      const clash = await pool.query(
        `SELECT 1 FROM hall_bookings b
         JOIN hall_bookings me ON me.id = $1
         WHERE b.id <> me.id AND b.hall_id = me.hall_id AND b.event_date = me.event_date
           AND b.status <> 'cancelled' AND b.start_time < me.end_time AND b.end_time > me.start_time
         LIMIT 1`,
        [req.params.id]
      );
      if (clash.rows.length) {
        return res.status(409).json({ error: 'Another active booking now overlaps this slot.' });
      }
    }
    const result = await pool.query(
      `UPDATE hall_bookings
          SET status = $1,
              cancelled_at = CASE WHEN $1 = 'cancelled' THEN now() ELSE NULL END
        WHERE id = $2 RETURNING id, status`,
      [status, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Booking not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('PATCH /api/hall-bookings/:id failed:', err.message);
    res.status(500).json({ error: 'Failed to update booking.' });
  }
});

module.exports = router;
