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
