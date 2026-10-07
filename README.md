# GoogleCloudHub

GoogleCloudHub is a cloud-drive style application for uploading and organizing files, managing folders, sharing links, and restoring deleted items. It consists of an Express API and a React/Vite web client.

## Quick Start

Requirements: Node.js 20.19 or newer and npm. A reachable Neon PostgreSQL database is required by the backend.

1. Configure the backend environment using [the project guide](docs/ARCHITECTURE.md#environment-configuration).
2. In one terminal, start the API:

   ```bash
   cd backend
   npm install
   npm run server
   ```

3. In another terminal, start the web client:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. Open the local URL printed by Vite, usually `http://localhost:5173`.

The backend runs on port `3000` by default. Its npm start scripts apply Node's network-family autoselection timeout automatically.

## Project Layout

- `backend/` - Express API, database initialization, authentication, drive operations, and local file storage.
- `frontend/` - React application and Vite configuration.
- `docs/` - setup, architecture, configuration, and API documentation.

## Documentation

- [Architecture and setup](docs/ARCHITECTURE.md)
- [API reference](docs/API_REFERENCE.md)
