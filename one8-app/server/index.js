require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const menuRoutes = require('./routes/menu');
const reservationRoutes = require('./routes/reservations');
const tableRoutes = require('./routes/tables');
const hallRoutes = require('./routes/halls');
const hallBookingRoutes = require('./routes/hallBookings');
const bookingRoutes = require('./routes/bookings');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/menu', menuRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/halls', hallRoutes);
app.use('/api/hall-bookings', hallBookingRoutes);
app.use('/api/bookings', bookingRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Fallback 404 for unknown API routes
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`ONE8 server running at http://localhost:${PORT}`);
});
