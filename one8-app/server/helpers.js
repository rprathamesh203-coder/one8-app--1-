const crypto = require('crypto');

function requireAdmin(req, res, next) {
  const key = req.header('x-admin-key');
  if (!key || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  next();
}

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// No 0/O/1/I so references are easy to read out over the phone
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// prefix: 'R' for table reservations, 'H' for hall bookings  ->  e.g. "H-7K3Q9X"
function generateReference(prefix) {
  const bytes = crypto.randomBytes(6);
  let code = '';
  for (let i = 0; i < 6; i++) code += ALPHABET[bytes[i] % ALPHABET.length];
  return `${prefix}-${code}`;
}

// "Today" in the restaurant's timezone (the site is for a Mumbai restaurant),
// so the "can't book/cancel in the past" checks don't flip at the wrong hour.
const TODAY_SQL = `(now() AT TIME ZONE 'Asia/Kolkata')::date`;

module.exports = { requireAdmin, isValidEmail, generateReference, TODAY_SQL };
