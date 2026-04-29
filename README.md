# package-delivery

Express backend for the delivery/map app: auth (register, login, JWT), package CRUD, geocoding (OpenCage), courier/driver location over **Socket.IO**, and SQLite persistence.

## Stack

- **Express** – API server (port 4000 by default)
- **better-sqlite3** – Packages, users, and drivers (`database.sqlite` in project root)
- **JWT** + **bcrypt** – Authentication
- **OpenCage** – Forward geocode (address → coordinates), suggestions, and reverse (coordinates → label) via proxied endpoints
- **CORS** – Configured for the web app origin (`FRONTEND_URL` / defaults)
- **dotenv** – Environment variable management

## API (selection)

### Auth / users

| Method | Path | Auth | Description |
|--------|------|------|---------------|
| POST | `/user/register` | No | Register (`username`, `password`) |
| POST | `/user/login` | No | Login (`username`, `password`) → session / JWT semantics as implemented |
| POST | `/user/logout` | No | Logout |

### Packages

| Method | Path | Auth | Description |
|--------|------|------|---------------|
| GET | `/api/packages` | No | List all packages |
| GET | `/api/packages/:id` | No | Get one package |
| POST | `/api/packages` | JWT | Create package — see below for body |
| GET | `/api/my-packages` | JWT | Packages for current user |
| PUT | `/api/packages/:id` | JWT | Update pickup/destination/price; optional coords — see below |
| DELETE | `/api/packages/:id` | JWT | Delete (owner) |
| PATCH | `/api/packages/:id/status` | JWT / role rules | Status transitions |
| POST | `/api/packages/near-me` | Body lat/lng | Packages sorted by proximity |
| GET | `/api/courier/packages` | JWT | Courier: pending pickups |
| GET | `/api/courier/my-deliveries` | JWT | Courier: accepted deliveries |

**Coordinates on create/update.** Clients may send **`picklat`**, **`picklng`**, **`destlat`**, **`destlng`** (numbers) alongside **`pickupLocation`** and **`destination`**. When a valid lat/lng pair is present for a side, the server stores those coordinates and does not geocode that side from text. Otherwise OpenCage is used when address strings are supplied.

### Locations (JWT)

| Method | Path | Query | Description |
|--------|------|-------|--------------|
| GET | `/api/locations/suggest` | `q` (min ~2 chars) | Address autocomplete (OpenCage) |
| GET | `/api/locations/reverse` | `lat`, `lng` | Reverse-geocode label for a pinned point (or coordinate fallback if OpenCage not configured / fails) |

## Prerequisites

- Node.js (v14+)
- Optional: **`OPENCAGE_API_KEY`** for geocoding and location suggestions/reverse.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file (copy from `.env.example`):

```bash
cp .env.example .env
```

3. Fill in your environment variables in `.env`:

```env
OPENCAGE_API_KEY=your_opencage_api_key
JWT_SECRET=your_jwt_secret
PORT=4000
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

## Run

```bash
npm start
```

API: http://localhost:4000 (`nodemon` reloads `server.js`).

## Data

- **`database.sqlite`** — SQLite file created/migrated via `lib/db.js` / `migrate.js`; holds packages, users, drivers as applicable. Backup this file if you rely on prod data locally.

Legacy **`db.json`** may exist only for migrations or tooling; runtime CRUD targets SQLite unless your deployment says otherwise.

## Environment variables

| Variable | Description |
|----------|-------------|
| `OPENCAGE_API_KEY` | Geocoding and `/api/locations/*` proxies |
| `JWT_SECRET` | Secret for signing JWTs / session |
| `PORT` | Server port (default: 4000) |
| `FRONTEND_URL` | Allowed CORS origin for the SPA |

## Frontend

See **`../car-go-UI/README.md`** — point `REACT_APP_API_URL` at this server.
