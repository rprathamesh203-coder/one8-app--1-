-- ONE8 database schema (PostgreSQL / Neon)

CREATE TABLE IF NOT EXISTS menu_items (
    id             SERIAL PRIMARY KEY,
    name           VARCHAR(150) NOT NULL,
    description    TEXT,
    price          NUMERIC(10, 2) NOT NULL,
    image_url      TEXT,
    category       VARCHAR(50) DEFAULT 'main',
    display_order  INTEGER DEFAULT 0,
    is_available   BOOLEAN DEFAULT TRUE,
    created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS restaurant_tables (
    id             SERIAL PRIMARY KEY,
    table_number   VARCHAR(10) UNIQUE NOT NULL,
    capacity       INTEGER NOT NULL DEFAULT 2,
    location       VARCHAR(50) DEFAULT 'Main Hall', -- e.g. Main Hall, Window, Patio, Bar
    is_active      BOOLEAN DEFAULT TRUE,
    created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reservations (
    id                SERIAL PRIMARY KEY,
    name              VARCHAR(150) NOT NULL,
    email             VARCHAR(150) NOT NULL,
    phone             VARCHAR(30),
    reservation_date  DATE NOT NULL,
    reservation_time  TIME,
    guests            INTEGER DEFAULT 2,
    table_id          INTEGER REFERENCES restaurant_tables(id) ON DELETE SET NULL,
    message           TEXT,
    status            VARCHAR(20) DEFAULT 'pending', -- pending | confirmed | cancelled
    created_at        TIMESTAMPTZ DEFAULT now()
);

-- Safe to run against a database created before restaurant_tables/table_id existed
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS table_id INTEGER REFERENCES restaurant_tables(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations (reservation_date);
CREATE INDEX IF NOT EXISTS idx_reservations_table ON reservations (table_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items (category);

-- ---------------------------------------------------------------
-- Halls / banquets + booking references + cancellation
-- ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS halls (
    id             SERIAL PRIMARY KEY,
    name           VARCHAR(150) NOT NULL,
    description    TEXT,
    capacity       INTEGER NOT NULL DEFAULT 50,
    price          NUMERIC(10, 2) NOT NULL DEFAULT 0,   -- price per booking (per event)
    image_url      TEXT,
    display_order  INTEGER DEFAULT 0,
    is_active      BOOLEAN DEFAULT TRUE,
    created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hall_bookings (
    id             SERIAL PRIMARY KEY,
    reference      VARCHAR(12) UNIQUE NOT NULL,
    hall_id        INTEGER NOT NULL REFERENCES halls(id) ON DELETE RESTRICT,
    name           VARCHAR(150) NOT NULL,
    email          VARCHAR(150) NOT NULL,
    phone          VARCHAR(30) NOT NULL,
    event_type     VARCHAR(50) DEFAULT 'Other',
    event_date     DATE NOT NULL,
    start_time     TIME NOT NULL,
    end_time       TIME NOT NULL,
    guests         INTEGER NOT NULL,
    message        TEXT,
    status         VARCHAR(20) DEFAULT 'pending', -- pending | confirmed | cancelled
    cancelled_at   TIMESTAMPTZ,
    created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hall_bookings_lookup ON hall_bookings (hall_id, event_date);

-- Table reservations get a public reference code + cancellation timestamp
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS reference VARCHAR(12);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- Backfill references for reservations made before this change
UPDATE reservations
   SET reference = 'R-' || upper(substr(md5(id::text || random()::text), 1, 6))
 WHERE reference IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_reference ON reservations (reference);
