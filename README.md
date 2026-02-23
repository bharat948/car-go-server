# package-delivery

Express backend for the delivery/map app: auth (register, login, JWT), package CRUD, and geocoding (OpenCage). Uses a single file-based `db.json` as the data store — no external database or json-server required.

## Stack

- **Express** – API server (port 4000 by default)
- **JWT** + **bcrypt** – Authentication
- **OpenCage** – Geocoding for pickup/destination coordinates
- **CORS** – Allows `localhost:3000` and `localhost:3001`
- **dotenv** – Environment variable management

## API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/user/register` | No | Register (body: `username`, `password`) |
| POST | `/user/login` | No | Login (body: `username`, `password`) |
| POST | `/user/logout` | No | Logout |
| GET | `/api/packages` | No | List all packages |
| POST | `/api/packages` | No | Create package (body: pickup, destination, etc.) |
| GET | `/api/my-packages` | JWT | Packages for current user |
| PUT | `/api/packages/:id` | JWT | Update package |
| POST | `/api/packages/near-me` | No | Packages near a lat/lng |

## Prerequisites

- Node.js (v14+)

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

```
OPENCAGE_API_KEY=your_opencage_api_key
JWT_SECRET=your_jwt_secret
PORT=4000
```

## Run

```bash
npm start
```

API will be available at http://localhost:4000

## Data

- **db.json** – Holds `packages` and `users` arrays. All CRUD operations read from and write to this single file.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENCAGE_API_KEY` | API key for OpenCage geocoding |
| `JWT_SECRET` | Secret used for signing JWT tokens and session |
| `PORT` | Port for the Express server (default: 4000) |

> **Optional (dev only):** To browse or mock-test `db.json` via REST, you can run `npx json-server db.json --port 5000` in another terminal. The Express app does not use it; all data goes through `lib/db.js` and `db.json` only.
