# ONE8 — with backend

The ONE8 site has a real backend: an Express API backed by PostgreSQL
(hosted on [Neon](https://neon.tech)). It covers:

- **Menu & prices** — dishes live in the `menu_items` table, loaded via
  `GET /api/menu`. Admins can change prices (or anything else about a dish)
  straight from the database using the admin panel or the API — no code
  changes needed.
- **Table booking** — `restaurant_tables` holds the restaurant's physical
  tables (number, capacity, location). The reservation form lets a guest
  optionally pick a preferred table; admins can (re)assign a table and
  confirm/cancel bookings from the admin panel.
- **Reservations** — booking submissions go to `POST /api/reservations`,
  validated and saved to the `reservations` table.

## ⚠️ About the "CORS" error you saw

```
Access to fetch at 'file:///C:/api/menu' from origin 'null' has been
blocked by CORS policy...
```

That happened because the page was opened by double-clicking `index.html`
(a `file://` URL). Browsers block **all** `fetch()` calls from `file://`
pages to any server — this isn't something the API's CORS headers can
override, because there's no origin to authorize.

**Fix: don't open the HTML file directly. Run the server and open it
through `http://localhost:3000` instead** (steps below). Once the page is
served by Express, the frontend and the API share the same origin and
`fetch('/api/menu')` works normally. As a safety net, `script.js` now
detects `file://` and shows a banner on the reservation form telling you
to run the server if you forget.

## 1. Create a free Neon database

1. Go to https://neon.tech and sign up (free tier is enough).
2. Create a new project.
3. Copy the **connection string** from the dashboard (Connection Details).

## 2. Configure environment variables

A `.env` file is already included with the credentials you provided:

```properties
DATABASE_URL=postgresql://neondb_owner:...@ep-quiet-dream-azbspuh5-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
PORT=3000
ADMIN_KEY=change-this-to-a-long-random-secret
```

**Two things worth doing before you deploy or share this project:**
- Change `ADMIN_KEY` to your own long random string — it's the password for
  the admin panel and admin API routes.
- Since the Neon password above was shared in plain text, consider
  resetting it from the Neon dashboard (Settings → Reset password) and
  updating `DATABASE_URL` here, just to be safe.

`.env` is already listed in `.gitignore`, so it won't get committed if you
push this to GitHub.

## 3. Install dependencies

```bash
npm install
```

## 4. Create the tables and seed starting data

```bash
npm run migrate   # creates menu_items, restaurant_tables, reservations
npm run seed        # inserts the 6 starting dishes + 8 tables
```

`npm run migrate` is safe to re-run (`CREATE TABLE IF NOT EXISTS`).
`npm run seed` only inserts data into a table if it's currently empty.

## 5. Run the server

```bash
npm start          # production
# or
npm run dev         # auto-restarts on file changes (needs devDependency nodemon)
```

Open **http://localhost:3000** — do not open `public/index.html` directly.

## Admin panel

Go to **http://localhost:3000/admin.html**, enter your `ADMIN_KEY`, and you
can:
- Edit any dish's price inline (saves immediately on blur/change) or delete it
- Toggle a dish's availability on/off without deleting it
- Add new dishes
- View reservations, assign/change a table, and set status (pending / confirmed / cancelled)
- Add, edit, or deactivate tables

The key is kept in `sessionStorage` only (cleared when the tab closes) and
sent as the `x-admin-key` header on every admin request — it's never
written to the database or logged.

## API reference

| Method | Route                    | Auth        | Purpose                                  |
|--------|---------------------------|-------------|--------------------------------------------|
| GET    | `/api/menu`               | public      | List available menu items                  |
| GET    | `/api/menu/all`            | admin key   | List all menu items, including hidden ones   |
| POST   | `/api/menu`                | admin key   | Add a new dish                              |
| PATCH  | `/api/menu/:id`            | admin key   | Update a dish — **including price**           |
| DELETE | `/api/menu/:id`            | admin key   | Remove a dish                               |
| GET    | `/api/tables`              | public      | List active tables (for the booking form)     |
| GET    | `/api/tables/all`           | admin key   | List all tables, including inactive ones      |
| POST   | `/api/tables`               | admin key   | Add a table                                 |
| PATCH  | `/api/tables/:id`            | admin key   | Update capacity / location / active status     |
| DELETE | `/api/tables/:id`            | admin key   | Remove a table                              |
| POST   | `/api/reservations`          | public      | Create a table booking (rate-limited)          |
| GET    | `/api/reservations`          | admin key   | List all reservations with table details        |
| PATCH  | `/api/reservations/:id`       | admin key   | Update status and/or assign a table              |
| GET    | `/api/health`                | public      | Health check                                |

### Admin auth

Send your `ADMIN_KEY` as a header on admin requests:

```bash
curl -H "x-admin-key: your-secret-here" http://localhost:3000/api/reservations
```

### Changing a price directly via the API

```bash
curl -X PATCH http://localhost:3000/api/menu/1 \
  -H "Content-Type: application/json" \
  -H "x-admin-key: your-secret-here" \
  -d '{"price": 64.50}'
```

### Reservation / table-booking payload

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "9876543210",
  "date": "2026-08-20",
  "time": "19:30",
  "guests": 4,
  "table_id": 3,
  "message": "Window table if possible"
}
```
`name`, `email`, and `date` are required; `table_id` is optional (leave it
out for "any available table"). Submissions are rate-limited to 10 per 15
minutes per IP.

## Project structure

```
one8-app/
├── public/
│   ├── index.html          # main site (served — don't open directly)
│   ├── styles.css
│   ├── script.js             # live menu + table list + reservation submission
│   ├── admin.html             # admin panel (prices, reservations, tables)
│   └── admin.js
├── server/
│   ├── index.js               # Express app entry point
│   ├── db.js                    # Neon/Postgres connection pool
│   ├── schema.sql                # table definitions
│   ├── migrate.js                 # applies schema.sql
│   ├── seed.js                     # inserts starting menu + tables
│   └── routes/
│       ├── menu.js
│       ├── reservations.js
│       └── tables.js
├── .env                # already filled in with your Neon credentials
├── .env.example
├── package.json
└── README.md
```

## Deploying

Any Node host works (Render, Railway, Fly.io, a VPS, etc.) — set the same
environment variables there and run `npm run migrate` once against the
production database before starting the app. Express serves both the API
and the static frontend, so there's nothing else to deploy separately.
