# Architecture and Setup

## Application Structure

The project has two independently installed Node.js applications:

- `backend/` runs an Express API. `server.js` loads environment variables, configures CORS and cookies, mounts routers, initializes the database, and then starts listening.
- `frontend/` is a React single-page application built with Vite. `src/App.jsx` defines the login, drive, shared-link, and trash routes. `src/config/api.js` configures the Axios client and credentialed requests.
- `docs/` contains this guide and the [API reference](API_REFERENCE.md).

## Backend Flow

Authentication uses signed JWTs stored in HTTP-only cookies. Protected routes verify the cookie before controllers read or modify user data. CORS origins are controlled by `ORIGINS` and requests include credentials.

The database is PostgreSQL hosted by Neon. `backend/config/db.js` initializes the `users`, `folders`, `files`, and `share_links` tables and their indexes during startup. The API does not begin listening until initialization succeeds.

Uploaded file bytes are written to local disk. PostgreSQL stores file metadata and a storage-relative key; signed URLs allow previews and downloads. Configure a persistent `UPLOAD_DIR` for deployments because local or temporary disks may not survive a host restart.

## Environment Configuration

Create `backend/.env` locally. Do not commit secrets. Example keys:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d
ORIGINS=http://localhost:5173,http://127.0.0.1:5173
PORT=3000
BACKEND_URL=http://localhost:3000
UPLOAD_DIR=uploads
MAX_FILE_SIZE_MB=100
```

`DATABASE_URL` and `JWT_SECRET` are required for normal operation. `ORIGINS` is a comma-separated list of allowed frontend origins. `BACKEND_URL` is optional; when omitted, signed file links use the request host. `UPLOAD_DIR` defaults to `uploads`, and `MAX_FILE_SIZE_MB` defaults to `100`.

For the frontend, create `frontend/.env` when the API is not at the default same-origin address:

```env
VITE_BASE_URL=http://localhost:3000
```

The frontend Axios client always sends cookies with API requests.

## Run and Validate

Run the backend from its directory:

```bash
cd backend
npm install
npm run server
```

The `server`, `dev`, and `start` scripts set `NODE_OPTIONS=--network-family-autoselection-attempt-timeout=5000` so Node can move to another resolved address family when a connection attempt stalls.

Run the frontend in a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

Useful frontend checks:

```bash
npm run lint
npm run build
```

The backend package currently has no test or lint script. Its modules can be syntax-checked with `node --check`.

## Database Connectivity

A `fetch failed` or `ETIMEDOUT` during database initialization means the API could not reach the configured Neon endpoint. Confirm the Neon project and endpoint are active and reachable from the current network. The Node network-family option helps when one resolved address family is unreachable; it cannot bypass firewall rules, an inactive endpoint, or an incorrect connection string.
